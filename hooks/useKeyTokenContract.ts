import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, contractPrincipalCV, stringAsciiCV, stringUtf8CV, noneCV, someCV, bufferCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, KEYTOKEN_TEMPLATE_NAME, network, getSenderAddress } from './stacks';

export function useKeyTokenContract() {
  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: KEYTOKEN_TEMPLATE_NAME,
      functionName,
      functionArgs,
      network,
      appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
      postConditions: [], // Disable automatic post-conditions to avoid abort_by_post_condition
      onFinish: () => {},
    });
  };

  const ro = async (functionName: string, functionArgs: any[] = []) => {
    const senderAddress = getSenderAddress();
    return fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: KEYTOKEN_TEMPLATE_NAME,
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

  // Robust extractor for uint values from cvToJSON outputs (handles response/option/tuple nesting)
  const extractUint = (json: any): bigint | undefined => {
    if (json == null) return undefined;
    if (typeof json === 'bigint') return json;
    if (typeof json === 'number') return BigInt(json);
    if (typeof json === 'string') {
      // cvToJSON usually returns decimals as strings
      if (/^\d+$/.test(json)) return BigInt(json);
      // sometimes repr strings like 'u123'
      const m = /^u(\d+)$/.exec(json);
      if (m) return BigInt(m[1]);
    }
    if (typeof json === 'object') {
      if (json.type === 'uint' && json.value != null) {
        return extractUint(json.value);
      }
      // unwrap common wrappers
      if ('value' in json) {
        const inner = (json as any).value;
        const got = extractUint(inner);
        if (got !== undefined) return got;
      }
      // scan nested fields (tuples, responses, options)
      for (const key of Object.keys(json)) {
        if (key === 'type') continue;
        const got = extractUint((json as any)[key]);
        if (got !== undefined) return got;
      }
    }
    return undefined;
  };

  return {
    // SIP-010 read-onlys
    getName: () => ro('get-name'),
    getSymbol: () => ro('get-symbol'),
    getDecimals: () => ro('get-decimals'),
    getTotalSupply: () => ro('get-total-supply'),
    getTokenUri: () => ro('get-token-uri'),
    getBalance: (account: string) => ro('get-balance', [standardPrincipalCV(account)]),

    // decoded helpers (return plain values)
    getNameDecoded: async () => {
      const v = await roDecoded('get-name');
      // unwrap common shapes to plain string
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof (v as any).value === 'string') return (v as any).value;
      return String(v);
    },
    getSymbolDecoded: async () => {
      const v = await roDecoded('get-symbol');
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof (v as any).value === 'string') return (v as any).value;
      return String(v);
    },
    getTotalSupplyDecoded: async () => {
      const v = await roDecoded('get-total-supply');
      const n = extractUint(v);
      return n ?? BigInt(0);
    },
    getBalanceDecoded: async (account: string) => {
      const v = await roDecoded('get-balance', [standardPrincipalCV(account)]);
      const n = extractUint(v);
      return n ?? BigInt(0);
    },

    // transfers
    transfer: (amount: number, sender: string, recipient: string, memo?: Uint8Array) =>
      call('transfer', [
        uintCV(amount),
        standardPrincipalCV(sender),
        standardPrincipalCV(recipient),
        memo ? someCV(bufferCV(memo)) : noneCV(),
      ]),

    // admin - only contract owner can authorize minter
    authorizeCallerAsMinter: () => call('authorize-caller-as-minter', []),

    // minter-only - recipient is always tx-sender in the contract
    mint: (amount: number) => call('mint', [uintCV(amount)]),
    burn: (amount: number) => call('burn', [uintCV(amount)]),

    // convenience helpers
    mintToSelf: (amount: number) => {
      return call('mint', [uintCV(amount)]);
    },
  };
}


