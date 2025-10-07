'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { MessageCircle, Plus, Users, Crown, User, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { CreateChatRoomDialog } from '@/components/create-chat-room-dialog'

interface User {
  id: string
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string
}

interface ChatMember {
  id: string
  role: 'ADMIN' | 'MEMBER' | 'NON_MEMBER'
  user: User
}

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    displayName: string
    bnsName: string
  }
}

interface ChatRoom {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  createdAt: string
  creator: User
  members: ChatMember[]
  messages: Message[]
  userRole: 'ADMIN' | 'MEMBER' | 'NON_MEMBER'
  _count: {
    members: number
    messages: number
  }
}

export default function ChatPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userAddress, setUserAddress] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const router = useRouter()

  // Get wallet address from localStorage or connect wallet
  useEffect(() => {
    const storedAddress = localStorage.getItem('walletAddress')
    if (storedAddress) {
      setUserAddress(storedAddress)
      fetchChatRooms(storedAddress)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchChatRooms = async (walletAddress: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/user/chat-rooms?walletAddress=${walletAddress}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // If user not found, redirect to auth page
        if (errorData.error === 'User not found') {
          toast.error('Please create an account first')
          router.push('/auth')
          return
        }
        
        throw new Error('Failed to fetch chat rooms')
      }
      
      const data = await response.json()
      setChatRooms(data.chatRooms || [])
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
      toast.error('Failed to load chat rooms')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChatRoom = () => {
    if (!userAddress) {
      toast.error('Please connect your wallet first')
      router.push('/auth')
      return
    }
    setIsCreateDialogOpen(true)
  }

  const handleChatRoomCreated = async (chatRoom: ChatRoom) => {
    // Refresh chat rooms
    await fetchChatRooms(userAddress)
    
    // Navigate to the new chat room
    router.push(`/chat/${chatRoom.id}`)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-3 w-3 text-yellow-500" />
      case 'MEMBER':
        return <User className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'MEMBER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (!userAddress) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
              <p className="text-muted-foreground">
                Connect your wallet to view and manage your chat rooms
              </p>
            </div>
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading chat rooms...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Your Chat Rooms</h1>
              <p className="text-muted-foreground mt-2">
                Manage your exclusive chat rooms and communities
              </p>
            </div>
            <Button onClick={handleCreateChatRoom} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Chat Room
            </Button>
          </div>

          {chatRooms.length === 0 ? (
            <div className="text-center py-16">
              <div className="space-y-4">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">No Chat Rooms Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You haven't joined any chat rooms yet. Create your first exclusive chat room to get started.
                  </p>
                </div>
                <Button onClick={handleCreateChatRoom} size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Chat Room
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {chatRooms.map((chatRoom) => (
                <Card 
                  key={chatRoom.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => router.push(`/chat/${chatRoom.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chatRoom.creator.profileImage} />
                          <AvatarFallback>
                            {chatRoom.creator.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">
                            {chatRoom.name}
                          </CardTitle>
                          <CardDescription className="truncate">
                            by @{chatRoom.creator.bnsName}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(chatRoom.userRole)} className="gap-1">
                        {getRoleIcon(chatRoom.userRole)}
                        {chatRoom.userRole}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Last message preview */}
                      {chatRoom.messages.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span className="truncate">
                              {chatRoom.messages[0].sender.displayName}:
                            </span>
                            <span className="text-xs">
                              {formatTimeAgo(chatRoom.messages[0].createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {chatRoom.messages[0].content}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No messages yet
                        </p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{chatRoom._count.members}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{chatRoom._count.messages}</span>
                          </div>
                        </div>
                        <span className="text-xs">
                          {formatTimeAgo(chatRoom.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Room Dialog */}
      <CreateChatRoomDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onChatRoomCreated={handleChatRoomCreated}
        userAddress={userAddress}
      />
    </div>
  )
}
