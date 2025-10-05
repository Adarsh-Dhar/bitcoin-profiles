import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV } from '@stacks/transactions';
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

  return {
    // init/admin
    initialize: (creator: string, treasury: string, tokenContract: string) =>
      call('initialize', [standardPrincipalCV(creator), standardPrincipalCV(treasury), standardPrincipalCV(tokenContract)]),
    setProtocolTreasury: (treasury: string) => call('set-protocol-treasury', [standardPrincipalCV(treasury)]),

    // pricing read-onlys
    getCurrentSupply: () => ro('get-current-supply'),
    calculatePriceAtSupply: (supply: number) => ro('calculate-price-at-supply', [uintCV(supply)]),
    getBuyPrice: (amount: number) => ro('get-buy-price', [uintCV(amount)]),
    getSellPrice: (amount: number) => ro('get-sell-price', [uintCV(amount)]),

    // trading
    buyKeys: (amount: number, maxPrice: number) => call('buy-keys', [uintCV(amount), uintCV(maxPrice)]),
    sellKeys: (amount: number, minPayout: number) => call('sell-keys', [uintCV(amount), uintCV(minPayout)]),
  };
}


