import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .order('symbol', { ascending: true })

    if (error) throw error

    return NextResponse.json({ watchlist: data })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}