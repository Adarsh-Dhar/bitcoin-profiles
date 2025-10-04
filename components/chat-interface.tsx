'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Send, Loader2, AlertCircle, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    displayName: string
    bnsName: string
    profileImage?: string
  }
}

interface ChatInterfaceProps {
  chatRoomId: string
  userAddress?: string
  userRole?: 'ADMIN' | 'MEMBER' | 'NON_MEMBER'
  onMessageSent?: (message: Message) => void
}

export function ChatInterface({ 
  chatRoomId, 
  userAddress, 
  userRole = 'NON_MEMBER',
  onMessageSent 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages on mount and set up polling
  useEffect(() => {
    if (chatRoomId && userAddress) {
      loadMessages()
      
      // Set up polling for new messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages(true) // Pass true to show notifications for new messages
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [chatRoomId, userAddress])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (showNotification = false) => {
    try {
      if (showNotification) {
        setIsLoading(false) // Don't show loading spinner for background updates
      } else {
        setIsLoading(true)
      }
      
      const response = await fetch(`/api/chat/${chatRoomId}/messages?walletAddress=${userAddress}`)
      
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }
      
      const data = await response.json()
      const newMessages = data.messages || []
      
      // Only update if we have new messages
      if (newMessages.length > messages.length) {
        // Check if there are new messages for notification
        if (showNotification && messages.length > 0) {
          setHasNewMessages(true)
          // Clear the notification after 3 seconds
          setTimeout(() => setHasNewMessages(false), 3000)
        }
        
        setMessages(newMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      if (!showNotification) {
        toast.error('Failed to load messages')
      }
    } finally {
      setIsLoading(false)
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
      
      // Add the new message to the local state
      setMessages(prev => [...prev, data.message])
      
      // Notify parent component
      onMessageSent?.(data.message)
      
      setNewMessage('')
      
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

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center gap-2 p-4 bg-primary/10 border-b border-border rounded-t-lg">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {userRole === 'NON_MEMBER' 
            ? 'You must own at least 1 Key to participate in this chat.'
            : 'You are a member of this exclusive chat room.'
          }
        </span>
        {hasNewMessages && (
          <div className="ml-auto">
            <div className="flex items-center gap-1 text-xs text-primary bg-primary/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              New messages
            </div>
          </div>
        )}
      </div>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading messages...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const showDate = index === 0 || 
                  formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt)
                
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
  )
}
