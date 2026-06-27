import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login")
  const isOnRegisterPage = req.nextUrl.pathname.startsWith("/register")
  const isOnAuthApi = req.nextUrl.pathname.startsWith("/api/auth")
  const isOnMobileApi = req.nextUrl.pathname.startsWith("/api/mobile")
  const isOnCronApi = req.nextUrl.pathname.startsWith("/api/cron")
  // Uploaded files (resumes, CVs, cover letters) contain PII and must NOT be
  // served to anonymous visitors. Previously /uploads bypassed auth here (and the
  // matcher excluded dotted paths, so .docx files skipped middleware entirely),
  // leaving them world-readable. Require a valid session; a JSON 401 fits these
  // file requests better than an HTML login redirect.
  if (req.nextUrl.pathname.startsWith("/uploads")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    // Per-user ownership: uploaded files are stored as `${userId}-${uuid}-name`,
    // so a signed-in user may only fetch files whose name begins with their own
    // id. Prevents one authenticated user from reading another user's PII by URL.
    // The trailing "-" stops shorter ids from matching a longer id's files.
    const userId = req.auth?.user?.id
    const fileName = req.nextUrl.pathname.split("/").pop() || ""
    if (!userId || !fileName.startsWith(`${userId}-`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.next()
  }

  // Allow access to auth pages and unauthenticated-by-design APIs.
  if (isOnLoginPage || isOnRegisterPage || isOnAuthApi || isOnMobileApi || isOnCronApi) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  // First entry keeps the original app-route coverage (excludes static assets and
  // any dotted path). Second entry explicitly covers /uploads so PII files — which
  // have extensions like .docx — are intercepted and auth-gated.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\..*).*)",
    "/uploads/:path*",
  ],
}
