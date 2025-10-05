'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { setupGlobalErrorSuppression } from '@/lib/error-suppression'

interface LeatherProvider {
  request: (method: string, params?: unknown) => Promise<unknown>
}

declare global {
  interface Window {
    LeatherProvider?: LeatherProvider
  }
}

interface UserAddresses {
  [x: string]: unknown
  addresses?: Array<{
    address: string
    publicKey: string
    derivationPath: string
    symbol?: string
    type?: string
  }>
  result?: {
    addresses?: Array<{
      address: string
      publicKey: string
      derivationPath: string
      symbol?: string
      type?: string
    }>
  }
}

export function ConnectWalletButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userAddress, setUserAddress] = useState<string>('')
  const [isLeatherInstalled, setIsLeatherInstalled] = useState(false)

  // Initialize error suppression on component mount
  useEffect(() => {
    setupGlobalErrorSuppression()
  }, [])

  // Check if Leather wallet is installed
  useEffect(() => {
    let isMounted = true
    let checkTimeout: NodeJS.Timeout | null = null

    const checkLeatherInstallation = () => {
      if (!isMounted) return
      
      try {
        if (window.LeatherProvider && typeof window.LeatherProvider.request === 'function') {
          setIsLeatherInstalled(true)
        } else {
          setIsLeatherInstalled(false)
        }
      } catch {
        // Silently handle errors to prevent console spam
        if (isMounted) {
          setIsLeatherInstalled(false)
        }
      }
    }

    // Check immediately
    checkLeatherInstallation()
    
    // Check again after a delay to ensure extension is loaded
    checkTimeout = setTimeout(() => {
      if (isMounted) {
        checkLeatherInstallation()
      }
    }, 1000)
    
    return () => {
      isMounted = false
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
    }
  }, [])

  const connectWallet = async (retryCount = 0) => {
    if (!window.LeatherProvider) {
      toast.error('Please install the Leather wallet extension')
      return
    }

    setIsLoading(true)
    
    try {
      // Add a delay to ensure the extension is fully loaded
      await new Promise(resolve => setTimeout(resolve, 200 + (retryCount * 100)))
      
      // Wrap the request in a try-catch to handle JSON parsing errors
      let userAddresses: UserAddresses
      try {
        userAddresses = await window.LeatherProvider.request('getAddresses') as UserAddresses
      } catch (requestError) {
        // Suppress known extension errors from console
        const errorMessage = requestError instanceof Error ? requestError.message : String(requestError)
        
        // If it's a known extension error and we haven't retried too many times
        if (errorMessage.includes('JSON') || 
            errorMessage.includes('setImmedia') ||
            errorMessage.includes('postMessage') ||
            errorMessage.includes('handleMessage')) {
          if (retryCount < 2) {
            return connectWallet(retryCount + 1)
          } else {
            throw new Error('Wallet extension communication error')
          }
        }
        throw requestError
      }

      console.log('userAddresses', userAddresses)
      
      // Handle JSON-RPC response format
      const addresses = userAddresses?.result?.addresses || userAddresses?.addresses
      
      if (addresses && Array.isArray(addresses) && addresses.length > 0) {
        // Find the first Bitcoin address (prefer P2WPKH over P2TR)
        const btcAddress = addresses.find((addr) => 
          addr.symbol === 'BTC' && addr.type === 'p2wpkh'
        ) || addresses.find((addr) => 
          addr.symbol === 'BTC'
        )
        
        if (btcAddress) {
          setUserAddress(btcAddress.address)
          setIsConnected(true)
          // Store wallet address in localStorage for persistence
          localStorage.setItem('walletAddress', btcAddress.address)
          toast.success('Wallet connected successfully!')
        } else {
          throw new Error('No Bitcoin address found in wallet')
        }
      } else {
        throw new Error('No addresses returned from wallet')
      }
    } catch (error) {
      // Suppress known extension errors from console
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // More specific error handling
      if (error instanceof Error) {
        if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
          toast.error('Connection rejected by user')
        } else if (errorMessage.includes('JSON') || 
                   errorMessage.includes('setImmedia') ||
                   errorMessage.includes('postMessage') ||
                   errorMessage.includes('handleMessage')) {
          if (retryCount < 2) {
            toast.error('Wallet extension error. Retrying...')
            return connectWallet(retryCount + 1)
          } else {
            toast.error('Wallet extension error. Please refresh the page and try again.')
          }
        } else {
          toast.error(`Connection failed: ${errorMessage}`)
        }
      } else {
        toast.error('Failed to connect wallet. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setUserAddress('')
    // Remove wallet address from localStorage
    localStorage.removeItem('walletAddress')
    toast.success('Wallet disconnected')
  }


  const refreshPage = () => {
    window.location.reload()
  }

  if (!isLeatherInstalled) {
    return (
      <div className="space-y-2">
        <Button 
          disabled 
          className="w-full"
          variant="outline"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Leather Wallet Not Installed
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Please install the <a href="https://leather.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Leather wallet extension</a>
        </p>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Wallet className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disconnectWallet}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button 
        onClick={() => connectWallet()}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Leather Wallet
          </>
        )}
      </Button>
    </div>
  )
}
