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
  const router = useRouter()
  const { getBuyPrice, buyKeys } = useKeyVendingMachineContract()

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

  const handleBuyOneKey = async () => {
    try {
      // Quote on-chain for 1 key and add 2% slippage buffer
      const quote: any = await getBuyPrice(BigInt(1))
      // Handle decoded cvToJSON tuple shape: fields contain { type, value }
      const totalCostRaw = quote?.["total-cost"]?.value ?? quote?.total_cost?.value ?? quote?.["total-cost"] ?? quote?.total_cost ?? 0
      const totalCost = typeof totalCostRaw === 'bigint' ? totalCostRaw : BigInt(totalCostRaw)
      // 2% buffer using integer math: ceil(total * 1.02) -> (total * 102) / 100
      const maxWithBuffer = (totalCost * BigInt(102)) / BigInt(100)
      await buyKeys(BigInt(1), maxWithBuffer)
      toast.success("Purchase submitted")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(message || "Purchase failed")
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
    <div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Primary Marketplace</h1>
      <p className="text-muted-foreground mt-2">Browse all chat rooms and buy keys.</p>

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

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" onClick={() => router.push(`/chat/${room.id}`)} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enter
                </Button>
                <Button onClick={handleBuyOneKey} className="gap-2">
                  Buy 1 key
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


