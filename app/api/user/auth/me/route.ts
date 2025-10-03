import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('bp_session')?.value

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Decode the session token
    const sessionData = JSON.parse(Buffer.from(session, 'base64url').toString())
    const walletAddress = sessionData.address

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        walletAddress: true,
        bnsName: true,
        displayName: true,
        profileImage: true,
        bio: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    )
  }
}
