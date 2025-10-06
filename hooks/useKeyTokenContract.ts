import { openContractCall } from '@stacks/connect';
import { fetchCallReadOnlyFunction, uintCV, standardPrincipalCV, contractPrincipalCV, stringAsciiCV, stringUtf8CV, noneCV, someCV, bufferCV, cvToJSON, ClarityValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, KEYTOKEN_NAME, network, getSenderAddress } from './stacks';

export function useKeyTokenContract() {
  const call = async (functionName: string, functionArgs: any[]) => {
    const senderAddress = getSenderAddress();
    if (!senderAddress) throw new Error('Wallet not connected');
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: KEYTOKEN_NAME,
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
      contractName: KEYTOKEN_NAME,
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

  return {
    // SIP-010 read-onlys
    getName: () => ro('get-name'),
    getSymbol: () => ro('get-symbol'),
    getDecimals: () => ro('get-decimals'),
    getTotalSupply: () => ro('get-total-supply'),
    getTokenUri: () => ro('get-token-uri'),
    getBalance: (account: string) => ro('get-balance', [standardPrincipalCV(account)]),
    getAuthorizedMinter: () => ro('get-authorized-minter'),
    getAuthorizedMinterDecoded: () => roDecoded('get-authorized-minter'),

    // transfers
    transfer: (amount: number, sender: string, recipient: string, memo?: Uint8Array) =>
      call('transfer', [
        uintCV(amount),
        standardPrincipalCV(sender),
        standardPrincipalCV(recipient),
        memo ? someCV(bufferCV(memo)) : noneCV(),
      ]),

    // admin
    setTokenMetadata: (name: string, symbol: string, uri?: string) =>
      call('set-token-metadata', [stringAsciiCV(name), stringAsciiCV(symbol), uri ? someCV(stringUtf8CV(uri)) : noneCV()]),
    // Set minter as a standard principal (use only if minter is a user address)
    setAuthorizedMinter: (minter: string) => call('set-authorized-minter', [standardPrincipalCV(minter)]),
    // Set minter as a contract principal (use for KeyVendingMachine)
    setAuthorizedMinterContract: (address: string, name: string) =>
      call('set-authorized-minter', [contractPrincipalCV(address, name)]),

    // minter-only
    mint: (amount: number, recipient: string) => call('mint', [uintCV(amount), standardPrincipalCV(recipient)]),
    burn: (amount: number, owner: string) => call('burn', [uintCV(amount), standardPrincipalCV(owner)]),

    // convenience helpers
    mintToSelf: (amount: number) => {
      const sender = getSenderAddress();
      if (!sender) throw new Error('Wallet not connected');
      return call('mint', [uintCV(amount), standardPrincipalCV(sender)]);
    },
    mintBatch: (items: Array<{ amount: number; recipient: string }>) => {
      // Executes sequentially to preserve clear signing flow in the wallet UI
      return items.reduce<Promise<void>>(async (prev, { amount, recipient }) => {
        await prev;
        await call('mint', [uintCV(amount), standardPrincipalCV(recipient)]);
      }, Promise.resolve());
    },
  };
}


