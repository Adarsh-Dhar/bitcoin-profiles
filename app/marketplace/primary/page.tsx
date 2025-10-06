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
  const router = useRouter()
  const { getBuyPrice, buyKeys } = useKeyVendingMachineContract()
  const token = useKeyTokenContract()

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

  const handleBuyOneKey = async () => {
    try {
      // Preflight checks
      const sender = getSenderAddress()
      if (!sender) {
        toast.error("Please connect your wallet")
        return
      }

      const vendingContractId = `${CONTRACT_ADDRESS}.${VENDING_NAME}`
      if (!CONTRACT_ADDRESS || !VENDING_NAME) {
        toast.error("Contract configuration missing")
        return
      }

      setIsBuying(true)

      // Verify the token contract's authorized minter matches vending contract
      try {
        const minterDecoded: any = await token.getAuthorizedMinterDecoded()
        // minterDecoded is optional principal -> either null or {repr or value}
        const minterStr = (() => {
          if (!minterDecoded) return ''
          // cvToJSON for (some contract-principal) returns { type: 'some', value: { type: 'principal', value: { type: 'contract', address, contractName }}}
          const v = (minterDecoded as any)
          const inner = v?.value || v // handle already-unwrapped shapes
          const principal = inner?.value || inner
          const addr = principal?.address || principal?.value?.address
          const name = principal?.contractName || principal?.value?.contractName
          return addr && name ? `${addr}.${name}` : ''
        })()

        if (minterStr && minterStr !== vendingContractId) {
          toast.error("Token minter not set to vending contract")
          setIsBuying(false)
          return
        }
        if (!minterStr) {
          toast.error("Token minter not configured")
          setIsBuying(false)
          return
        }
      } catch (e) {
        // If the chain call itself fails, surface a clear message
        try {
          // eslint-disable-next-line no-console
          console.error('[minter-check:error]', e, {
            token: `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}.${process.env.NEXT_PUBLIC_KEYTOKEN_NAME}`,
            vending: `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}.${process.env.NEXT_PUBLIC_VENDING_NAME}`,
          })
        } catch {}
        const msg = e instanceof Error ? e.message : String(e)
        if (msg?.includes('UndefinedFunction("get-authorized-minter")') || msg?.includes('UndefinedFunction(\"get-authorized-minter\")')) {
          // Attempt to set the authorized minter to the vending contract automatically (owner-only)
          try {
            toast.message("Setting token minter to vending contract… please confirm in wallet")
            await token.setAuthorizedMinterContract(CONTRACT_ADDRESS, VENDING_NAME)
            toast.success("Token minter set to vending contract. Continuing…")
          } catch (setErr) {
            const setMsg = setErr instanceof Error ? setErr.message : String(setErr)
            toast.warning(setMsg || "Token minter read-only missing; proceeding without check")
          }
          // continue without returning
        } else {
          toast.error(msg || "Failed to verify token minter")
          setIsBuying(false)
          return
        }
      }

      // Quote on-chain for 1 key and add 2% slippage buffer
      const quote: any = await getBuyPrice(BigInt(1))
      // Surface contract identifier for quick debugging
      try {
        const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
        const name = process.env.NEXT_PUBLIC_VENDING_NAME || 'KeyVendingMachine'
        // eslint-disable-next-line no-console
        console.log('[buy-debug] using contract', `${addr}.${name}`)
      } catch {}
      // Handle decoded cvToJSON tuple shape: fields contain { type, value }
      const totalCostRaw = quote?.["total-cost"]?.value ?? quote?.total_cost?.value ?? quote?.["total-cost"] ?? quote?.total_cost ?? 0
      const totalCost = typeof totalCostRaw === 'bigint' ? totalCostRaw : BigInt(totalCostRaw)
      // 2% buffer using integer math: ceil(total * 1.02) -> (total * 102) / 100
      const maxWithBuffer = (totalCost * BigInt(102)) / BigInt(100)
      if (totalCost <= BigInt(0)) {
        toast.error("Quoted price is invalid")
        setIsBuying(false)
        return
      }

      await buyKeys(BigInt(1), maxWithBuffer)
      toast.success("Purchase submitted")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(message || "Purchase failed")
    } finally {
      setIsBuying(false)
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

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" onClick={() => router.push(`/chat/${room.id}`)} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enter
                </Button>
                <Button onClick={handleBuyOneKey} className="gap-2" disabled={isBuying}>
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


