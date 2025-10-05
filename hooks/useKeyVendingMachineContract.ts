import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, VENDING_NAME, network, getSenderAddress } from './stacks';

export function useKeyVendingMachineContract() {
  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    try {
      // Helpful runtime logging for debugging contract identity
      // eslint-disable-next-line no-console
      console.log('[contract:call]', {
        contract: `${CONTRACT_ADDRESS}.${VENDING_NAME}`,
        functionName,
        network: (network as any)?.url || (network as any)?.coreApiUrl,
      });
    } catch {}
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
    try {
      // eslint-disable-next-line no-console
      console.log('[contract:ro]', {
        contract: `${CONTRACT_ADDRESS}.${VENDING_NAME}`,
        functionName,
        senderAddress: senderAddress || CONTRACT_ADDRESS,
        network: (network as any)?.url || (network as any)?.coreApiUrl,
      });
    } catch {}
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: VENDING_NAME,
      functionName,
      functionArgs,
      network,
      senderAddress: senderAddress || CONTRACT_ADDRESS,
    });
    return result;
  };

  const roDecoded = async (functionName: string, functionArgs: any[] = []) => {
    const cv: ClarityValue = await ro(functionName, functionArgs);
    const json = cvToJSON(cv);
    // cvToJSON returns { type, value } where value can be a map/object of fields
    return json?.value as any;
  };

  return {
    // init/admin
    initialize: (creator: string, treasury: string, tokenContract: string) =>
      call('initialize', [standardPrincipalCV(creator), standardPrincipalCV(treasury), standardPrincipalCV(tokenContract)]),
    setProtocolTreasury: (treasury: string) => call('set-protocol-treasury', [standardPrincipalCV(treasury)]),

    // pricing read-onlys (decoded to plain JSON values)
    getCurrentSupply: () => roDecoded('get-current-supply'),
    calculatePriceAtSupply: (supply: number | bigint) => roDecoded('calculate-price-at-supply', [uintCV(supply as any)]),
    getBuyPrice: (amount: number | bigint) => roDecoded('get-buy-price', [uintCV(amount as any)]),
    getSellPrice: (amount: number | bigint) => roDecoded('get-sell-price', [uintCV(amount as any)]),

    // trading
    buyKeys: (amount: number | bigint, maxPrice: number | bigint) =>
      call('buy-keys', [uintCV(amount as any), uintCV(maxPrice as any)]),
    sellKeys: (amount: number | bigint, minPayout: number | bigint) =>
      call('sell-keys', [uintCV(amount as any), uintCV(minPayout as any)]),
  };
}


