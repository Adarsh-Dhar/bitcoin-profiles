"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function AuthPage() {
  const [walletAddress, setWalletAddress] = useState("")
  const [bnsName, setBnsName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [bio, setBio] = useState("")
  const [loading, startTransition] = useTransition()
  const redirect = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('redirect') || '/', [])

  function isValid() {
    return walletAddress.trim() !== "" && bnsName.trim() !== "" && displayName.trim() !== ""
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid()) {
      toast.error("walletAddress, bnsName and displayName are required")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, bnsName, displayName, profileImage: profileImage || null, bio: bio || null }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || "Failed to sign up")
        }
        toast.success("Account created")
        window.location.href = redirect || "/"
      } catch (err: any) {
        toast.error(err?.message || "Sign up failed")
      }
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Create account</h2>
      <p className="text-sm text-muted-foreground mb-6">Fill details to get started</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="walletAddress">Wallet address</Label>
          <Input id="walletAddress" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="SP2C..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bnsName">BNS name</Label>
          <Input id="bnsName" value={bnsName} onChange={(e) => setBnsName(e.target.value)} placeholder="alice.btc" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alice" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileImage">Profile image URL</Label>
          <Input id="profileImage" value={profileImage} onChange={(e) => setProfileImage(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio" />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !isValid()}>
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
    </div>
  )
}


