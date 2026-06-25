import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

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
