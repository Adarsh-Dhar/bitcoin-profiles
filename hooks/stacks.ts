import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export const network = (() => {
  const env = process.env.NEXT_PUBLIC_STACKS_NETWORK?.toLowerCase();
  if (env === 'mainnet') return STACKS_MAINNET;
  if (env === 'testnet') return STACKS_TESTNET;
  return STACKS_DEVNET;
})();

export function authenticate() {
  showConnect({
    appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
    onFinish: () => window.location.reload(),
    userSession,
  });
}

export function getSenderAddress(): string | undefined {
  if (!userSession.isUserSignedIn()) return undefined;
  const data = userSession.loadUserData();
  const net = (network as any)?.chainId === 1 ? 'mainnet' : 'testnet';
  return data?.profile?.stxAddress?.[net];
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const FACTORY_NAME = process.env.NEXT_PUBLIC_FACTORY_NAME || 'Factory';
export const KEYTOKEN_NAME = process.env.NEXT_PUBLIC_KEYTOKEN_NAME || 'KeyToken';
export const VENDING_NAME = process.env.NEXT_PUBLIC_VENDING_NAME || 'KeyVendingMachine';


