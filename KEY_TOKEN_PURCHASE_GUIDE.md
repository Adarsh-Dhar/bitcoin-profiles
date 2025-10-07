# 🔑 Key Token Purchase Guide - 3-Step Process

This guide explains how to implement the 3-step process for buying key tokens with proper error handling in your Bitcoin Profiles application.

## Overview

The key token purchase process follows a simple 3-step pattern:

1. **Look up the market** for your chat room ID
2. **Check the price** before buying
3. **Buy the keys** with proper error handling

## Implementation

### 1. Hook: `useMarketOperations`

The main hook that provides all the functionality for the 3-step process:

```typescript
import { useMarketOperations } from '@/hooks/useMarketOperations'

const { 
  getMarketForChatRoom, 
  calculateBuyPrice, 
  buyKeysForChatRoom,
  buyKeysWithFullProcess,
  getMarketInfo 
} = useMarketOperations()
```

### 2. Step-by-Step Implementation

#### Step 1: Look up the market for your chat room ID

```javascript
const market = await getMarketForChatRoom('gaming-lounge');
// Returns: { vendingMachine, tokenContract, creator }
```

**Error Handling:**
- Validates chat room ID exists
- Checks if market is registered
- Provides clear error messages for missing markets

#### Step 2: Check the price before buying

```javascript
const price = await calculateBuyPrice(market.vendingMachine, 10);
// Returns: price in microSTX
```

**Error Handling:**
- Validates vending machine contract identifier
- Ensures price calculation is valid (> 0)
- Handles contract call failures gracefully

#### Step 3: Buy the keys

```javascript
await buyKeysForChatRoom('gaming-lounge', 10, yourPrivateKey);
// Buys 10 keys for the gaming-lounge chat room
```

**Error Handling:**
- Validates wallet connection
- Checks amount is valid (> 0)
- Implements 2% slippage protection
- Provides detailed error messages
- Shows user-friendly toast notifications

### 3. Complete Process (All Steps Combined)

For convenience, you can execute all three steps in one call:

```javascript
const result = await buyKeysWithFullProcess('gaming-lounge', 10);
// Returns: { success: boolean, transactionId?: string, error?: string }
```

## Usage Examples

### Basic Usage

```typescript
import { useMarketOperations } from '@/hooks/useMarketOperations'

function MyComponent() {
  const { buyKeysWithFullProcess } = useMarketOperations()
  
  const handleBuyKeys = async () => {
    const result = await buyKeysWithFullProcess('gaming-lounge', 10)
    
    if (result.success) {
      console.log('Keys purchased successfully!')
    } else {
      console.error('Purchase failed:', result.error)
    }
  }
  
  return <button onClick={handleBuyKeys}>Buy 10 Keys</button>
}
```

### Step-by-Step Usage

```typescript
import { useMarketOperations } from '@/hooks/useMarketOperations'

function MyComponent() {
  const { getMarketForChatRoom, calculateBuyPrice, buyKeysForChatRoom } = useMarketOperations()
  
  const handleStepByStep = async () => {
    try {
      // Step 1: Look up market
      const market = await getMarketForChatRoom('gaming-lounge')
      console.log('Market found:', market)
      
      // Step 2: Calculate price
      const price = await calculateBuyPrice(market.vendingMachine, 10)
      console.log('Price calculated:', price)
      
      // Step 3: Buy keys
      const result = await buyKeysForChatRoom('gaming-lounge', 10)
      console.log('Purchase result:', result)
      
    } catch (error) {
      console.error('Process failed:', error)
    }
  }
  
  return <button onClick={handleStepByStep}>Buy Keys Step by Step</button>
}
```

### Getting Market Information

```typescript
import { useMarketOperations } from '@/hooks/useMarketOperations'

function MyComponent() {
  const { getMarketInfo } = useMarketOperations()
  
  const loadMarketInfo = async () => {
    try {
      const info = await getMarketInfo('gaming-lounge')
      console.log('Market info:', info)
      // Returns: { market, priceForOne, priceFormatted }
    } catch (error) {
      console.error('Failed to load market info:', error)
    }
  }
  
  return <button onClick={loadMarketInfo}>Load Market Info</button>
}
```

## Error Handling

The implementation includes comprehensive error handling for:

### Wallet Connection Errors
- Checks if wallet is connected
- Provides clear error messages
- Guides user to connect wallet

### Market Lookup Errors
- Validates chat room ID format
- Checks if market exists
- Handles contract call failures

### Price Calculation Errors
- Validates vending machine contract
- Ensures price is valid (> 0)
- Handles calculation failures

### Purchase Errors
- Validates all prerequisites
- Implements slippage protection
- Provides detailed error messages
- Shows user-friendly notifications

## UI Components

### KeyPurchaseExample Component

A complete example component that demonstrates the 3-step process:

```typescript
import { KeyPurchaseExample } from '@/components/key-purchase-example'

function MyPage() {
  return (
    <div>
      <h1>Key Token Purchase</h1>
      <KeyPurchaseExample 
        defaultChatRoomId="gaming-lounge"
        defaultAmount={10}
      />
    </div>
  )
}
```

### Features:
- Interactive step-by-step execution
- Real-time status updates
- Results display
- Error handling
- Complete process execution

## Integration with Marketplace

The marketplace page has been updated to use the new 3-step process:

- **Enhanced UI**: Shows loading states and market information
- **Price Display**: Shows current key prices for each chat room
- **Error Handling**: Comprehensive error handling with user feedback
- **Status Tracking**: Tracks which room is being purchased

## Best Practices

1. **Always check wallet connection** before starting the process
2. **Validate inputs** (chat room ID, amount) before making calls
3. **Handle errors gracefully** with user-friendly messages
4. **Show loading states** during async operations
5. **Use the complete process** for simple purchases
6. **Use step-by-step** for complex workflows or debugging

## API Reference

### `useMarketOperations()` Hook

#### Methods

- `getMarketForChatRoom(chatRoomId: string): Promise<MarketData>`
- `calculateBuyPrice(vendingMachine: string, amount: number | bigint): Promise<bigint>`
- `buyKeysForChatRoom(chatRoomId: string, amount: number | bigint, privateKey?: string): Promise<BuyResult>`
- `buyKeysWithFullProcess(chatRoomId: string, amount: number | bigint): Promise<BuyResult>`
- `getMarketInfo(chatRoomId: string): Promise<MarketInfo>`

#### Types

```typescript
interface MarketData {
  vendingMachine: string
  tokenContract: string
  creator: string
}

interface BuyResult {
  success: boolean
  transactionId?: string
  error?: string
}

interface MarketInfo {
  market: MarketData
  priceForOne: bigint
  priceFormatted: string
}
```

## Troubleshooting

### Common Issues

1. **"Wallet not connected"**
   - Ensure user has connected their wallet
   - Check wallet connection status

2. **"No market found for chat room"**
   - Verify chat room ID is correct
   - Check if market is registered

3. **"Invalid price calculated"**
   - Check vending machine contract is valid
   - Verify contract is properly deployed

4. **"Purchase failed"**
   - Check wallet has sufficient STX
   - Verify all prerequisites are met
   - Check transaction parameters

### Debug Mode

Enable debug logging by checking the browser console. All operations log detailed information for troubleshooting.

## Conclusion

The 3-step key token purchase process provides a robust, user-friendly way to buy keys with comprehensive error handling. The implementation follows best practices for blockchain interactions and provides clear feedback to users throughout the process.
