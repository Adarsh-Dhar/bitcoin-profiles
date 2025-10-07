# Multi-Creator KeyToken Architecture

## Overview
**One KeyToken contract handles all creators** with creator-specific metadata tracking. This provides SIP-010 compliance while supporting unlimited creators without manual contract deployment.

## Architecture

### 1. KeyToken Contract (`KeyToken.clar`)
- **Single contract** handles all creators
- **Creator metadata maps** track creator info per holder
- **SIP-010 compliant** with standard functions
- **Functions**:
  - `m(amount, recipient, creator)` - Mint tokens for specific creator
  - `sc(holder, creator)` - Set creator for holder
  - `sci(creator, name, symbol)` - Set creator info
  - `gcm(holder)` - Get creator for holder
  - `gcrn(creator)` - Get creator name
  - `gcrs(creator)` - Get creator symbol
  - `gcrb(creator)` - Get creator balance

### 2. Factory Contract (`Factory.clar`)
- **Manages** creator markets
- **Assigns** creator metadata to KeyToken
- **Tracks** creator-to-market mappings
- **Functions**:
  - `cm(name, symbol, uri)` - Create market for creator
  - `st(token)` - Set KeyToken contract address
  - `gm(id)` - Get market info

### 3. KeyVendingMachine Contract
- **Works with** single KeyToken contract
- **Passes creator context** to mint/burn functions
- **Maintains** bonding curve pricing per creator

## How It Works

### For Creators:
1. **Call** `Factory.cm(name, symbol, uri)` to create market
2. **Factory calls** `KeyToken.sci(creator, name, symbol)` to set creator info
3. **Creator gets** their own token context within shared contract
4. **All tokens** are SIP-010 compliant and discoverable

### For Buyers:
1. **Buy keys** through KeyVendingMachine
2. **Receive** creator-specific tokens with metadata
3. **Transfer** tokens using standard SIP-010 functions
4. **View** in any SIP-010 compatible wallet

## Benefits

✅ **Single Contract** - No manual deployment for each creator  
✅ **Unlimited Creators** - Add as many as you want dynamically  
✅ **SIP-010 Compliant** - Works with all standard wallets  
✅ **Cost Effective** - Only 3 contracts total  
✅ **Creator Context** - Each creator has their own token metadata  
✅ **Scalable** - No deployment limits  

## Deployment

```bash
# Deploy all contracts
clarinet deployment generate --testnet --low-cost
clarinet deployment apply -p deployments/default.testnet-plan.yaml

# Initialize contracts
clarinet call Factory init-owner
clarinet call KeyToken init-owner
clarinet call KeyVendingMachine init-owner

# Set KeyToken address in Factory
clarinet call Factory st --args 'ST3TAJ5G6N40MG8TDXYMXQ4TTH4YAB8KVVP4PTGF4.KeyToken'

# Set authorized minter in KeyToken
clarinet call KeyToken sam --args 'ST3TAJ5G6N40MG8TDXYMXQ4TTH4YAB8KVVP4PTGF4.KeyVendingMachine'
```

## Usage Example

```bash
# Creator creates market
clarinet call Factory cm --args '"AliceKey" "ALICE" none'

# Buyer buys keys (KeyVendingMachine handles creator context)
clarinet call KeyVendingMachine bk --args '10 1000000 123'

# Check creator info
clarinet call KeyToken gcrn --args 'ST3TAJ5G6N40MG8TDXYMXQ4TTH4YAB8KVVP4PTGF4'
```

This architecture provides the "one token per creator" functionality while being practical and scalable!
