import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, stringAsciiCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, VENDING_NAME, network, getSenderAddress } from './stacks';

export function useKeyVendingMachineContract(contractId?: string) {
  // Determine target contract address/name. If contractId provided as "SP...Name", use it; otherwise fallback to constants
  const getTarget = () => {
    if (contractId && typeof contractId === 'string') {
      const [addr, name] = contractId.split('.');
      if (addr && name) {
        return { address: addr, name };
      }
    }
    return { address: CONTRACT_ADDRESS, name: VENDING_NAME };
  };

  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    const target = getTarget();
    await openContractCall({
      contractAddress: target.address,
      contractName: target.name,
      functionName,
      functionArgs,
      network,
      appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
      onFinish: () => {},
    });
  };

  const ro = async (functionName: string, functionArgs: any[] = []) => {
    const senderAddress = getSenderAddress();
    const target = getTarget();
    return fetchCallReadOnlyFunction({
      contractAddress: target.address,
      contractName: target.name,
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
    initialize: (roomId: string, creator: string, tokenContractId: string) => {
      const [tokenAddr, tokenName] = (tokenContractId || '').split('.');
      if (!tokenAddr || !tokenName) throw new Error(`Invalid token contract id: ${tokenContractId}`);
      return call('initialize', [
        stringAsciiCV(roomId),
        standardPrincipalCV(creator),
        // must be a contract principal for the token contract
        contractPrincipalCV(tokenAddr, tokenName),
      ]);
    },
    setProtocolTreasury: (treasury: string) => call('set-protocol-treasury', [standardPrincipalCV(treasury)]),

    // pricing read-onlys (decoded to plain JSON values)
    calculateBuyPrice: (amount: number | bigint) => roDecoded('calculate-buy-price', [uintCV(amount as any)]),
    calculateSellPrice: (amount: number | bigint) => roDecoded('calculate-sell-price', [uintCV(amount as any)]),
    // Note: contract exports get-token-supply-public; keep a stable API here
    getTokenSupply: () => roDecoded('get-token-supply-public'),
    getMarketInfo: () => roDecoded('get-market-info'),

    // decoded helpers
    calculateBuyPriceDecoded: async (amount: number | bigint) => {
      const target = getTarget();
      try {
        const v = await roDecoded('calculate-buy-price', [uintCV(amount as any)]);
        const n = extractUint(v);
        return n ?? BigInt(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Compatibility fallback: try legacy function names if calculate-buy-price is missing
        if (message && message.includes('UndefinedFunction')) {
          try {
            const v1 = await roDecoded('get-buy-price', [uintCV(amount as any)]);
            const n1 = extractUint(v1);
            if (n1 !== undefined) return n1;
          } catch {}
          try {
            const v2 = await roDecoded('price-to-buy', [uintCV(amount as any)]);
            const n2 = extractUint(v2);
            if (n2 !== undefined) return n2;
          } catch {}
        }
        throw new Error(
          `calculate-buy-price not found on ${target.address}.${target.name}. Please deploy/update vending machine with pricing read-only or register the correct contract. Original error: ${message}`
        );
      }
    },
    calculateSellPriceDecoded: async (amount: number | bigint) => {
      const v = await roDecoded('calculate-sell-price', [uintCV(amount as any)]);
      const n = extractUint(v);
      return n ?? BigInt(0);
    },
    getTokenSupplyDecoded: async () => {
      const v = await roDecoded('get-token-supply-public');
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


