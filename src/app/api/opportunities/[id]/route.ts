import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const opportunity = await prisma.jobOpportunity.findUnique({
      where: { id }
    })

    if (!opportunity || opportunity.userId !== session.user.id) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, opportunity })

  } catch (error) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch opportunity'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const job = await prisma.jobOpportunity.findUnique({ where: { id } })
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const job = await prisma.jobOpportunity.findUnique({ where: { id } })
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.isRead !== undefined) data.isRead = body.isRead
    if (body.notes !== undefined) data.notes = body.notes
    if (body.description !== undefined) data.description = body.description
    if (body.requirements !== undefined) data.requirements = body.requirements

    await prisma.jobOpportunity.update({ where: { id }, data })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update opportunity'
    }, { status: 500 })
  }
}
