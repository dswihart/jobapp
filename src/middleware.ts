import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
  const isOnRegisterPage = req.nextUrl.pathname.startsWith('/register')
  const isOnAuthApi = req.nextUrl.pathname.startsWith('/api/auth')
  const isOnMobileApi = req.nextUrl.pathname.startsWith('/api/mobile')

  // Allow access to auth pages and APIs
  if (isOnLoginPage || isOnRegisterPage || isOnAuthApi || isOnMobileApi) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
