import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Find the user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already has a chat room
    const existingChatRoom = await prisma.chatRoom.findUnique({
      where: { creatorId: user.id }
    })

    if (existingChatRoom) {
      return NextResponse.json(
        { error: 'User already has a chat room' },
        { status: 409 }
      )
    }

    // Create the chat room and add the creator as an ADMIN member
    const chatRoom = await prisma.chatRoom.create({
      data: {
        creatorId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      },
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
          }
        }
      }
    })

    return NextResponse.json({ chatRoom }, { status: 201 })
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json(
      { error: 'Failed to create chat room' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Find the user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all chat rooms where the user is a member
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
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
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ chatRooms })
  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    )
  }
}
