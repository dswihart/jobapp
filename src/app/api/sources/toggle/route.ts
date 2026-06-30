import { NextResponse } from 'next/server'
import { toggleSource } from '@/lib/sources'
import { requireAdminUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdminUser()
    if (adminCheck.response) return adminCheck.response
    const { name, enabled } = await request.json()

    if (!name || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const success = toggleSource(name, enabled)

    if (success) {
      return NextResponse.json({
        message: `${name} ${enabled ? 'enabled' : 'disabled'} successfully`,
        success: true
      })
    } else {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error toggling source:', error)
    return NextResponse.json({ error: 'Failed to toggle source' }, { status: 500 })
  }
}
