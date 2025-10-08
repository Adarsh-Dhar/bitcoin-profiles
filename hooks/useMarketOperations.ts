import { useFactoryContract } from './useFactoryContract';
import { useKeyVendingMachineContract } from './useKeyVendingMachineContract';
import { useDynamicKeyTokenContract } from './useDynamicKeyTokenContract';
import { getSenderAddress, network, CONTRACT_ADDRESS, VENDING_NAME } from './stacks';
import { toast } from 'sonner';

interface MarketData {
  vendingMachine: string;
  tokenContract: string;
  creator: string;
}

interface BuyResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export function useMarketOperations() {
  const factory = useFactoryContract();

  // Step 1: Look up the market for your chat room ID
  const getMarketForChatRoom = async (chatRoomId: string): Promise<MarketData> => {
    try {
      console.log(`Looking up market for chat room: ${chatRoomId}`);
      
      // Check if market exists
      const hasMarket = await factory.hasMarketDecoded(chatRoomId);
      if (!hasMarket) {
        throw new Error(`No market found for chat room: ${chatRoomId}`);
      }

      // Get market data
      const marketData = await factory.getMarketDecoded(chatRoomId);
      
      if (!marketData || !marketData.vendingMachine || !marketData.tokenContract || !marketData.creator) {
        throw new Error(`Invalid market data for chat room: ${chatRoomId}`);
      }

      // Extract contract identifiers from the market data
      // Always prefer the current VM constant (v6) to avoid stale registry values
      const vendingMachine = `${CONTRACT_ADDRESS}.${VENDING_NAME}`;
      const tokenContract = marketData.tokenContract;
      const creator = marketData.creator;

      console.log('Market data retrieved:', { vendingMachine, tokenContract, creator });

      return {
        vendingMachine,
        tokenContract,
        creator
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error looking up market:', errorMessage);
      throw new Error(`Failed to look up market for ${chatRoomId}: ${errorMessage}`);
    }
  };

  // Step 2: Check the price before buying
  const calculateBuyPrice = async (vendingMachine: string, amount: number | bigint): Promise<bigint> => {
    try {
      console.log(`Calculating buy price for ${amount} keys from vending machine: ${vendingMachine}`);
      
      // Parse vending machine contract identifier
      const [vendingAddress, vendingName] = vendingMachine.split('.');
      if (!vendingAddress || !vendingName) {
        throw new Error(`Invalid vending machine contract identifier: ${vendingMachine}`);
      }

      // Create vending machine contract instance for the specific market
      const vendingContract = useKeyVendingMachineContract(vendingMachine);
      
      // Calculate the buy price
      const price = await vendingContract.calculateBuyPriceDecoded(amount);
      
      if (price <= 0) {
        throw new Error('Invalid price calculated - price must be greater than 0');
      }

      console.log(`Calculated buy price: ${price} microSTX for ${amount} keys`);
      return price;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error calculating buy price:', errorMessage);
      throw new Error(`Failed to calculate buy price: ${errorMessage}`);
    }
  };

  // Step 3: Buy the keys
  const buyKeysForChatRoom = async (
    chatRoomId: string, 
    amount: number | bigint, 
    privateKey?: string
  ): Promise<BuyResult> => {
    try {
      console.log(`Starting key purchase process for chat room: ${chatRoomId}, amount: ${amount}`);
      
      // Pre-flight checks
      const sender = getSenderAddress();
      if (!sender) {
        throw new Error('Wallet not connected. Please connect your wallet to proceed.');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Step 1: Look up the market
      console.log('Step 1: Looking up market...');
      const market = await getMarketForChatRoom(chatRoomId);
      console.log('Market found:', market);

      // Step 2: Calculate the price
      console.log('Step 2: Calculating price...');
      const price = await calculateBuyPrice(market.vendingMachine, amount);
      console.log('Price calculated:', price);

      // Add 2% slippage buffer for price protection
      const maxPrice = (price * BigInt(102)) / BigInt(100);
      console.log('[Buy] price & maxPrice', {
        priceMicro: price.toString(),
        priceSTX: (Number(price) / 1_000_000).toFixed(6),
        maxPriceMicro: maxPrice.toString(),
        maxPriceSTX: (Number(maxPrice) / 1_000_000).toFixed(6),
      });

      // Step 2.5: Ensure caller has enough STX balance to cover maxPrice + fee buffer
      const apiBase = (network as any)?.coreApiUrl || (network as any)?.url || 'https://api.testnet.hiro.so';
      const base = apiBase.replace(/\/$/, '');
      const endpoints = [
        `${base}/extended/v1/address/${sender}/balances`,
        `${base}/v2/accounts/${sender}?proof=0`,
      ];
      try {
        const [r1, r2] = await Promise.all(
          endpoints.map((u) => fetch(u).catch(() => new Response(null, { status: 599 } as any)))
        );
        let bal1 = BigInt(0);
        if (r1 && r1.ok) {
          const j = await r1.json();
          const s = j?.stx?.balance as string | undefined;
          if (s && /^\d+$/.test(s)) bal1 = BigInt(s);
        }
        let bal2 = BigInt(0);
        if (r2 && r2.ok) {
          const j = await r2.json();
          const s = (j?.balance as string | undefined) || (j?.stx?.balance as string | undefined);
          if (s && /^\d+$/.test(s)) bal2 = BigInt(s);
        }
        const stxBalance = bal1 > bal2 ? bal1 : bal2;
        // Use a conservative network fee buffer (0.1 STX)
        const required = maxPrice + BigInt(100_000);
        console.log('[Buy] balance check', {
          stxBalanceMicro: stxBalance.toString(),
          stxBalanceSTX: (Number(stxBalance) / 1_000_000).toFixed(6),
          requiredMicro: required.toString(),
          requiredSTX: (Number(required) / 1_000_000).toFixed(6),
        });
        if (stxBalance < required) {
          const toStx = (v: bigint) => (Number(v) / 1_000_000).toFixed(6);
          throw new Error(
            `Insufficient STX balance. Required ~${toStx(required)} STX, available ${toStx(stxBalance)} STX.`
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[Buy] Preflight STX balance check failed:', msg);
        throw new Error(msg || 'Failed STX balance preflight');
      }

      // Inspect vending machine on-chain state before executing the purchase
      const vendingContract = useKeyVendingMachineContract(market.vendingMachine);
      try {
        const vmInfo = await vendingContract.getMarketInfo();
        console.log('[Buy] vending get-market-info', vmInfo);
      } catch (e) {
        console.warn('[Buy] vending get-market-info failed (non-blocking)', e);
      }

      // Step 3: Execute the purchase
      console.log('Step 3: Executing purchase...', {
        vendingMachine: market.vendingMachine,
        amount: amount.toString(),
        maxPriceMicro: maxPrice.toString(),
      });
      
      // Parse vending machine contract identifier
      const [vendingAddress, vendingName] = market.vendingMachine.split('.');
      if (!vendingAddress || !vendingName) {
        throw new Error(`Invalid vending machine contract identifier: ${market.vendingMachine}`);
      }

      // Create vending machine contract instance for the specific market (already created above)

      // Execute the buy transaction against v6 signature with token principal
      const txId = await vendingContract.buyKeysWithToken(amount, maxPrice, market.tokenContract);
      console.log('[Buy] submitted', { txId });

      // Wait for confirmation and log the result/err
      if (txId) {
        const receipt = await waitForTx(txId);
        const status = receipt?.tx_status;
        const resultRepr: string | undefined = receipt?.tx_result?.repr;
        const errMatch = typeof resultRepr === 'string' ? /\(err u(\d+)\)/.exec(resultRepr) : null;
        const errCode = errMatch ? Number(errMatch[1]) : undefined;

        console.log('[Buy] receipt', {
          txId,
          status,
          resultRepr,
          contract_call: receipt?.contract_call,
          events_count: receipt?.events?.length,
        });

        if (status !== 'success') {
          const msg = errCode != null ? `Contract error u${errCode}` : `Tx failed: ${status}`;
          throw new Error(msg);
        }
      }

      console.log('Purchase transaction completed successfully');
      return {
        success: true,
        transactionId: txId || `tx-${Date.now()}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error buying keys:', errorMessage);
      
      // Show user-friendly error message
      toast.error(`Failed to buy keys: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Helper: wait for a tx and return the full receipt (logs/err codes)
  async function waitForTx(txId: string, timeoutMs = 180_000) {
    const apiBase = (network as any)?.coreApiUrl || (network as any)?.url || 'https://api.testnet.hiro.so';
    const url = `${apiBase.replace(/\/$/, '')}/extended/v1/tx/${txId}`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          const status = j?.tx_status;
          if (status && status !== 'pending') {
            return j;
          }
        }
      } catch {}
      await new Promise((res) => setTimeout(res, 2000));
    }
    throw new Error(`Timeout waiting for tx ${txId}`);
  }

  // Convenience method that combines all three steps with comprehensive error handling
  const buyKeysWithFullProcess = async (
    chatRoomId: string, 
    amount: number | bigint
  ): Promise<BuyResult> => {
    try {
      console.log(`Starting full key purchase process for chat room: ${chatRoomId}`);
      
      // Validate inputs
      if (!chatRoomId || chatRoomId.trim() === '') {
        throw new Error('Chat room ID is required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Check wallet connection
      const sender = getSenderAddress();
      if (!sender) {
        throw new Error('Please connect your wallet to buy keys');
      }

      console.log(`Wallet connected: ${sender}`);

      // Execute the 3-step process
      const result = await buyKeysForChatRoom(chatRoomId, amount);
      
      if (result.success) {
        toast.success(`Successfully purchased ${amount} keys for ${chatRoomId}!`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in full key purchase process:', errorMessage);
      
      toast.error(`Key purchase failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Helper method to get market info without buying
  const getMarketInfo = async (chatRoomId: string) => {
    try {
      const market = await getMarketForChatRoom(chatRoomId);
      const price = await calculateBuyPrice(market.vendingMachine, 1);
      
      return {
        market,
        priceForOne: price,
        priceFormatted: `${(Number(price) / 1000000).toFixed(6)} STX`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get market info: ${errorMessage}`);
    }
  };

  return {
    getMarketForChatRoom,
    calculateBuyPrice,
    buyKeysForChatRoom,
    buyKeysWithFullProcess,
    getMarketInfo
  };
}
