import { useFactoryContract } from './useFactoryContract';
import { useKeyVendingMachineContract } from './useKeyVendingMachineContract';
import { useDynamicKeyTokenContract } from './useDynamicKeyTokenContract';
import { getSenderAddress } from './stacks';
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
      const vendingMachine = marketData.vendingMachine;
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
      console.log(`Price with 2% slippage buffer: ${maxPrice} microSTX`);

      // Step 3: Execute the purchase
      console.log('Step 3: Executing purchase...');
      
      // Parse vending machine contract identifier
      const [vendingAddress, vendingName] = market.vendingMachine.split('.');
      if (!vendingAddress || !vendingName) {
        throw new Error(`Invalid vending machine contract identifier: ${market.vendingMachine}`);
      }

      // Create vending machine contract instance for the specific market
      const vendingContract = useKeyVendingMachineContract(market.vendingMachine);
      
      // Execute the buy transaction
      await vendingContract.buyKeys(amount, maxPrice);
      
      console.log('Purchase transaction submitted successfully');
      
      return {
        success: true,
        transactionId: `tx-${Date.now()}` // In a real implementation, you'd get this from the transaction response
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
