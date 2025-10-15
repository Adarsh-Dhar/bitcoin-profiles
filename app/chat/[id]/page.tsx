'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { SiteHeader } from '@/components/site-header'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { MessageCircle, Send, ArrowLeft, Users, Crown, User, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string
  bio?: string
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
    walletAddress: string
    bnsName: string
    displayName: string
    profileImage?: string
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
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const chatRoomId = params.id as string
  
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [userAddress, setUserAddress] = useState<string>('')
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER' | 'NON_MEMBER'>('NON_MEMBER')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get wallet address from localStorage
  useEffect(() => {
    const storedAddress = localStorage.getItem('walletAddress')
    if (storedAddress) {
      setUserAddress(storedAddress)
      fetchChatRoom()
    } else {
      setIsLoading(false)
    }
  }, [chatRoomId])

  // Set up polling for new messages after userAddress is set
  useEffect(() => {
    if (!userAddress) return

    // Set up polling for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchMessages() // Only fetch messages, not the entire chat room
    }, 5000)
    
    return () => clearInterval(interval)
  }, [userAddress, chatRoomId])

  // Check membership when userAddress or chatRoom changes
  useEffect(() => {
    if (userAddress && chatRoom) {
      // First check if user is the creator
      if (chatRoom.creator.walletAddress.toLowerCase() === userAddress.toLowerCase()) {
        setUserRole('ADMIN')
        return
      }
      
      // Then check if user is a member
      const userMembership = chatRoom.members.find(
        (member: ChatMember) => member.user.walletAddress.toLowerCase() === userAddress.toLowerCase()
      )
      
      setUserRole(userMembership?.role || 'NON_MEMBER')
    }
  }, [userAddress, chatRoom])

  const fetchChatRoom = async (isBackgroundUpdate = false) => {
    try {
      // Only show loading spinner on initial load, not for background updates
      if (!isBackgroundUpdate) {
        setIsLoading(true)
      }
      
      const response = await fetch(`/api/chat/${chatRoomId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Chat room not found')
          router.push('/chat')
          return
        }
        throw new Error('Failed to fetch chat room')
      }
      
      const data = await response.json()
      setChatRoom(data.chatRoom)
      
      // Check if user is a member - only if we have userAddress
      if (userAddress) {
        const userMembership = data.chatRoom.members.find(
          (member: ChatMember) => member.user.walletAddress === userAddress
        )
        setUserRole(userMembership?.role || 'NON_MEMBER')
      }
    } catch (error) {
      console.error('Error fetching chat room:', error)
      if (!isBackgroundUpdate) {
        toast.error('Failed to load chat room')
      }
    } finally {
      if (!isBackgroundUpdate) {
        setIsLoading(false)
      }
    }
  }

  const fetchMessages = async () => {
    // Don't fetch if we don't have userAddress
    if (!userAddress) {
      return
    }

    try {
      const response = await fetch(`/api/chat/${chatRoomId}/messages?walletAddress=${userAddress}`)
      
      if (!response.ok) {
        // Don't log errors for 403 (not a member) as this is expected for non-members
        if (response.status !== 403) {
          console.error('Error fetching messages:', response.status, response.statusText)
        }
        return
      }
      
      const data = await response.json()
      
      // Only update if we have new messages and the count is different
      if (data.messages && data.messages.length > 0) {
        setChatRoom(prev => {
          if (!prev) return null
          
          // Check if we have new messages by comparing count
          if (data.messages.length > prev.messages.length) {
            return {
              ...prev,
              messages: data.messages
            }
          }
          
          return prev
        })
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !userAddress || userRole === 'NON_MEMBER') {
      return
    }

    try {
      setIsSending(true)
      
      const response = await fetch(`/api/chat/${chatRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: userAddress,
          content: newMessage.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      // Add the new message to the chat room
      setChatRoom(prev => prev ? {
        ...prev,
        messages: [...prev.messages, data.message]
      } : null)
      
      setNewMessage('')
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return date.toLocaleDateString([], { weekday: 'long' })
    return date.toLocaleDateString()
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
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
              <p className="text-muted-foreground">
                Connect your wallet to access this chat room
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
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading chat room...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!chatRoom) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-2xl font-bold">Chat Room Not Found</h1>
              <p className="text-muted-foreground">
                The chat room you're looking for doesn't exist or you don't have access to it.
              </p>
            </div>
            <Button onClick={() => router.push('/chat')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat Rooms
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/chat')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{chatRoom.name}</h1>
                <p className="text-muted-foreground">
                  by @{chatRoom.creator.bnsName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getRoleBadgeVariant(userRole)} className="gap-1">
                {getRoleIcon(userRole)}
                {userRole}
              </Badge>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{chatRoom.members.length}</span>
              </div>
            </div>
          </div>


          {/* Chat Interface */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{chatRoom.name}</CardTitle>
              {chatRoom.description && (
                <CardDescription>{chatRoom.description}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatRoom.messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {chatRoom.messages.map((message, index) => {
                      const showDate = index === 0 || 
                        formatDate(chatRoom.messages[index - 1].createdAt) !== formatDate(message.createdAt)
                      
                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="text-center py-2">
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={message.sender.profileImage} />
                              <AvatarFallback>
                                {message.sender.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-sm">
                                  {message.sender.displayName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  @{message.sender.bnsName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              {userRole !== 'NON_MEMBER' ? (
                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isSending || !newMessage.trim()}>
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="p-4 border-t bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>You must be a member to send messages in this chat room.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
