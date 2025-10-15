import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.alert.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Alert deleted'
    })
  } catch (error) {
    console.error('Delete alert error:', error)
    return NextResponse.json(
      { error: 'Failed to delete alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
