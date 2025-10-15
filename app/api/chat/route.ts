import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { CONTRACT_ADDRESS, VENDING_NAME, KEYTOKEN_TEMPLATE_NAME } from '@/hooks/stacks'

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export function PATCH() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, description, isPrivate } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Hotfix: ensure required columns/constraints exist in dev DB BEFORE user creation
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT ''`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "description" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT true`)
      // Ensure ChatMember.role exists; fallback to 'MEMBER'
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatMember" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'MEMBER'`)
      // Ensure ChatRole enum exists and align column type/default
      await prisma.$executeRawUnsafe(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatRole') THEN
          CREATE TYPE "ChatRole" AS ENUM ('ADMIN','MEMBER','NON_MEMBER');
        END IF;
      END$$;`)
      // Cast role column to enum and set default to NON_MEMBER
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatMember" ALTER COLUMN "role" DROP DEFAULT;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatMember" ALTER COLUMN "role" TYPE "ChatRole" USING "role"::"ChatRole";`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatMember" ALTER COLUMN "role" SET DEFAULT 'NON_MEMBER'::"ChatRole";`)
      // Drop legacy unique constraint/index on creatorId to allow multiple chat rooms per creator
      await prisma.$executeRawUnsafe(`ALTER TABLE "ChatRoom" DROP CONSTRAINT IF EXISTS "ChatRoom_creatorId_key";`)
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "ChatRoom_creatorId_key";`)
      // Relax legacy User columns (bnsName/displayName) if present to allow nulls
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bnsName" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "bnsName" DROP NOT NULL`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "displayName" DROP NOT NULL`)
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "User_bnsName_key"`)
    } catch (e) {
      // ignore if permissions restricted; creation may still succeed if columns exist
    }

    // Find or create the user by wallet address (profiles removed; wallet-address is identity)
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    })
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress }
      })
    }

    // Users can now create multiple chat rooms, so no need to check for existing ones

    // Create the chat room and add the creator as an ADMIN member
    const chatRoom = await prisma.chatRoom.create({
      data: {
        creatorId: user.id,
        name: name || `Chat Room of ${user.walletAddress}`,
        description: description || null,
        isPrivate: isPrivate || false,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN' as any
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
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true
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
            walletAddress: true
          }
        },
        members: {
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
