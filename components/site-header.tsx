"use client"

import { Search, Wallet, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { appkit } from "@/app/provider"
import { useAppKit } from '@reown/appkit/react'
import { useEffect, useState } from 'react'
import { truncateAddress } from '@/lib/utils'

type User = {
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string | null
  bio?: string | null
}

export function SiteHeader() {
  const { address, isConnected } = useAppKit()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch user data when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      setLoading(true)
      fetch('/api/user/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setUser(null)
    }
  }, [isConnected, address])

  const handleDisconnect = () => {
    appkit.disconnect()
    setUser(null)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-8 gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full" />
          <span className="text-xl font-bold">Bitcoin Profiles</span>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search profiles..." className="pl-10" />
        </div>

        <div className="flex items-center gap-2">
          {isConnected && user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-sm font-mono"
                disabled={loading}
              >
                {loading ? 'Loading...' : truncateAddress(user.walletAddress)}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => appkit.open()}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
