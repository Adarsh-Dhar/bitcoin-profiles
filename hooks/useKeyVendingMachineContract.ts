import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, stringAsciiCV, cvToJSON, ClarityValue, contractPrincipalCV, makeContractCall, broadcastTransaction, AnchorMode, FungibleConditionCode, PostConditionMode } from '@stacks/transactions';
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

  const call = async (functionName: string, functionArgs: any[], overrides?: { postConditions?: any[]; postConditionMode?: PostConditionMode }) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    const target = getTarget();

    console.log('[VM.call] prepare', {
      senderAddress,
      contractAddress: target.address,
      contractName: target.name,
      functionName,
      functionArgs,
      network: (network as any)?.coreApiUrl || (network as any)?.url,
    });

    return new Promise<string>((resolve, reject) => {
      try {
        openContractCall({
          contractAddress: target.address,
          contractName: target.name,
          functionName,
          functionArgs,
          network,
          appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
          postConditions: overrides?.postConditions ?? [],
          postConditionMode: overrides?.postConditionMode ?? PostConditionMode.Deny,
          onFinish: (data: any) => {
            try {
              const txId: string | undefined = data?.txId || data?.txid || data?.txId?.txId;
              console.log('[VM.call] onFinish', { txId: txId || null, raw: data });
              resolve(txId || '');
            } catch (e) {
              reject(e as Error);
            }
          },
          onCancel: () => {
            console.warn('[VM.call] user canceled');
            reject(new Error('User canceled'));
          },
        } as any);
      } catch (e) {
        console.error('[VM.call] openContractCall error', e);
        reject(e as Error);
      }
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
    // init/admin - contract only takes roomId and creator
    initialize: (roomId: string, creator: string) => {
      return call('initialize', [
        stringAsciiCV(roomId),
        standardPrincipalCV(creator),
      ]);
    },
    setProtocolTreasury: (treasury: string) => call('set-protocol-treasury', [standardPrincipalCV(treasury)]),
    authorizeTokenMinter: (tokenContractId: string) => {
      const [addr, name] = (tokenContractId || '').split('.');
      if (!addr || !name) throw new Error(`Invalid token contract id: ${tokenContractId}`);
      return call('authorize-token-minter', [contractPrincipalCV(addr, name)]);
    },

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

    // trading (legacy signatures - DEPRECATED, use buyKeysWithToken/sellKeysWithToken)
    // Note: These functions require token trait parameter in the contract
    // buyKeys: (amount: number | bigint, maxPrice: number | bigint) =>
    //   call('buy-keys', [uintCV(amount as any), uintCV(maxPrice as any)]),
    // sellKeys: (amount: number | bigint, minPrice: number | bigint) =>
    //   call('sell-keys', [uintCV(amount as any), uintCV(minPrice as any)]),

    // trading (v11 signatures include token contract principal)
    buyKeysWithToken: (amount: number | bigint, maxPrice: number | bigint, tokenContractId: string) => {
      const [addr, name] = (tokenContractId || '').split('.');
      if (!addr || !name) throw new Error(`Invalid token contract id: ${tokenContractId}`);
      return call(
        'buy-keys',
        [uintCV(amount as any), uintCV(maxPrice as any), contractPrincipalCV(addr, name)],
        { postConditions: [], postConditionMode: PostConditionMode.Allow }
      );
    },
    sellKeysWithToken: (amount: number | bigint, minPrice: number | bigint, tokenContractId: string) => {
      const [addr, name] = (tokenContractId || '').split('.');
      if (!addr || !name) throw new Error(`Invalid token contract id: ${tokenContractId}`);
      return call('sell-keys', [uintCV(amount as any), uintCV(minPrice as any), contractPrincipalCV(addr, name)]);
    },
  };
}


