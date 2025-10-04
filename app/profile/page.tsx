"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProfileHeader } from "@/components/profile-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserPlus, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface User {
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage?: string
  bio?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/user/auth/me")
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setUser(null)
        } else if (response.status === 404) {
          // User not found in database
          setUser(null)
        } else {
          throw new Error(data?.error || "Failed to fetch profile")
        }
      } else {
        setUser(data.user)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch profile"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchUserProfile} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Profile Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have a profile yet. Create one to get started with Bitcoin Profiles.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth">
                <UserPlus className="mr-2 h-4 w-4" />
                Create Profile
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/explore">
                <ExternalLink className="mr-2 h-4 w-4" />
                Explore Profiles
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mock data for profile stats - in a real app, these would come from the API
  const profileStats = {
    keyPrice: "0.001 BTC",
    keysInCirculation: 0,
    marketCap: "0 BTC"
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Bitcoin profile and settings
        </p>
      </div>

      <ProfileHeader
        name={user.displayName}
        bnsName={user.bnsName}
        bio={user.bio || "No bio provided"}
        keyPrice={profileStats.keyPrice}
        keysInCirculation={profileStats.keysInCirculation}
        marketCap={profileStats.marketCap}
        avatarUrl={user.profileImage}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Display Name</label>
              <p className="text-lg">{user.displayName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">BNS Name</label>
              <p className="text-lg font-mono">{user.bnsName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
              <p className="text-sm font-mono break-all">{user.walletAddress}</p>
            </div>
            {user.bio && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                <p className="text-sm">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/settings">
                Edit Profile
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/explore">
                Explore Other Profiles
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portfolio">
                View Portfolio
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
