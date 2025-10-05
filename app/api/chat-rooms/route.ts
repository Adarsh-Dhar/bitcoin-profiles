import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            bnsName: true,
            displayName: true,
            profileImage: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                displayName: true,
                bnsName: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ chatRooms })
  } catch (error) {
    console.error('Error fetching all chat rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    )
  }
}


