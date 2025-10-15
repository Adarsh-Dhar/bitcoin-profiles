import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export const network = (() => {
  const env = process.env.NEXT_PUBLIC_STACKS_NETWORK?.toLowerCase();
  const apiUrl = process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';

  if (env === 'mainnet') return STACKS_MAINNET;
  if (env === 'testnet') return STACKS_TESTNET;
  if (env === 'devnet') return STACKS_DEVNET;
  // devnet/mocknet (Clarinet). Ensure we point to the local Clarinet node.
  const devnet: any = { ...STACKS_DEVNET };
  devnet.url = apiUrl;
  devnet.coreApiUrl = apiUrl;
  return devnet;
})();

export function authenticate() {
  showConnect({
    appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
    onFinish: () => window.location.reload(),
    userSession,
  });
}

export function getSenderAddress(): string | undefined {
  const net = (network as any)?.chainId === 1 ? 'mainnet' : 'testnet';
  if (userSession.isUserSignedIn()) {
    const data = userSession.loadUserData();
    const fromSession = data?.profile?.stxAddress?.[net];
    if (fromSession) return fromSession;
  }
  try {
    // Fallback to Leather-provided STX address persisted by the UI
    const localKey = net === 'mainnet' ? 'stxAddress-mainnet' : 'stxAddress-testnet';
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null;
    if (fromStorage) return fromStorage;
  } catch {}
  return undefined;
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST3TAJ5G6N40MG8TDXYMXQ4TTH4YAB8KVVP4PTGF4';
export const FACTORY_NAME = process.env.NEXT_PUBLIC_FACTORY_NAME || 'Factory_v11';
export const KEYTOKEN_TEMPLATE_NAME = process.env.NEXT_PUBLIC_KEYTOKEN_TEMPLATE_NAME || 'KeyToken_v11';
export const VENDING_NAME = process.env.NEXT_PUBLIC_VENDING_NAME || 'KeyVendingMachine_v11';


