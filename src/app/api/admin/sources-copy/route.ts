import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/api-auth'

export async function GET() {
  const authResult = await requireAdminUser()
  if (authResult.response) {
    return authResult.response
  }

  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
