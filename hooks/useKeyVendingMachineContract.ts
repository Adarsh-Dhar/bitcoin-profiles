import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, stringAsciiCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, VENDING_NAME, network, getSenderAddress } from './stacks';

export function useKeyVendingMachineContract() {
  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: VENDING_NAME,
      functionName,
      functionArgs,
      network,
      appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
      onFinish: () => {},
    });
  };

  const ro = async (functionName: string, functionArgs: any[] = []) => {
    const senderAddress = getSenderAddress();
    return fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: VENDING_NAME,
      functionName,
      functionArgs,
      network,
      senderAddress: senderAddress || CONTRACT_ADDRESS,
    });
  };

  const roDecoded = async (functionName: string, functionArgs: any[] = []) => {
    const cv: ClarityValue = await ro(functionName, functionArgs);
    const json = cvToJSON(cv);
    return json?.value as any;
  };

  // Robust extractor for uint values from cvToJSON outputs
  const extractUint = (json: any): bigint | undefined => {
    if (json == null) return undefined;
    if (typeof json === 'bigint') return json;
    if (typeof json === 'number') return BigInt(json);
    if (typeof json === 'string') {
      if (/^\d+$/.test(json)) return BigInt(json);
      const m = /^u(\d+)$/.exec(json);
      if (m) return BigInt(m[1]);
    }
    if (typeof json === 'object') {
      if (json.type === 'uint' && json.value != null) {
        return extractUint(json.value);
      }
      if ('value' in json) {
        const inner = (json as any).value;
        const got = extractUint(inner);
        if (got !== undefined) return got;
      }
      for (const key of Object.keys(json)) {
        if (key === 'type') continue;
        const got = extractUint((json as any)[key]);
        if (got !== undefined) return got;
      }
    }
    return undefined;
  };

  return {
    // init/admin
    initialize: (roomId: string, creator: string, tokenContract: string) =>
      call('initialize', [
        stringAsciiCV(roomId),
        standardPrincipalCV(creator),
        standardPrincipalCV(tokenContract),
      ]),
    setProtocolTreasury: (treasury: string) => call('set-protocol-treasury', [standardPrincipalCV(treasury)]),

    // pricing read-onlys (decoded to plain JSON values)
    calculateBuyPrice: (amount: number | bigint) => roDecoded('calculate-buy-price', [uintCV(amount as any)]),
    calculateSellPrice: (amount: number | bigint) => roDecoded('calculate-sell-price', [uintCV(amount as any)]),
    getTokenSupply: () => roDecoded('get-token-supply'),
    getMarketInfo: () => roDecoded('get-market-info'),

    // decoded helpers
    calculateBuyPriceDecoded: async (amount: number | bigint) => {
      const v = await roDecoded('calculate-buy-price', [uintCV(amount as any)]);
      const n = extractUint(v);
      return n ?? BigInt(0);
    },
    calculateSellPriceDecoded: async (amount: number | bigint) => {
      const v = await roDecoded('calculate-sell-price', [uintCV(amount as any)]);
      const n = extractUint(v);
      return n ?? BigInt(0);
    },
    getTokenSupplyDecoded: async () => {
      const v = await roDecoded('get-token-supply');
      const n = extractUint(v);
      return n ?? BigInt(0);
    },

    // trading
    buyKeys: (amount: number | bigint, maxPrice: number | bigint) =>
      call('buy-keys', [uintCV(amount as any), uintCV(maxPrice as any)]),
    sellKeys: (amount: number | bigint, minPrice: number | bigint) =>
      call('sell-keys', [uintCV(amount as any), uintCV(minPrice as any)]),
  };
}


