import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return NextResponse.json({ runs: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch pipeline runs' }, { status: 500 })
  }
}