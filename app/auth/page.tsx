'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'

type WalletAccount = {
  address: string
}

async function requestStacksAddress(): Promise<WalletAccount | null> {
  if (typeof window === 'undefined') return null
  const provider = (window as any).stacksProvider
  if (!provider) {
    toast.error('No Stacks wallet detected. Please install Leather or Hiro.')
    return null
  }
  try {
    const resp = await provider?.request?.({ method: 'stx_getAddresses' })
    const addr = resp?.addresses?.[0]?.address
    if (!addr) return null
    return { address: addr }
  } catch (e) {
    console.error(e)
    toast.error('Failed to get wallet address')
    return null
  }
}

async function signMessage(address: string, message: string): Promise<string | null> {
  const provider = (typeof window !== 'undefined') ? (window as any).stacksProvider : null
  if (!provider) return null
  try {
    const result = await provider.request({
      method: 'stx_signMessage',
      params: { message, account: address },
    })
    return result?.signature ?? null
  } catch (e) {
    console.error(e)
    toast.error('Message signature rejected')
    return null
  }
}

export default function AuthPage() {
  const [address, setAddress] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = useMemo(() => {
    const r = searchParams?.get('redirect') || '/'
    try {
      const url = new URL(r, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      return url.pathname + url.search + url.hash
    } catch {
      return '/'
    }
  }, [searchParams])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const acct = await requestStacksAddress()
      if (!acct) return
      setAddress(acct.address)

      const nonceResp = await fetch('/api/auth/nonce', { cache: 'no-store' })
      if (!nonceResp.ok) throw new Error('Failed to get nonce')
      const { nonce } = await nonceResp.json()

      const sig = await signMessage(acct.address, `Bitcoin Profiles login: ${nonce}`)
      if (!sig) return

      const verify = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: acct.address, signature: sig, nonce }),
      })
      if (!verify.ok) {
        const err = await verify.json().catch(() => ({}))
        throw new Error(err?.message || 'Sign-in failed')
      }

      toast.success('Wallet connected')
      router.replace(redirectTo)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect your wallet</CardTitle>
          <CardDescription>
            Web3-native onboarding: connect and sign to verify ownership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Detected address</Label>
            <Input id="address" value={address} readOnly placeholder="Not connected" />
          </div>
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            <Wallet className="mr-2 h-4 w-4" />
            {loading ? 'Connecting…' : 'Connect Wallet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


