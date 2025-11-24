import { signIn } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Attempt to sign in
    // redirect: false prevents NextAuth from trying to redirect to a page
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    // Note: signIn usually throws if it fails or redirects if it succeeds.
    // With redirect: false, it might return undefined on success or throw on error.
    
    return NextResponse.json({ success: true })
  } catch (error) {
    // If it is a redirect error (which happens on success sometimes), we consider it success
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return NextResponse.json({ success: true })
    }

    console.error('Mobile login error:', error)
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }
}
