import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type SignupBody = {
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string | null
  bio?: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SignupBody>

    const walletAddress = body.walletAddress?.trim()
    const bnsName = body.bnsName?.trim()
    const displayName = body.displayName?.trim()
    const profileImage = body.profileImage ?? null
    const bio = body.bio ?? null

    if (!walletAddress || !bnsName || !displayName) {
      return NextResponse.json(
        { error: 'walletAddress, bnsName and displayName are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.create({
      data: {
        walletAddress,
        bnsName,
        displayName,
        profileImage,
        bio,
      },
    })

    const token = Buffer.from(JSON.stringify({ address: walletAddress, bns: bnsName, iat: Date.now() })).toString('base64url')
    const cookieStore = await cookies()
    cookieStore.set('bp_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json(
      { user },
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this walletAddress or bnsName already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}


