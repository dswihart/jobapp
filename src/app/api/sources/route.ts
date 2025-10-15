import { NextResponse } from 'next/server'
import { getSourceConfigs } from '@/lib/sources'

export async function GET() {
  try {
    const sources = getSourceConfigs()
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}
