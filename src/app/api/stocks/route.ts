import { NextRequest, NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker') || 'SPY'
  const range = searchParams.get('range') || '10y'

  try {
    // Get current quote
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await yahooFinance.quote(ticker) as any

    // Get historical data
    const endDate = new Date()
    const startDate = new Date()

    switch (range) {
      case '1m':  startDate.setMonth(startDate.getMonth() - 1); break
      case '6m':  startDate.setMonth(startDate.getMonth() - 6); break
      case '1y':  startDate.setFullYear(startDate.getFullYear() - 1); break
      case '5y':  startDate.setFullYear(startDate.getFullYear() - 5); break
      case '10y': startDate.setFullYear(startDate.getFullYear() - 10); break
      default:    startDate.setFullYear(startDate.getFullYear() - 10)
    }

    const historical = await yahooFinance.historical(ticker, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      interval: range === '1m' ? '1d' : range === '6m' ? '1wk' : ('1mo' as const),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartData = (historical as any[]).map((item: any) => ({
      date: item.date.toISOString().split('T')[0],
      close: Number(item.close?.toFixed(2)),
      volume: item.volume,
    }))

    return NextResponse.json({
      ticker,
      name: quote.longName || quote.shortName || ticker,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange?.toFixed(2),
      changePercent: quote.regularMarketChangePercent?.toFixed(2),
      currency: quote.currency,
      chartData,
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 })
  }
}