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
import { useDynamicKeyTokenContract } from "@/hooks/useDynamicKeyTokenContract"
import { useMarketOperations } from "@/hooks/useMarketOperations"
import { CONTRACT_ADDRESS, VENDING_NAME, KEYTOKEN_TEMPLATE_NAME, getSenderAddress } from "@/hooks/stacks"
import { useFactoryContract } from "@/hooks/useFactoryContract"

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
  const [isUnregistering, setIsUnregistering] = useState(false)
  const [unregisteringRoomId, setUnregisteringRoomId] = useState<string | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migratingRoomId, setMigratingRoomId] = useState<string | null>(null)
  const [buyingRoomId, setBuyingRoomId] = useState<string | null>(null)
  const [marketInfo, setMarketInfo] = useState<Record<string, any>>({})
  const [loadingMarketInfo, setLoadingMarketInfo] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const vending = useKeyVendingMachineContract()
  const token = useKeyTokenContract()
  const { buyKeysWithFullProcess, getMarketInfo } = useMarketOperations()
  const factory = useFactoryContract()

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
      await token.authorizeCallerAsMinter()
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

      console.log(`[UI] Buy 1 key clicked for room ${roomIdStr}`)
      // Optional: prefetch and log market info/price shown in UI
      try {
        const info = await getMarketInfo(roomIdStr)
        console.log('[UI] MarketInfo', {
          roomId: roomIdStr,
          vendingMachine: info.market.vendingMachine,
          tokenContract: info.market.tokenContract,
          priceForOneMicro: info.priceForOne.toString(),
          priceForOneSTX: (Number(info.priceForOne) / 1_000_000).toFixed(6),
        })
      } catch (e) {
        console.warn('[UI] MarketInfo prefetch failed (non-blocking)', e)
      }

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

  const handleUnregisterMarket = async (roomId: string | number) => {
    try {
      const roomIdStr = String(roomId)
      const sender = getSenderAddress()
      if (!sender) {
        toast.error("Please connect your wallet")
        return
      }
      if (sender !== CONTRACT_ADDRESS) {
        toast.error("Owner-only action: connect with deployer wallet")
        return
      }

      if (!window.confirm("Are you sure you want to unregister this market?")) {
        return
      }

      setUnregisteringRoomId(roomIdStr)
      setIsUnregistering(true)
      toast.message("Unregistering market… confirm in wallet")
      await factory.unregisterMarket(roomIdStr)
      // Clear cached market info for this room
      setMarketInfo(prev => {
        const next = { ...prev }
        delete next[roomIdStr]
        return next
      })
      toast.success("Market unregistered")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg || "Failed to unregister market")
    } finally {
      setIsUnregistering(false)
      setUnregisteringRoomId(null)
    }
  }

  const handleMigrateTov11 = async (roomId: string | number) => {
    try {
      const roomIdStr = String(roomId)
      const sender = getSenderAddress()
      if (!sender) {
        toast.error("Please connect your wallet")
        return
      }
      if (sender !== CONTRACT_ADDRESS) {
        toast.error("Owner-only action: connect with deployer wallet")
        return
      }

      setMigratingRoomId(roomIdStr)
      setIsMigrating(true)

      const vendingId = `${CONTRACT_ADDRESS}.${VENDING_NAME}`
      const tokenId = `${CONTRACT_ADDRESS}.${KEYTOKEN_TEMPLATE_NAME}`

      console.log('[Migrate v11] start', { roomIdStr, vendingId, tokenId, sender })

      // 1) Unregister existing market (if any)
      try {
        console.log('[Migrate v11] unregister...')
        await factory.unregisterMarket(roomIdStr)
        console.log('[Migrate v11] unregistered')
      } catch (e) {
        console.warn('[Migrate v11] unregister skipped/failed (continuing):', e)
      }

      // 2) Register v11 market
      console.log('[Migrate v11] register v11...', { vendingId, tokenId })
      await factory.registerMarket(roomIdStr, vendingId, tokenId)
      console.log('[Migrate v11] registered')

      // 3) v11 uses explicit authorization path (no initialize with token)
      const vending = useKeyVendingMachineContract(vendingId)

      // 4) Authorize vending as minter on KeyToken_v11
      console.log('[Migrate v11] authorize minter on token...')
      try {
        const [tokenAddr, tokenName] = tokenId.split('.')
        const dynToken = useDynamicKeyTokenContract(tokenAddr, tokenName)
        // Parse the vendingId to get address and name
        const [vendingAddr, vendingName] = vendingId.split('.')
        console.log('[Migrate v11] calling setAuthorizedMinter with vending contract:', { vendingAddr, vendingName })
        // Set the vending machine contract as the authorized minter
        const result = await dynToken.setAuthorizedMinter(vendingId)
        console.log('[Migrate v11] setAuthorizedMinter result:', result)
        console.log('[Migrate v11] minter authorized via token contract')
      } catch (e) {
        console.error('[Migrate v11] token set-authorized-minter failed with error:', e)
        console.error('[Migrate v11] error details:', {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
          vendingId,
          tokenId
        })
        throw new Error('Failed to authorize vending machine as minter on token contract')
      }

      // 5) Optional: set protocol treasury to sender (owner)
      try {
        console.log('[Migrate v11] set protocol treasury...')
        await vending.setProtocolTreasury(sender)
        console.log('[Migrate v11] protocol treasury set')
      } catch (e) {
        console.warn('[Migrate v11] set protocol treasury failed (non-blocking):', e)
      }

      toast.success('Migrated market to v11 successfully')
      // Refresh market info
      await loadMarketInfo(roomIdStr)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[Migrate v11] failed:', msg)
      toast.error(msg || 'Migration failed')
    } finally {
      setIsMigrating(false)
      setMigratingRoomId(null)
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

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const sender = getSenderAddress()
                    const isOwner = sender && sender === CONTRACT_ADDRESS
                    if (!isOwner) return null
                    return (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnregisterMarket(room.id)}
                        disabled={isUnregistering && unregisteringRoomId === room.id}
                        className="gap-2"
                      >
                        {isUnregistering && unregisteringRoomId === room.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Unregistering…
                          </>
                        ) : (
                          <>Unregister</>
                        )}
                      </Button>
                    )
                  })()}
                  {(() => {
                    const sender = getSenderAddress()
                    const isOwner = sender && sender === CONTRACT_ADDRESS
                    if (!isOwner) return null
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMigrateTov11(room.id)}
                        disabled={isMigrating && migratingRoomId === room.id}
                        className="gap-2"
                      >
                        {isMigrating && migratingRoomId === room.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Migrating…
                          </>
                        ) : (
                          <>Migrate to v11</>
                        )}
                      </Button>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


