import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('run_id')

  if (!runId) {
    return NextResponse.json({ error: 'run_id required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('pipeline_articles')
      .select('*')
      .eq('run_id', runId)
      .order('stage3_score', { ascending: false })
    if (error) throw error
    return NextResponse.json({ articles: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}