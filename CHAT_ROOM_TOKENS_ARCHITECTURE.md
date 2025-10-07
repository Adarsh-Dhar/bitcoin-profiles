# Chat Room Specific Token Architecture

## Overview

This document describes the new architecture for creating separate KeyToken contracts for each chat room, solving the issue where all chat rooms were sharing the same token supply.

## Problem Solved

**Before**: All chat rooms shared a single KeyToken contract, meaning:
- All chat rooms had the same token supply
- Buying keys in one chat room affected the supply in all chat rooms
- No isolation between different chat room economies

**After**: Each chat room gets its own KeyToken contract:
- Each chat room has independent token supply
- Buying keys in one chat room only affects that chat room
- Complete economic isolation between chat rooms

## Architecture Components

### 1. Factory Contract (`Factory.clar`)

**Purpose**: Manages chat room token creation and deployment

**Key Functions**:
- `create-chat-room-token`: Creates metadata for a new chat room token
- `deploy-chat-room-token`: Requests deployment of a KeyToken contract for a chat room
- `set-chat-room-token`: Sets the deployed KeyToken contract address (admin only)
- `get-chat-room-token`: Gets the KeyToken contract for a specific chat room
- `get-chat-room-metadata`: Gets metadata for a chat room token

**Data Maps**:
- `chat-room-tokens`: Maps chat room ID to KeyToken contract address
- `chat-room-metadata`: Maps chat room ID to token metadata
- `chat-room-creators`: Maps chat room ID to creator address

### 2. KeyToken Template (`KeyTokenTemplate.clar`)

**Purpose**: Simplified KeyToken contract for individual chat rooms

**Key Features**:
- Single chat room per contract
- Simplified mint/burn functions (no creator/chat-room parameters needed)
- Chat room metadata tracking
- Standard SIP-010 compliance

**Key Functions**:
- `initialize-chat-room`: Initialize the token for a specific chat room
- `mint`: Mint tokens (simplified interface)
- `burn`: Burn tokens (simplified interface)
- `get-chat-room-id`: Get the chat room ID for this token
- `get-chat-room-metadata`: Get chat room metadata

### 3. KeyVendingMachine Contract (`KeyVendingMachine.clar`)

**Purpose**: Bonding curve AMM for chat room specific tokens

**Key Changes**:
- Simplified `buy-keys` and `sell-keys` functions (no creator/chat-room parameters)
- Uses chat room ID stored in contract state
- Works with single KeyToken contract per vending machine

**Key Functions**:
- `initialize`: Initialize with creator, treasury, token contract, and chat room ID
- `buy-keys`: Buy keys from the chat room's token
- `sell-keys`: Sell keys back to the chat room's token
- `get-chat-room-supply`: Get supply for the chat room's token

## Frontend Integration

### 1. Factory Hook (`useFactoryContract.ts`)

```typescript
const factory = useFactoryContract();

// Create a new chat room token
await factory.createChatRoomToken(
  'Chat Room 1 Key',
  'CR1KEY',
  undefined, // URI
  1 // chat room ID
);

// Get chat room token contract
const tokenContract = await factory.getChatRoomTokenDecoded(1);
```

### 2. Dynamic KeyToken Hook (`useDynamicKeyTokenContract.ts`)

```typescript
const keyToken = useDynamicKeyTokenContract(
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // contract address
  'KeyTokenTemplate' // contract name
);

// Get token balance
const balance = await keyToken.getBalanceDecoded(userAddress);

// Get chat room ID
const chatRoomId = await keyToken.getChatRoomIdDecoded();
```

### 3. Updated VendingMachine Hook (`useKeyVendingMachineContract.ts`)

```typescript
const vendingMachine = useKeyVendingMachineContract();

// Buy keys (simplified - no creator/chat-room parameters)
await vendingMachine.buyKeys(
  BigInt(1), // amount
  BigInt(1000000) // max price
);
```

### 4. Chat Room Token Manager Component

The `ChatRoomTokenManager` component demonstrates the complete flow:

1. **Check if token exists**: Query factory for chat room token
2. **Create token if needed**: Call `create-chat-room-token`
3. **Load token details**: Get balance, supply, metadata
4. **Enable trading**: Buy/sell keys through vending machine

## Deployment Flow

### 1. Create Chat Room Token

```typescript
// 1. Creator calls factory to create chat room token
await factory.createChatRoomToken(
  'My Chat Room Key',
  'MCRKEY',
  'https://example.com/metadata.json',
  123 // chat room ID
);
```

### 2. Deploy KeyToken Contract

```typescript
// 2. Deploy KeyTokenTemplate contract for this chat room
// (This would typically be done off-chain or through a deployment service)
const tokenContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const tokenContractName = 'KeyTokenTemplate';

// 3. Initialize the deployed contract
await keyToken.initializeChatRoom(
  123, // chat room ID
  'My Chat Room Key',
  'MCRKEY',
  'https://example.com/metadata.json',
  creatorAddress
);

// 4. Set the contract address in factory (admin only)
await factory.setChatRoomToken(123, tokenContractAddress);
```

### 3. Deploy Vending Machine

```typescript
// 5. Deploy and initialize vending machine for this chat room
await vendingMachine.initialize(
  creatorAddress,
  treasuryAddress,
  tokenContractAddress,
  tokenContractName,
  123 // chat room ID
);
```

## Benefits

1. **Economic Isolation**: Each chat room has its own token economy
2. **Scalability**: Can support unlimited chat rooms
3. **Flexibility**: Each chat room can have different token metadata
4. **Simplicity**: Cleaner contract interfaces
5. **Security**: Reduced attack surface per contract

## Migration Strategy

1. **Phase 1**: Deploy new contracts alongside existing ones
2. **Phase 2**: Update frontend to use new architecture
3. **Phase 3**: Migrate existing chat rooms to new system
4. **Phase 4**: Deprecate old multi-creator system

## Example Usage

```typescript
// In a chat room component
function ChatRoomPage({ chatRoomId }: { chatRoomId: number }) {
  return (
    <div>
      <h1>Chat Room {chatRoomId}</h1>
      <ChatRoomTokenManager 
        chatRoomId={chatRoomId} 
        creatorAddress={userAddress} 
      />
    </div>
  );
}
```

This architecture provides complete isolation between chat room economies while maintaining the familiar bonding curve mechanics for each individual chat room.
