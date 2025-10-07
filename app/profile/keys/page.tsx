"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useKeyTokenContract } from "@/hooks/useKeyTokenContract"
import { useKeyVendingMachineContract } from "@/hooks/useKeyVendingMachineContract"
import { getSenderAddress, authenticate, CONTRACT_ADDRESS, KEYTOKEN_TEMPLATE_NAME } from "@/hooks/stacks"
import { Key, Wallet, TrendingUp, Users, RefreshCw, ExternalLink } from "lucide-react"

interface KeyData {
  creator: string
  balance: number
  tokenName: string
  tokenSymbol: string
  totalSupply: number
  chatRoomId?: number | null
  price?: number
}

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [initSuccess, setInitSuccess] = useState<string | null>(null)
  
  const keyTokenContract = useKeyTokenContract()
  const vending = useKeyVendingMachineContract()

  const handleInitializeContracts = async () => {
    try {
      setInitLoading(true)
      setInitError(null)
      setInitSuccess(null)
      const sender = getSenderAddress()
      if (!sender) {
        setError("Please connect your wallet to initialize contracts")
        return
      }
      await vending.initialize(sender, CONTRACT_ADDRESS, CONTRACT_ADDRESS, KEYTOKEN_TEMPLATE_NAME, 1)
      setInitSuccess("Contracts initialized. Please confirm in wallet, then refresh.")
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setInitError(message || "Initialization failed")
    } finally {
      setInitLoading(false)
    }
  }

  const loadUserKeys = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const address = getSenderAddress()
      if (!address) {
        setError("Please connect your wallet to view your keys")
        setKeys([]) // Clear any existing keys
        if (isRefresh) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
        return
      }
      
      setUserAddress(address)
      
      // Try to fetch real data from the blockchain
      const keysData: KeyData[] = []
      
      try {
        // Add a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 8000)
        )
        
        const contractPromise = (async () => {
          console.log('Checking keys for address:', address)
          console.log('Using contract:', process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, process.env.NEXT_PUBLIC_KEYTOKEN_TEMPLATE_NAME)
          
          // Get balance for the current key token contract (decoded)
          const balanceBig = await keyTokenContract.getBalanceDecoded(address)
          const balance = Number(typeof balanceBig === 'bigint' ? balanceBig : (balanceBig || 0))
          console.log('Balance value (decoded):', balance, '(raw bigint):', balanceBig)
          
          if (balance > 0) {
            // Get token metadata (required) within timeout
            const [name, symbol, totalSupplyBig] = await Promise.all([
              keyTokenContract.getNameDecoded(),
              keyTokenContract.getSymbolDecoded(),
              keyTokenContract.getTotalSupplyDecoded(),
            ])
            console.log('Token metadata (decoded):', { name, symbol, totalSupply: totalSupplyBig })

            // Get chat room ID for this key
            let chatRoomId: number | null = null
            try {
              const holderChatRoom = await keyTokenContract.getHolderChatRoomId(address)
              // Convert ClarityValue to number if possible
              if (holderChatRoom && typeof holderChatRoom === 'object' && 'value' in holderChatRoom) {
                chatRoomId = Number((holderChatRoom as any).value)
              } else if (typeof holderChatRoom === 'number' || typeof holderChatRoom === 'bigint') {
                chatRoomId = Number(holderChatRoom)
              }
              console.log(`🔑 Key Chat Room ID for ${name} (${symbol}):`, chatRoomId)
            } catch (e) {
              console.warn('Failed to get chat room ID for key:', e)
            }

            const keyDataWithChatRoom = {
              creator: "Current Creator", // This would be the actual creator address
              balance: Number(balance),
              tokenName: (name as any) || "Creator Key",
              tokenSymbol: (symbol as any) || "KEY",
              totalSupply: Number(typeof totalSupplyBig === 'bigint' ? totalSupplyBig : (totalSupplyBig as any) || 0),
              chatRoomId: chatRoomId
            }
            
            console.log('📊 Complete Key Data:', keyDataWithChatRoom)
            keysData.push(keyDataWithChatRoom)

            // Best-effort: holder metadata (do not block or fail UI)
            ;(async () => {
              try {
                const holderTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('holder-timeout')), 3000))
                const holderPromise = (async () => {
                  const holderInfo: any = await keyTokenContract.getHolderInfoDecoded(address)
                  const holderChatRoom = await keyTokenContract.getHolderChatRoomId(address)
                  console.log('Holder info (decoded):', holderInfo)
                  console.log('Holder chat-room-id (raw cv):', holderChatRoom)
                  
                  // Log the chat_room_id for this key
                  console.log(`🔑 Key Chat Room ID for ${name} (${symbol}):`, holderChatRoom)
                  
                  console.log('Key detail:', {
                    creator: "Current Creator",
                    balance,
                    tokenName: name,
                    tokenSymbol: symbol,
                    totalSupply: totalSupplyBig,
                    holderInfo,
                    holderChatRoomRaw: holderChatRoom,
                  })
                })()
                await Promise.race([holderPromise, holderTimeout])
              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('[holder-meta] skipped', e)
              }
            })()
          } else {
            console.log('No keys found for address:', address)
            console.log('This might be because:')
            console.log('1. Keys were bought from KeyVendingMachine but KeyToken contract is not initialized')
            console.log('2. Different contract addresses are being used')
            console.log('3. The KeyVendingMachine is not properly minting to the KeyToken contract')
          }
        })()
        
        await Promise.race([contractPromise, timeoutPromise])
      } catch (err) {
        console.warn(`Failed to load keys from contract:`, err)
        // Don't set error for network issues, just show empty state
        // This prevents continuous retries and rate limiting
        if (err instanceof Error && err.message === 'Request timeout') {
          console.log("Request timed out - showing empty state")
        } else {
          console.log("Network error - showing empty state")
        }
      }
      
      setKeys(keysData)
      
      // Log summary of all keys and their chat_room_ids
      console.log('🔑 All Keys Summary:')
      keysData.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key.tokenName} (${key.tokenSymbol}) - Chat Room ID: ${key.chatRoomId}`)
      })
    } catch (err) {
      console.error("Failed to load user keys:", err)
      setKeys([]) // Clear keys on error
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // Only load keys if wallet is connected
    const address = getSenderAddress()
    if (address) {
      loadUserKeys()
    } else {
      setLoading(false)
      setError("Please connect your wallet to view your keys")
      setKeys([])
    }
  }, []) // Empty dependency array to prevent continuous re-renders

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Keys</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage your creator keys across all profiles
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {error.includes("connect your wallet") ? (
              <Button
                onClick={authenticate}
                size="sm"
              >
                Connect Wallet
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUserKeys(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
        
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Key className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Keys</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage your creator keys across all profiles
        </p>
        {userAddress && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="font-mono">{userAddress}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const address = getSenderAddress()
                if (address) {
                  loadUserKeys(true)
                } else {
                  authenticate()
                }
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {getSenderAddress() ? 'Refresh' : 'Connect Wallet'}
            </Button>
          </div>
        )}
      </div>


      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Keys</p>
                <p className="text-2xl font-bold">
                  {keys.reduce((sum, key) => sum + key.balance, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Holdings</p>
                <p className="text-2xl font-bold">{keys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Creators</p>
                <p className="text-2xl font-bold">{keys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keys List */}
      {keys.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Keys Found</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any creator keys yet. Start by purchasing keys from your favorite creators!
            </p>
            <div className="space-y-2">
              <Button onClick={() => window.location.href = '/marketplace/primary'}>
                Browse Creators
              </Button>
              {userAddress && (
                <div className="pt-2">
                  {initError && (
                    <div className="text-xs text-red-600 mb-2">{initError}</div>
                  )}
                  {initSuccess && (
                    <div className="text-xs text-green-600 mb-2">{initSuccess}</div>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleInitializeContracts}
                    disabled={initLoading}
                    className="mt-1"
                  >
                    {initLoading ? 'Initializing…' : 'Initialize Contracts'}
                  </Button>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    This links the vending machine to the token contract ({CONTRACT_ADDRESS}.{KEYTOKEN_TEMPLATE_NAME}).
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                If you just bought keys, they may take a moment to appear. Try refreshing the page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            // Log chat_room_id for each key when rendering
            console.log(`🔑 Rendering Key ${index + 1}: ${key.tokenName} (${key.tokenSymbol}) - Chat Room ID:`, key.chatRoomId)
            
            return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{key.tokenName}</CardTitle>
                  <Badge variant="secondary">{key.tokenSymbol}</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {key.creator}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Balance</span>
                    <span className="text-2xl font-bold">{key.balance.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Supply</span>
                    <span className="font-semibold">{key.totalSupply.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Share</span>
                    <span className="font-semibold">
                      {key.totalSupply > 0 
                        ? ((key.balance / key.totalSupply) * 100).toFixed(2) + '%'
                        : '0%'
                      }
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        Trade
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
