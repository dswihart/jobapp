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
    const response = NextResponse.json({ success: true })

    if (result instanceof Response) {
      result.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          response.headers.append(key, value)
        }
      })
    }

    return response
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
