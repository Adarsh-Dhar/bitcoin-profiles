import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, contractPrincipalCV, stringAsciiCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, FACTORY_NAME, network, getSenderAddress } from './stacks';

export function useFactoryContract() {
  const call = async (functionName: string, functionArgs: any[]): Promise<string> => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    // Log low-level contract invocation with decoded clarity values for debugging
    try {
      const decodedArgs = (functionArgs || []).map((a: any) => {
        try { return cvToJSON(a); } catch { return a; }
      });
      console.log('[Factory.call] invoking', {
        contractAddress: CONTRACT_ADDRESS,
        contractName: FACTORY_NAME,
        functionName,
        args: decodedArgs,
        network,
        senderAddress,
      });
    } catch {}
    return new Promise<string>((resolve, reject) => {
      void openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: FACTORY_NAME,
        functionName,
        functionArgs,
        network,
        appDetails: { name: 'Bitcoin Profiles', icon: `${window.location.origin}/placeholder-logo.png` },
        postConditions: [], // Disable automatic post-conditions to avoid abort_by_post_condition
        onFinish: (data: any) => {
          try {
            const txId = data?.txId ?? data?.txid ?? data?.txID;
            if (!txId || typeof txId !== 'string') {
              reject(new Error('Transaction submitted but txId was not returned'));
              return;
            }
            resolve(txId);
          } catch (err) {
            reject(err as Error);
          }
        },
        onCancel: () => reject(new Error('User cancelled the transaction')),
      } as any);
    });
  };

  const ro = async (functionName: string, functionArgs: any[] = []) => {
    const senderAddress = getSenderAddress();
    return fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: FACTORY_NAME,
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
    // High-level helper that builds contract principals from wallet base address
    generateMarket: async (
      chatRoomId: string,
      vendingMachine: string,
      tokenContract: string,
      creatorAddress?: string,
    ): Promise<string> => {
      const senderAddress = getSenderAddress();
      if (!senderAddress) throw new Error('Wallet not connected');

      // Validate chatRoomId
      if (!chatRoomId || typeof chatRoomId !== 'string' || chatRoomId.trim().length === 0) {
        throw new Error('Invalid chatRoomId: must be a non-empty string');
      }

      // Normalize contract identifiers using the wallet address as base when only names are provided
      const normalizeContractId = (value: string, baseAddress: string): { address: string; name: string; id: string } => {
        if (!value || typeof value !== 'string') {
          throw new Error('Invalid contract identifier: expected a string');
        }
        const trimmed = value.trim();
        // If only a name is provided, prefix with base address
        if (!trimmed.includes('.')) {
          if (!/^[-_a-zA-Z0-9]+$/.test(trimmed)) {
            throw new Error(`Invalid contract name: ${trimmed}`);
          }
          return { address: baseAddress, name: trimmed, id: `${baseAddress}.${trimmed}` };
        }
        const [address, name] = trimmed.split('.');
        if (!address || !name) throw new Error(`Invalid contract identifier: ${value}`);
        if (!/^SP[0-9A-Z]+/.test(address)) {
          // Accept subnets or test ids too, but give a clear error for obviously wrong addresses
          throw new Error(`Invalid contract address: ${address}`);
        }
        if (!/^[-_a-zA-Z0-9]+$/.test(name)) throw new Error(`Invalid contract name: ${name}`);
        return { address, name, id: `${address}.${name}` };
      };

      const creator = (creatorAddress && creatorAddress.trim().length > 0) ? creatorAddress : senderAddress;

      const vending = normalizeContractId(vendingMachine, senderAddress);
      const token = normalizeContractId(tokenContract, senderAddress);

      // High-level parameter logging
      console.log('[Factory.generateMarket] params', {
        chatRoomId,
        vendingMachineInput: vendingMachine,
        tokenContractInput: tokenContract,
        normalizedVending: vending.id,
        normalizedToken: token.id,
        creator,
        senderAddress,
      });

      // Perform the actual registration call and return txId to allow gating chat-room creation on success
      const arg0 = stringAsciiCV(chatRoomId);
      const arg1 = contractPrincipalCV(vending.address, vending.name);
      const arg2 = contractPrincipalCV(token.address, token.name);
      try {
        console.log('[Factory.generateMarket] clarity args', {
          arg0: cvToJSON(arg0),
          arg1: cvToJSON(arg1),
          arg2: cvToJSON(arg2),
        });
      } catch {}
      // register-market takes exactly (chat-room-id, vending-machine, token-contract)
      const txId = await call('register-market', [arg0, arg1, arg2]);

      return txId;
    },

    // Market registration
    // `creator` is accepted for backwards compatibility but not sent; contract uses tx-sender
    registerMarket: (chatRoomId: string, vendingMachine: string, tokenContract: string, creator?: string): Promise<string> => {
      // Parse the contract identifiers to extract address and name
      const [vendingAddress, vendingName] = vendingMachine.split('.')
      const [tokenAddress, tokenName] = tokenContract.split('.')
      
      // Debug logging to identify which contract is invalid
      console.log('Market registration parameters:')
      console.log('- chatRoomId:', chatRoomId)
      console.log('- vendingMachine:', vendingMachine)
      console.log('- vendingAddress:', vendingAddress)
      console.log('- vendingName:', vendingName)
      console.log('- tokenContract:', tokenContract)
      console.log('- tokenAddress:', tokenAddress)
      console.log('- tokenName:', tokenName)
      console.log('- creator:', creator)
      
      // Validate contract identifiers
      if (!vendingAddress || !vendingName) {
        throw new Error(`Invalid vending machine contract identifier: ${vendingMachine}`)
      }
      if (!tokenAddress || !tokenName) {
        throw new Error(`Invalid token contract identifier: ${tokenContract}`)
      }
      
      const a0 = stringAsciiCV(chatRoomId)
      const a1 = contractPrincipalCV(vendingAddress, vendingName)
      const a2 = contractPrincipalCV(tokenAddress, tokenName)
      try {
        console.log('[Factory.registerMarket] clarity args', {
          a0: cvToJSON(a0),
          a1: cvToJSON(a1),
          a2: cvToJSON(a2),
        })
      } catch {}
      // register-market takes exactly (chat-room-id, vending-machine, token-contract)
      return call('register-market', [a0, a1, a2])
    },

    // Read-only functions
    getMarket: (chatRoomId: string) => ro('get-market', [stringAsciiCV(chatRoomId)]),
    getMarketByVendingMachine: (vendingMachine: string) => ro('get-market-by-vending-machine', [standardPrincipalCV(vendingMachine)]),
    hasMarket: (chatRoomId: string) => ro('has-market', [stringAsciiCV(chatRoomId)]),
    getTotalMarkets: () => ro('get-total-markets'),
    isRegisteredVendingMachine: (contract: string) => ro('is-registered-vending-machine', [standardPrincipalCV(contract)]),

    // Decoded helpers
    getMarketDecoded: async (chatRoomId: string) => {
      const v = await roDecoded('get-market', [stringAsciiCV(chatRoomId)]);
      // cvToJSON shapes vary; unwrap until we reach the map payload or conclude it's none
      const unwrap = (input: any): any => {
        if (input == null) return undefined;
        // Handle shorthand option { none: true } | { some: {...} }
        if (typeof input === 'object' && ('none' in input || 'some' in input)) {
          if ((input as any).none === true) return undefined;
          return unwrap((input as any).some);
        }
        // Handle { type: 'optional-none' } | { type: 'optional-some', value: {...} }
        if (typeof input === 'object' && typeof (input as any).type === 'string' && (input as any).type.startsWith('optional')) {
          const t = String((input as any).type).toLowerCase();
          if (t.includes('none')) return undefined;
          return unwrap((input as any).value);
        }
        // Handle response wrappers { type: 'responseOk'|'ok', value: X } already removed by roDecoded, but be safe
        if (typeof input === 'object' && typeof (input as any).type === 'string' && (String((input as any).type).toLowerCase().includes('response'))) {
          return unwrap((input as any).value);
        }
        // Some serializers put the payload under .value
        if (typeof input === 'object' && 'value' in input && !(input as any)['vending-machine'] && !(input as any)['token-contract']) {
          return unwrap((input as any).value);
        }
        return input;
      };

      const raw = unwrap(v);
      if (!raw || typeof raw !== 'object') return undefined;

      // Normalize principals from cvToJSON into strings
      const normalizePrincipal = (p: any): string | undefined => {
        if (!p) return undefined;
        if (typeof p === 'string') return p;
        if (typeof p === 'object') {
          // direct { address, name } or { address, contractName }
          const address = (p.address ?? (p.value && p.value.address)) as string | undefined;
          const name = (p.name ?? p.contractName ?? p['contract-name'] ?? (p.value && (p.value.name ?? p.value.contractName ?? p.value['contract-name']))) as string | undefined;
          const standard = (p.standard ?? (p.value && p.value.standard)) as string | undefined;
          if (address && name) return `${address}.${name}`;
          if (address && !name) return address; // standard principal
          if (typeof p.value === 'string') return p.value;
          if (typeof p.principal === 'string') return p.principal;
          if (typeof standard === 'string') return standard;
        }
        return undefined;
      };

      // Normalize possible key shapes from cvToJSON
      const vendingRaw = (raw['vending-machine'] ?? raw['vendingMachine'] ?? raw['vending_machine']);
      const tokenRaw = (raw['token-contract'] ?? raw['tokenContract'] ?? raw['token_contract']);
      const creatorRaw = (raw['creator']);

      const vending = normalizePrincipal(vendingRaw);
      const token = normalizePrincipal(tokenRaw);
      const creator = normalizePrincipal(creatorRaw);

      if (!vending || !token || !creator) return undefined;

      return { vendingMachine: vending, tokenContract: token, creator } as {
        vendingMachine: string;
        tokenContract: string;
        creator: string;
      };
    },
    
    getMarketByVendingMachineDecoded: async (vendingMachine: string) => {
      const v = await roDecoded('get-market-by-vending-machine', [standardPrincipalCV(vendingMachine)]);
      return v;
    },
    
    hasMarketDecoded: async (chatRoomId: string) => {
      const v = await roDecoded('has-market', [stringAsciiCV(chatRoomId)]);
      return v === true || v === 'true' || (typeof v === 'object' && v?.value === true);
    },
    
    getTotalMarketsDecoded: async () => {
      const v = await roDecoded('get-total-markets');
      const n = extractUint(v);
      return n ?? BigInt(0);
    },

    isRegisteredVendingMachineDecoded: async (contract: string) => {
      const v = await roDecoded('is-registered-vending-machine', [standardPrincipalCV(contract)]);
      return v === true || v === 'true' || (typeof v === 'object' && v?.value === true);
    },

    // Admin functions
    unregisterMarket: (chatRoomId: string) =>
      call('unregister-market', [stringAsciiCV(chatRoomId)]),
  };
}