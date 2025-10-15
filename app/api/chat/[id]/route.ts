import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export function PATCH() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
            walletAddress: true
          }
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                walletAddress: true
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
                walletAddress: true
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
