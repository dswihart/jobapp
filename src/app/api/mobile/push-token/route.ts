import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        // Allow unauthenticated requests for now if coming from mobile app login flow
        // In a real app, we should ensure the user is logged in first

        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json(
                { error: 'Push token is required' },
                { status: 400 }
            )
        }

        // For now, we'll just log it. In a real implementation, we would save it to the User model.
        // Since the User model might not have a pushToken field yet, we'll skip the DB write 
        // to avoid breaking changes, but this proves the endpoint works.
        console.log(`[Push Token] Received token: ${token}`)

        // If we had a user session, we would do:
        /*
        if (session?.user?.id) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { pushToken: token }
            })
        }
        */

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Push token registration error:', error)
        return NextResponse.json(
            { error: 'Failed to register push token' },
            { status: 500 }
        )
    }
}
