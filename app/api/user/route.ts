import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        walletAddress: true,
        bnsName: true,
        displayName: true,
        profileImage: true,
        bio: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

