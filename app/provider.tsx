'use client'

import { createAppKit, AppKitProvider } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bitcoinAdapter, projectId, appkitNetworks } from '@/config'

const queryClient = new QueryClient()

// metadata is optional
const metadata = {
  name: 'My Bitcoin App',
  description: 'App with Leather wallet support',
  url: 'https://your.app',
  icons: ['https://your.app/icon.png']
}

export const appkit = createAppKit({
  adapters: [bitcoinAdapter],
  projectId,
  networks: appkitNetworks,
  defaultNetwork: bitcoinAdapter.networks[0],
  metadata,
  features: {
    analytics: true
  }
})

type ContextProviderProps = {
  children: React.ReactNode
}

export default function ContextProvider({ children }: ContextProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppKitProvider
        adapters={[bitcoinAdapter]}
        projectId={projectId}
        networks={appkitNetworks}
        defaultNetwork={bitcoinAdapter.networks[0]}
        metadata={metadata}
        features={{
          analytics: true
        }}
      >
        {children}
      </AppKitProvider>
    </QueryClientProvider>
  )
}
