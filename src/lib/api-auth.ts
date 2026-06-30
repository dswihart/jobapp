import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { timingSafeEqual } from "crypto"

export type AuthenticatedUser = {
  id: string
  email?: string | null
  name?: string | null
}

function getAdminEmailAllowlist(): string[] {
  return [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter((value): value is string => Boolean(value))
    .flatMap(value => value.split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireAuthenticatedUser(): Promise<
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    }
  }
}

export async function requireAdminUser(): Promise<
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult
  }

  const allowlist = getAdminEmailAllowlist()
  const email = authResult.user.email?.toLowerCase() ?? ""
  if (allowlist.length === 0 || !email || !allowlist.includes(email)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return authResult
}

// Fail-CLOSED cron auth. Rejects when CRON_SECRET is unset (never falls back to a
// hardcoded default that ships in source) and compares in constant time.
export function requireCronSecret(request: Request): NextResponse | null {
  const provided = request.headers.get("x-cron-secret") || ""
  const expected = process.env.CRON_SECRET || ""
  if (!expected) {
    console.error("[cron-auth] CRON_SECRET not set — rejecting cron request")
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 })
  }
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
