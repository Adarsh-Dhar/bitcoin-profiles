import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Chat room ID is required' },
        { status: 400 }
      )
    }

    // Find the chat room by ID
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            bnsName: true,
            displayName: true,
            profileImage: true,
            bio: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                bnsName: true,
                displayName: true,
                profileImage: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                walletAddress: true,
                bnsName: true,
                displayName: true,
                profileImage: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ chatRoom })
  } catch (error) {
    console.error('Error fetching chat room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat room' },
      { status: 500 }
    )
  }
}
