import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatRoomId } = await params
    const { walletAddress, content } = await request.json()

    if (!walletAddress || !content) {
      return NextResponse.json(
        { error: 'Wallet address and content are required' },
        { status: 400 }
      )
    }

    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'Chat room ID is required' },
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

    // Check if the chat room exists
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId }
    })

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    // Check if the user is a member of the chat room
    const membership = await prisma.chatMember.findFirst({
      where: {
        userId: user.id,
        chatRoomId: chatRoomId,
        role: {
          in: ['ADMIN', 'MEMBER']
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this chat room' },
        { status: 403 }
      )
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: user.id,
        chatRoomId: chatRoomId
      },
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
      }
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatRoomId } = await params
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'Chat room ID is required' },
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

    // Check if the user is a member of the chat room
    const membership = await prisma.chatMember.findFirst({
      where: {
        userId: user.id,
        chatRoomId: chatRoomId,
        role: {
          in: ['ADMIN', 'MEMBER']
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this chat room' },
        { status: 403 }
      )
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: { chatRoomId },
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
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: { chatRoomId }
    })

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
