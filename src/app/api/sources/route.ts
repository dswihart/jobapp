import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { getSourceConfigs } from '@/lib/sources'

export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  try {
    const sources = getSourceConfigs()
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}
