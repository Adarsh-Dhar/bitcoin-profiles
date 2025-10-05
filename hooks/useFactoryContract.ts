import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, stringAsciiCV, stringUtf8CV, noneCV, someCV, boolCV, standardPrincipalCV, uintCV } from '@stacks/transactions';
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

  return {
    createMarket: (name: string, symbol: string, uri?: string) =>
      call('create-market', [
        stringAsciiCV(name),
        stringAsciiCV(symbol),
        uri ? someCV(stringUtf8CV(uri)) : noneCV(),
      ]),

    getCreatorMarket: (creator: string) => ro('get-creator-market', [standardPrincipalCV(creator)]),
    getMarketCreator: (marketId: number) => ro('get-market-creator', [uintCV(marketId)]),
    getMarketCount: () => ro('get-market-count'),
    hasMarket: (creator: string) => ro('has-market', [standardPrincipalCV(creator)]),

    setProtocolTreasury: (principal: string) => call('set-protocol-treasury', [standardPrincipalCV(principal)]),
    setTemplates: (tokenTemplate: string, vendingTemplate: string) =>
      call('set-templates', [standardPrincipalCV(tokenTemplate), standardPrincipalCV(vendingTemplate)]),
    setPaused: (paused: boolean) => call('set-paused', [boolCV(paused)]),
    getPaused: () => ro('get-paused'),
  };
}


