import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { CONTRACT_ADDRESS, VENDING_NAME, KEYTOKEN_TEMPLATE_NAME } from '@/hooks/stacks'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, description, isPrivate } = await request.json()

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

    // Users can now create multiple chat rooms, so no need to check for existing ones

    // Create the chat room and add the creator as an ADMIN member
    const chatRoom = await prisma.chatRoom.create({
      data: {
        creatorId: user.id,
        name: name || `${user.displayName}'s Chat Room`,
        description: description || null,
        isPrivate: isPrivate || false,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      } as any,
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

    // Register market with Factory contract
    const marketRegistrationData = {
      chatRoomId: chatRoom.id,
      vendingMachine: `${CONTRACT_ADDRESS}.${VENDING_NAME}`,
      tokenContract: `${CONTRACT_ADDRESS}.${KEYTOKEN_TEMPLATE_NAME}`,
      creator: user.walletAddress
    }

    return NextResponse.json({ 
      chatRoom, 
      marketRegistrationData 
    }, { status: 201 })
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
