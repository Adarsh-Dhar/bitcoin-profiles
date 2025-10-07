"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Users, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useKeyVendingMachineContract } from "@/hooks/useKeyVendingMachineContract"
import { useKeyTokenContract } from "@/hooks/useKeyTokenContract"
import { useMarketOperations } from "@/hooks/useMarketOperations"
import { KeyPurchaseExample } from "@/components/key-purchase-example"
import { CONTRACT_ADDRESS, VENDING_NAME, getSenderAddress } from "@/hooks/stacks"

interface User {
  id: string
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string
}

interface MessagePreview {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    displayName: string
    bnsName: string
  }
}

interface ChatRoomListItem {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  createdAt: string
  creator: User
  messages: MessagePreview[]
  _count: {
    members: number
    messages: number
  }
}

export default function PrimaryMarketplacePage() {
  const [chatRooms, setChatRooms] = useState<ChatRoomListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBuying, setIsBuying] = useState(false)
  const [isSettingMinter, setIsSettingMinter] = useState(false)
  const [buyingRoomId, setBuyingRoomId] = useState<string | null>(null)
  const [marketInfo, setMarketInfo] = useState<Record<string, any>>({})
  const [loadingMarketInfo, setLoadingMarketInfo] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { buyKeys } = useKeyVendingMachineContract()
  const token = useKeyTokenContract()
  const { buyKeysWithFullProcess, getMarketInfo } = useMarketOperations()

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/chat-rooms")
        if (!res.ok) throw new Error("Failed to load chat rooms")
        const data = await res.json()
        setChatRooms(data.chatRooms || [])
      } catch (e) {
        toast.error("Failed to fetch chat rooms")
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleOwnerSetMinter = async () => {
    try {
      setIsSettingMinter(true)
      const sender = getSenderAddress()
      if (!sender) {
        toast.error("Please connect your wallet")
        return
      }
      if (sender !== CONTRACT_ADDRESS) {
        toast.error("Owner-only action: connect with deployer wallet")
        return
      }
      toast.message("Setting token minter to vending… confirm in wallet")
      await token.setAuthorizedMinterContract(CONTRACT_ADDRESS, VENDING_NAME)
      toast.success("Token minter set to vending contract")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg || "Failed to set token minter")
    } finally {
      setIsSettingMinter(false)
    }
  }

  // Deterministically convert string IDs (e.g., cuid) to a uint for on-chain use
  const toUintFromId = (id: string | number): bigint => {
    if (typeof id === 'number') return BigInt(id)
    // numeric string path
    const asNum = Number(id)
    if (Number.isFinite(asNum) && !Number.isNaN(asNum)) return BigInt(asNum)
    // FNV-1a 64-bit hash for stable uint mapping
    let hash = BigInt('14695981039346656037') // 0xCBF29CE484222325
    const prime = BigInt('1099511628211') // 0x100000001B3
    const mod64 = BigInt('18446744073709551616') // 2^64
    for (let i = 0; i < id.length; i++) {
      hash = (hash ^ BigInt(id.charCodeAt(i)))
      hash = (hash * prime) % mod64
    }
    return hash
  }

  const loadMarketInfo = async (roomId: string) => {
    try {
      setLoadingMarketInfo(prev => ({ ...prev, [roomId]: true }))
      const info = await getMarketInfo(roomId)
      setMarketInfo(prev => ({ ...prev, [roomId]: info }))
    } catch (error) {
      console.error('Failed to load market info:', error)
      // Don't show error toast for market info loading failures
    } finally {
      setLoadingMarketInfo(prev => ({ ...prev, [roomId]: false }))
    }
  }

  const handleBuyOneKey = async (roomId: string | number) => {
    try {
      const roomIdStr = String(roomId)
      setBuyingRoomId(roomIdStr)
      setIsBuying(true)

      console.log(`Starting 3-step key purchase process for room: ${roomIdStr}`)

      // Use the new 3-step process with comprehensive error handling
      const result = await buyKeysWithFullProcess(roomIdStr, 1)

      if (result.success) {
        console.log('Key purchase completed successfully')
        // Refresh market info after successful purchase
        await loadMarketInfo(roomIdStr)
      } else {
        console.error('Key purchase failed:', result.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Unexpected error in key purchase:', message)
      toast.error(`Unexpected error: ${message}`)
    } finally {
      setIsBuying(false)
      setBuyingRoomId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Primary Marketplace</h1>
        <p className="text-muted-foreground mt-2">Browse all chat rooms and buy keys.</p>
      </div>

      {/* 3-Step Process Example */}
      <KeyPurchaseExample />

      {/* Owner-only utility: set minter to vending contract */}
      <div className="mt-4">
        {(() => {
          const sender = getSenderAddress()
          const isOwner = sender && sender === CONTRACT_ADDRESS
          if (!isOwner) return null
          return (
            <Button variant="outline" size="sm" onClick={handleOwnerSetMinter} disabled={isSettingMinter}>
              {isSettingMinter ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting minter…
                </>
              ) : (
                <>Set token minter to vending</>
              )}
            </Button>
          )
        })()}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {chatRooms.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={room.creator.profileImage} />
                    <AvatarFallback>{room.creator.displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{room.name}</div>
                    <div className="text-sm text-muted-foreground truncate">@{room.creator.bnsName}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {room._count.members} members
                </Badge>
              </div>

              {room.messages?.length ? (
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {room.messages[0].sender.displayName}: {room.messages[0].content}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No messages yet</div>
              )}

              {/* Market Information */}
              <div className="text-xs text-muted-foreground space-y-1">
                {loadingMarketInfo[room.id] ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading price...
                  </div>
                ) : marketInfo[room.id] ? (
                  <div className="space-y-1">
                    <div className="font-medium text-green-600">
                      Price: {marketInfo[room.id].priceFormatted}
                    </div>
                    <div className="text-xs opacity-75">
                      Vending: {marketInfo[room.id].market.vendingMachine.split('.')[1]}
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => loadMarketInfo(room.id)}
                  >
                    Load Price
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" onClick={() => router.push(`/chat/${room.id}`)} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enter
                </Button>
                <Button 
                  onClick={() => handleBuyOneKey(room.id)} 
                  className="gap-2" 
                  disabled={isBuying}
                  variant={buyingRoomId === room.id ? "default" : "default"}
                >
                  {isBuying && buyingRoomId === room.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buying...
                    </>
                  ) : (
                    <>
                      Buy 1 key
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


