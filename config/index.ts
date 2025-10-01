import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import { bitcoin } from '@reown/appkit/networks'
import type { CaipNetwork } from '@reown/appkit'

const pid = process.env.NEXT_PUBLIC_PROJECT_ID
export const projectId: string = pid ?? ''
if (!pid) {
  // eslint-disable-next-line no-console
  console.warn('NEXT_PUBLIC_PROJECT_ID is not defined. Wallet features may not work.')
}

export const networks: CaipNetwork[] = [bitcoin]

// Non-empty tuple typed for createAppKit consumption
export const appkitNetworks = [bitcoin] as unknown as [any, ...any[]]

export const bitcoinAdapter = new BitcoinAdapter({
  projectId,
  networks,
})
