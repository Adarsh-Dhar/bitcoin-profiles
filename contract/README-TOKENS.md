# One KeyToken Per Creator Architecture

## Overview
This implementation provides **one KeyToken contract per creator**, making each creator's token fully SIP-010 compliant and discoverable by wallets and indexers.

## Architecture

### 1. Factory Contract (`Factory.clar`)
- **Manages** multiple KeyToken instances
- **Assigns** available tokens to creators
- **Tracks** creator-to-token mappings
- **Functions**:
  - `cm()` - Create market (assigns token to creator)
  - `at()` - Register token instances (admin only)
  - `gt()` - Get token by ID
  - `gcm()` - Get creator's market

### 2. KeyToken Instances
- **Multiple contracts**: `KeyToken1`, `KeyToken2`, `KeyToken3`, etc.
- **SIP-010 compliant** with standard functions:
  - `get-name`, `get-symbol`, `get-decimals`
  - `get-balance`, `get-total-supply`
  - `transfer`, `mint`, `burn`
- **Creator-specific** metadata and authorization

### 3. KeyVendingMachine
- **Works with** any KeyToken instance
- **Dynamically calls** the assigned token contract
- **Maintains** bonding curve pricing

## Deployment Process

### Step 1: Deploy Core Contracts
```bash
clarinet deployment generate --testnet --low-cost
clarinet deployment apply -p deployments/default.testnet-plan.yaml
```

### Step 2: Deploy KeyToken Instances
```bash
# Deploy individual tokens
clarinet deployment generate --testnet --low-cost
# Add KeyToken1, KeyToken2, KeyToken3 to deployment plan
clarinet deployment apply -p deployments/default.testnet-plan.yaml
```

### Step 3: Register Tokens with Factory
```bash
node register-tokens.js
```

### Step 4: Initialize Contracts
```bash
# Initialize Factory owner
clarinet call Factory init-owner

# Initialize each KeyToken owner
clarinet call KeyToken1 init-owner
clarinet call KeyToken2 init-owner
clarinet call KeyToken3 init-owner
```

## Usage Flow

### For Creators:
1. **Call** `Factory.cm(name, symbol, uri)` to create market
2. **Factory assigns** next available KeyToken instance
3. **Creator gets** their own SIP-010 compliant token
4. **Wallets/indexers** can discover and interact with the token

### For Buyers:
1. **Buy keys** through KeyVendingMachine
2. **Receive** creator-specific tokens
3. **Transfer** tokens using standard SIP-010 functions
4. **View** in any SIP-010 compatible wallet

## Benefits

✅ **SIP-010 Compliance** - Each token works with standard wallets  
✅ **Discoverability** - Indexers can find all tokens  
✅ **Isolation** - Each creator has their own token contract  
✅ **Scalability** - Can deploy 100+ token instances  
✅ **Standard Interface** - No custom wallet integration needed  

## Token Management

- **Pre-deploy** multiple KeyToken instances
- **Factory manages** assignment to creators
- **Automatic rotation** when tokens are assigned
- **Admin controls** for token registration

This architecture provides the "one token per creator" pattern while working within Stacks' contract deployment limitations.
