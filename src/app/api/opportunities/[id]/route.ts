import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Soft delete by setting isArchived to true
    await prisma.jobOpportunity.update({
      where: { id },
      data: { isArchived: true }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete opportunity'
    }, { status: 500 })
  }
}
