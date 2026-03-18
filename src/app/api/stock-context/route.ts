import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache: ticker -> { context, date }
const contextCache: Record<string, { context: string, date: string }> = {}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker') || 'SPY'
  const changePercent = searchParams.get('change') || '0'
  const today = new Date().toISOString().split('T')[0]

  // Return cached context if same day
  if (contextCache[ticker] && contextCache[ticker].date === today) {
    return NextResponse.json({ context: contextCache[ticker].context })
  }

  try {
    // Get latest GNI report
    const { data: reports } = await supabase
      .from('reports')
      .select('title, summary, sentiment, risk_level, location_name, market_impact')
      .order('created_at', { ascending: false })
      .limit(1)

    const report = reports?.[0]
    if (!report) {
      return NextResponse.json({ context: 'No recent GNI report available for context.' })
    }

    // Call Groq
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    if (!GROQ_API_KEY) {
      return NextResponse.json({ context: 'AI context unavailable.', debug: 'GROQ_API_KEY missing in process.env' })
    }

    const prompt = `You are a financial analyst assistant for GNI (Global Nexus Insights).

Latest GNI Intelligence Report:
- Title: ${report.title}
- Summary: ${report.summary}
- Sentiment: ${report.sentiment}
- Risk Level: ${report.risk_level}
- Location: ${report.location_name}
- Market Impact: ${report.market_impact}

The ticker ${ticker} has moved ${changePercent}% in the past 3 days.

In exactly 2 sentences, explain: (1) why ${ticker} moved in this direction based on the geopolitical context above, and (2) what this means for investors watching this instrument. Be specific and connect the geopolitical events to the price movement. Do not use disclaimers or preamble.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      })
    })

    const data = await response.json()
    const context = data.choices?.[0]?.message?.content?.trim() || 'AI context unavailable.'

    // Cache it
    contextCache[ticker] = { context, date: today }

    return NextResponse.json({ context })

  } catch (err) {
    console.error('Stock context error:', err)
    return NextResponse.json({ context: 'AI context temporarily unavailable.' })
  }
}
