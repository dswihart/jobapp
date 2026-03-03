import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isAllowedUrl } from "@/lib/url-validation"

const VALID_SOURCE_TYPES = ["rss", "api", "web_scrape"] as const
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_API_KEY_LENGTH = 500
const MAX_SELECTOR_LENGTH = 200
const MAX_KEYWORDS = 50
const MAX_KEYWORD_LENGTH = 100

function validateUrlField(
  url: string | undefined | null,
  fieldName: string
): string | null {
  if (!url) return null
  const result = isAllowedUrl(url)
  if (!result.allowed) {
    return `${fieldName} blocked: ${result.reason}`
  }
  return null
}

function validateKeywords(
  keywords: unknown,
  fieldName: string
): string | null {
  if (keywords === undefined || keywords === null) return null
  if (!Array.isArray(keywords)) {
    return `${fieldName} must be an array`
  }
  if (keywords.length > MAX_KEYWORDS) {
    return `${fieldName} cannot exceed ${MAX_KEYWORDS} items`
  }
  for (const kw of keywords) {
    if (typeof kw !== "string") {
      return `${fieldName} must contain only strings`
    }
    if (kw.length > MAX_KEYWORD_LENGTH) {
      return `${fieldName} items cannot exceed ${MAX_KEYWORD_LENGTH} characters`
    }
  }
  return null
}

function validateStringField(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required = false
): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) return `${fieldName} is required`
    return null
  }
  if (typeof value !== "string") {
    return `${fieldName} must be a string`
  }
  if (value.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters`
  }
  return null
}

// Shared validation for POST and PATCH
function validateSourceFields(fields: Record<string, unknown>): string | null {
  // name
  if ("name" in fields) {
    const err = validateStringField(fields.name, "name", MAX_NAME_LENGTH, true)
    if (err) return err
  }

  // sourceType
  if ("sourceType" in fields) {
    if (
      !VALID_SOURCE_TYPES.includes(
        fields.sourceType as (typeof VALID_SOURCE_TYPES)[number]
      )
    ) {
      return `sourceType must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
    }
  }

  // URL fields
  for (const urlField of ["feedUrl", "scrapeUrl", "apiEndpoint"] as const) {
    if (urlField in fields && fields[urlField]) {
      const err = validateUrlField(fields[urlField] as string, urlField)
      if (err) return err
    }
  }

  // description
  if ("description" in fields) {
    const err = validateStringField(
      fields.description,
      "description",
      MAX_DESCRIPTION_LENGTH
    )
    if (err) return err
  }

  // apiKey
  if ("apiKey" in fields) {
    const err = validateStringField(
      fields.apiKey,
      "apiKey",
      MAX_API_KEY_LENGTH
    )
    if (err) return err
  }

  // CSS selectors
  for (const sel of [
    "scrapeSelector",
    "titleSelector",
    "companySelector",
    "linkSelector",
    "descriptionSelector",
  ] as const) {
    if (sel in fields) {
      const err = validateStringField(fields[sel], sel, MAX_SELECTOR_LENGTH)
      if (err) return err
    }
  }

  // Keywords
  const skErr = validateKeywords(fields.searchKeywords, "searchKeywords")
  if (skErr) return skErr
  const ekErr = validateKeywords(fields.excludeKeywords, "excludeKeywords")
  if (ekErr) return ekErr

  // enabled
  if ("enabled" in fields && fields.enabled !== undefined) {
    if (typeof fields.enabled !== "boolean") {
      return "enabled must be a boolean"
    }
  }

  return null
}

// GET - Fetch user job sources
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sources = await prisma.userJobSource.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "desc" }],
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
    const {
      name,
      description,
      sourceType,
      feedUrl,
      scrapeUrl,
      scrapeSelector,
      titleSelector,
      companySelector,
      linkSelector,
      descriptionSelector,
      apiEndpoint,
      apiKey,
      searchKeywords,
      excludeKeywords,
      enabled,
    } = body

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      )
    }

    if (!sourceType) {
      return NextResponse.json(
        { error: "sourceType is required" },
        { status: 400 }
      )
    }

    // Run shared validation
    const validationError = validateSourceFields(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const newSource = await prisma.userJobSource.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description || null,
        sourceType,
        feedUrl: feedUrl || null,
        scrapeUrl: scrapeUrl || null,
        scrapeSelector: scrapeSelector || null,
        titleSelector: titleSelector || null,
        companySelector: companySelector || null,
        linkSelector: linkSelector || null,
        descriptionSelector: descriptionSelector || null,
        apiEndpoint: apiEndpoint || null,
        apiKey: apiKey || null,
        searchKeywords: Array.isArray(searchKeywords) ? searchKeywords : [],
        excludeKeywords: Array.isArray(excludeKeywords) ? excludeKeywords : [],
        enabled: enabled !== false,
        isBuiltIn: false,
      },
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

// PATCH - Update job source
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateFields } = body

    // Verify ownership
    const source = await prisma.userJobSource.findUnique({
      where: { id },
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Build update data from allowed fields
    const allowedFields = [
      "enabled",
      "name",
      "description",
      "feedUrl",
      "scrapeUrl",
      "scrapeSelector",
      "titleSelector",
      "companySelector",
      "linkSelector",
      "descriptionSelector",
      "apiEndpoint",
      "apiKey",
      "searchKeywords",
      "excludeKeywords",
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field]
      }
    }

    // Validate update fields
    const validationError = validateSourceFields(updateData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const updated = await prisma.userJobSource.update({
      where: { id },
      data: updateData,
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

    // Verify ownership
    const source = await prisma.userJobSource.findUnique({
      where: { id },
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.userJobSource.delete({
      where: { id },
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
