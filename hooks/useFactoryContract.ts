import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, contractPrincipalCV, stringAsciiCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, FACTORY_NAME, network, getSenderAddress } from './stacks';

export function useFactoryContract() {
  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: FACTORY_NAME,
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
    // Market registration
    registerMarket: (chatRoomId: string, vendingMachine: string, tokenContract: string, creator: string) => {
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
      
      return call('register-market', [
        stringAsciiCV(chatRoomId),
        contractPrincipalCV(vendingAddress, vendingName),
        contractPrincipalCV(tokenAddress, tokenName),
        standardPrincipalCV(creator),
      ])
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
      return v;
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