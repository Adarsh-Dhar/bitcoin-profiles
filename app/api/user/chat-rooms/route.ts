import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
      // Auto-create user on first access to chat-rooms to smooth UX
      try {
        await prisma.user.create({ data: { walletAddress } })
      } catch {}
      const created = await prisma.user.findUnique({ where: { walletAddress } })
      if (!created) {
        return NextResponse.json({ chatRooms: [] })
      }
    }

    // Get all chat rooms where the user is a member with ADMIN or MEMBER role
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: (user?.id)!,
            role: {
              in: ['ADMIN', 'MEMBER']
            }
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true
          }
        },
        members: {
          where: {
            role: {
              in: ['ADMIN', 'MEMBER']
            }
          },
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true
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
                walletAddress: true
              }
            }
          }
        },
        _count: {
          select: {
            members: {
              where: {
                role: {
                  in: ['ADMIN', 'MEMBER']
                }
              }
            },
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Add user's role in each chat room
    const chatRoomsWithUserRole = chatRooms.map(chatRoom => {
      const userMembership = chatRoom.members.find(member => member.userId === user.id)
      return {
        ...chatRoom,
        userRole: userMembership?.role || 'NON_MEMBER'
      }
    })

    return NextResponse.json({ chatRooms: chatRoomsWithUserRole })
  } catch (error) {
    console.error('Error fetching user chat rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    )
  }
}
