# Contract Tests

This directory contains comprehensive tests for the Bitcoin Profiles smart contracts.

## Test Files

- `key-vending-machine.test.ts` - Tests for the KeyVendingMachine contract (market logic, bonding curve)
- `key-token.test.ts` - Tests for the KeyToken contract (SIP-10 fungible token)
- `factory.test.ts` - Tests for the Factory contract (deployment management)

## Quick Start

```bash
# Run all tests
npm test

# Run specific contract tests
npm run test:vending
npm run test:token
npm run test:factory

# Run with coverage
npm run test:report

# Watch mode (re-runs on changes)
npm run test:watch
```

## Test Coverage

Each test file covers:

### KeyVendingMachine
- ✅ Contract initialization and configuration
- ✅ Bonding curve price calculations
- ✅ Buy keys functionality with fee distribution
- ✅ Sell keys functionality with treasury management
- ✅ Authorization and access controls
- ✅ Error handling and edge cases
- ✅ Read-only functions and market info

### KeyToken
- ✅ Token authorization and minter setup
- ✅ Mint and burn operations
- ✅ Transfer functionality
- ✅ SIP-10 compliance
- ✅ Error handling and validations
- ✅ Read-only metadata functions

### Factory
- ✅ Contract deployment
- ✅ Room ID management
- ✅ Owner-only access controls
- ✅ Error handling for invalid inputs

## Running Individual Tests

You can run individual test functions using Deno directly:

```bash
# Run a specific test function
deno test --allow-read --allow-net tests/key-vending-machine.test.ts --filter "Buy Keys Success"

# Run with verbose output
deno test --allow-read --allow-net tests/ --log-level=debug
```

## Test Structure

Each test follows this pattern:

```typescript
Clarinet.test({
  name: "Descriptive test name",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Setup
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    
    // Execute
    let block = chain.mineBlock([
      Tx.contractCall(/* ... */)
    ]);
    
    // Assert
    block.receipts[0].result.expectOk().expectBool(true);
  }
});
```

## Debugging

For debugging specific scenarios, use the Clarinet console:

```bash
npm run console
```

In the console, you can execute individual contract calls and inspect state.
