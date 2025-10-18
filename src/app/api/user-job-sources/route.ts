import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Fetch user job sources
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sources = await prisma.userJobSource.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isBuiltIn: "desc" },
        { createdAt: "desc" }
      ]
    })

    return NextResponse.json({ sources })
  } catch (error) {
    console.error("Error fetching sources:", error)
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    )
  }
}

// POST - Create new job source
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, sourceType, feedUrl, scrapeUrl, enabled } = body

    const newSource = await prisma.userJobSource.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        sourceType,
        feedUrl: feedUrl || null,
        scrapeUrl: scrapeUrl || null,
        enabled: enabled !== false,
        isBuiltIn: false
      }
    })

    return NextResponse.json({ source: newSource })
  } catch (error) {
    console.error("Error creating source:", error)
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    )
  }
}

// PATCH - Update job source (enable/disable)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, enabled } = body

    // Verify ownership
    const source = await prisma.userJobSource.findUnique({
      where: { id }
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await prisma.userJobSource.update({
      where: { id },
      data: { enabled }
    })

    return NextResponse.json({ source: updated })
  } catch (error) {
    console.error("Error updating source:", error)
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    )
  }
}

// DELETE - Delete job source
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    // Verify ownership and not built-in
    const source = await prisma.userJobSource.findUnique({
      where: { id }
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (source.isBuiltIn) {
      return NextResponse.json(
        { error: "Cannot delete built-in sources" },
        { status: 403 }
      )
    }

    await prisma.userJobSource.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting source:", error)
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    )
  }
}
