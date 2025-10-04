# Chat Features Documentation

## Overview
The Bitcoin Profiles application now includes a comprehensive chat system with message history, real-time updates, and role-based access control.

## Features Implemented

### 1. Chat Room Management
- **Create Chat Rooms**: Users can create exclusive chat rooms with custom names and descriptions
- **Join Chat Rooms**: Users can join chat rooms they have access to
- **Role-based Access**: Three roles - ADMIN, MEMBER, and NON_MEMBER
- **Private/Public Rooms**: Support for both private and public chat rooms

### 2. Message System
- **Send Messages**: Authenticated members can send messages
- **Message History**: All messages are persisted and loaded when entering a chat room
- **Real-time Updates**: Polling mechanism updates messages every 5 seconds
- **Message Formatting**: Messages include sender info, timestamps, and proper formatting

### 3. User Interface
- **Modern Design**: Clean, responsive interface using Tailwind CSS
- **Message Bubbles**: Properly styled message display with avatars
- **Date Separators**: Messages are grouped by date for better organization
- **Loading States**: Proper loading indicators and error handling
- **New Message Notifications**: Visual indicators when new messages arrive

### 4. API Endpoints

#### Chat Rooms
- `GET /api/chat` - Get all chat rooms for a user
- `POST /api/chat` - Create a new chat room
- `GET /api/chat/[id]` - Get specific chat room details

#### Messages
- `GET /api/chat/[id]/messages` - Get messages for a chat room
- `POST /api/chat/[id]/messages` - Send a new message

#### User Management
- `GET /api/user/chat-rooms` - Get user's chat room memberships
- `GET /api/user/auth/me` - Get current user info

## Database Schema

### ChatRoom Model
```prisma
model ChatRoom {
  id          String   @id @default(cuid())
  name        String
  description String?
  isPrivate   Boolean  @default(false)
  createdAt   DateTime @default(now())
  creatorId   String
  creator     User     @relation("ChatRoomCreator", fields: [creatorId], references: [id])
  members     ChatMember[]
  messages    Message[]
}
```

### Message Model
```prisma
model Message {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])
  chatRoomId String
  chatRoom   ChatRoom @relation(fields: [chatRoomId], references: [id])
}
```

### ChatMember Model
```prisma
model ChatMember {
  id        String   @id @default(cuid())
  joinedAt  DateTime @default(now())
  role      ChatRole @default(NON_MEMBER)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  chatRoomId String
  chatRoom   ChatRoom @relation(fields: [chatRoomId], references: [id])
}
```

## Usage

### Creating a Chat Room
1. Navigate to `/chat`
2. Click "Create Chat Room"
3. Fill in the room details
4. The creator automatically becomes an ADMIN

### Joining a Chat Room
1. Browse available chat rooms on `/chat`
2. Click on a chat room to enter
3. If you're a member, you can send messages
4. If not, you'll see a message about needing to be a member

### Sending Messages
1. Enter a chat room where you're a member
2. Type your message in the input field
3. Press Enter or click Send
4. Messages are automatically saved and synced

## Security Features
- **Authentication Required**: All chat operations require wallet authentication
- **Role-based Access**: Only members can send messages
- **Input Validation**: Message content is validated and sanitized
- **Rate Limiting**: Built-in protection against spam (can be enhanced)

## Future Enhancements
- WebSocket integration for true real-time messaging
- Message encryption for private rooms
- File/image sharing
- Message reactions and replies
- Push notifications
- Message search functionality
- Chat room moderation tools

## Technical Notes
- Uses Next.js 14 with App Router
- Prisma ORM for database operations
- Tailwind CSS for styling
- TypeScript for type safety
- Polling mechanism for real-time updates (5-second intervals)
- Responsive design for mobile and desktop
