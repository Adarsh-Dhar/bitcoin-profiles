import { PrismaClient } from '@prisma/client'

// Ensure a single PrismaClient instance across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({
    log: ['error', 'warn']
  })

// Guard against mutating ChatRoom after creation
prisma.$use(async (params, next) => {
  if (params.model === 'ChatRoom') {
    const action = params.action
    if (action === 'update' || action === 'updateMany' || action === 'upsert' || action === 'delete' || action === 'deleteMany') {
      // Block any direct mutations to ChatRoom once created
      throw new Error('ChatRoom is immutable and cannot be modified after creation')
    }
    if (action === 'create' && params.args?.data) {
      // Ensure isLocked defaults to true regardless of client input
      params.args.data.isLocked = true
    }
  }
  return next(params)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma


