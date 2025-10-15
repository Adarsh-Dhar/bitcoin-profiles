'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFactoryContract } from '@/hooks/useFactoryContract'
import { useDynamicKeyTokenContract } from '@/hooks/useDynamicKeyTokenContract'
import { useKeyVendingMachineContract } from '@/hooks/useKeyVendingMachineContract'
import { CONTRACT_ADDRESS, VENDING_NAME, KEYTOKEN_TEMPLATE_NAME, getSenderAddress, network } from '@/hooks/stacks'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { MessageCircle, Send, Users, Crown, User, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  walletAddress: string
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

export default function ChatPage() {
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [userAddress, setUserAddress] = useState<string>('')
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER' | 'NON_MEMBER'>('NON_MEMBER')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const factory = useFactoryContract()

  // Get wallet address from localStorage
  useEffect(() => {
    const storedAddress = localStorage.getItem('walletAddress')
    if (storedAddress) {
      setUserAddress(storedAddress)
      fetchUserChatRoom(storedAddress)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Refresh the page when the wallet address changes (including same-tab changes)
  useEffect(() => {
    const key = 'walletAddress'
    let previous = ''
    try {
      previous = localStorage.getItem(key) || ''
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        const next = e.newValue || ''
        if (next !== previous) {
          window.location.reload()
        }
      }
    }

    window.addEventListener('storage', handleStorage)

    // Same-tab polling fallback because `storage` doesn't fire in the same document
    const interval = setInterval(() => {
      try {
        const current = localStorage.getItem(key) || ''
        if (current !== previous) {
          window.location.reload()
        }
      } catch {}
    }, 1500)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Set up polling for new messages after userAddress and chatRoom are set
  useEffect(() => {
    if (!userAddress || !chatRoom) return

    const interval = setInterval(() => {
      fetchMessages(chatRoom.id)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [userAddress, chatRoom?.id])

  // Check membership when userAddress or chatRoom changes
  useEffect(() => {
    if (userAddress && chatRoom) {
      if (chatRoom.creator.walletAddress.toLowerCase() === userAddress.toLowerCase()) {
        setUserRole('ADMIN')
        return
      }
      const userMembership = chatRoom.members.find(
        (member: ChatMember) => member.user.walletAddress.toLowerCase() === userAddress.toLowerCase()
      )
      setUserRole(userMembership?.role || 'NON_MEMBER')
    }
  }, [userAddress, chatRoom])

  const fetchUserChatRoom = async (walletAddress: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/user/chat-rooms?walletAddress=${walletAddress}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'User not found') {
          toast.error('Please connect your wallet to create an account')
          return
        }
        throw new Error('Failed to fetch chat rooms')
      }
      const data = await response.json()
      const firstRoom: ChatRoom | undefined = (data.chatRooms || [])[0]
      if (!firstRoom) {
        setChatRoom(null)
        return
      }
      // Fetch full chat room details
      const roomRes = await fetch(`/api/chat/${firstRoom.id}`)
      if (!roomRes.ok) {
        throw new Error('Failed to fetch chat room')
      }
      const roomData = await roomRes.json()
      setChatRoom(roomData.chatRoom)
    } catch (error) {
      console.error('Error fetching user chat room:', error)
      toast.error('Failed to load chat room')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (chatRoomId: string) => {
    if (!userAddress) return
    try {
      const response = await fetch(`/api/chat/${chatRoomId}/messages?walletAddress=${userAddress}`)
      if (!response.ok) {
        if (response.status !== 403) {
          console.error('Error fetching messages:', response.status, response.statusText)
        }
        return
      }
      const data = await response.json()
      if (data.messages && data.messages.length > 0) {
        setChatRoom(prev => {
          if (!prev) return null
          if (data.messages.length > prev.messages.length) {
            return { ...prev, messages: data.messages }
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
    if (!chatRoom || !newMessage.trim() || !userAddress || userRole === 'NON_MEMBER') {
      return
    }
    try {
      setIsSending(true)
      const response = await fetch(`/api/chat/${chatRoom.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: userAddress, content: newMessage.trim() })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }
      const data = await response.json()
      setChatRoom(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : null)
      setNewMessage('')
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <Alert className="text-left" variant="destructive">
              <AlertDescription>
                No wallet connected. Please connect your wallet to access your chat room.
              </AlertDescription>
            </Alert>
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-2xl font-bold">Chat Room Not Found</h1>
              <p className="text-muted-foreground">
                We couldn't find a chat room for your wallet.
              </p>
            </div>
            <div>
              <Button
                onClick={async () => {
                  if (!userAddress) return
                  try {
                    setIsCreating(true)
                    const sender = getSenderAddress()
                    if (!sender) {
                      toast.error('Please connect your wallet')
                      return
                    }

                    // 1) Create chat room in DB first to get the room id
                    const res = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ walletAddress: userAddress })
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}))
                      throw new Error(err.error || 'Failed to create chat room')
                    }
                    const data = await res.json()
                    const created = data.chatRoom
                    if (!created?.id) throw new Error('Failed to create chat room (no id)')

                    // 2) On-chain: register market for this room id
                    const vendingId = `${CONTRACT_ADDRESS}.${VENDING_NAME}`
                    const tokenId = `${CONTRACT_ADDRESS}.${KEYTOKEN_TEMPLATE_NAME}`
                    toast.message('Registering market… confirm in wallet')
                    const txId = await factory.registerMarket(String(created.id), vendingId, tokenId, userAddress)

                    // Wait for confirmation and poll factory until the market is visible
                    const apiBase = (network as any)?.coreApiUrl || (network as any)?.url || 'https://api.testnet.hiro.so'
                    const txUrl = `${String(apiBase).replace(/\/$/, '')}/extended/v1/tx/${txId}`
                    const start = Date.now()
                    while (Date.now() - start < 180_000) {
                      try {
                        const r = await fetch(txUrl)
                        if (r.ok) {
                          const j = await r.json()
                          const status = j?.tx_status
                          if (status && status !== 'pending') break
                        }
                      } catch {}
                      await new Promise(res => setTimeout(res, 2000))
                    }

                    // Poll `hasMarket` until true
                    {
                      const start2 = Date.now()
                      while (Date.now() - start2 < 60_000) {
                        try {
                          const exists = await factory.hasMarketDecoded(String(created.id))
                          if (exists) break
                        } catch {}
                        await new Promise(res => setTimeout(res, 1500))
                      }
                    }

                    // 3) On-chain: set authorized minter on token to vending
                    try {
                      const [tokenAddr, tokenName] = tokenId.split('.')
                      const dynToken = useDynamicKeyTokenContract(tokenAddr, tokenName)
                      await dynToken.setAuthorizedMinter(vendingId)
                    } catch (e) {
                      // Surface but continue to show clear error
                      throw new Error('Failed to authorize vending machine as minter on token')
                    }

                    // 4) On-chain: set protocol treasury to creator (sender)
                    try {
                      const vm = useKeyVendingMachineContract(vendingId)
                      await vm.setProtocolTreasury(sender)
                    } catch (e) {
                      // Non-blocking per @primary flow, but warn the user
                      toast.error('Setting protocol treasury failed (non-blocking). You can retry later.')
                    }

                    // 5) Load full room details
                    const roomRes = await fetch(`/api/chat/${created.id}`)
                    if (roomRes.ok) {
                      const roomData = await roomRes.json()
                      setChatRoom(roomData.chatRoom)
                      toast.success('Chat room created and market registered')
                    } else {
                      window.location.reload()
                    }
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Failed to create chat room'
                    toast.error(msg)
                  } finally {
                    setIsCreating(false)
                  }
                }}
                disabled={isCreating}
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </div>
                ) : (
                  'Create Chat Room'
                )}
              </Button>
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold">{chatRoom.name}</h1>
                <p className="text-muted-foreground">{chatRoom.creator.walletAddress}</p>
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
                            
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-sm">{message.sender.walletAddress}</span>
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
