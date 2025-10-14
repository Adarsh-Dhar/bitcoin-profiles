# Testing Guide for Bitcoin Profiles Contracts

This guide explains how to run and understand the tests for the Bitcoin Profiles smart contracts.

## Overview

The test suite covers three main contracts:
- **KeyVendingMachine**: Market logic with bonding curve pricing
- **KeyToken**: SIP-10 compliant fungible token for chat room keys
- **Factory**: Contract deployment and management

## Prerequisites

Make sure you have the following installed:
- [Clarinet](https://github.com/hirosystems/clarinet) - Stacks blockchain development tool
- [Deno](https://deno.land/) - JavaScript/TypeScript runtime
- [Node.js](https://nodejs.org/) - For package management

## Running Tests

### 1. Install Dependencies

```bash
cd contract
npm install
```

### 2. Run All Tests

```bash
# Run all tests once
npm test

# Run tests with coverage report
npm run test:report

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### 3. Run Specific Test Files

```bash
# Run only KeyVendingMachine tests
deno test --allow-read --allow-net tests/key-vending-machine.test.ts

# Run only KeyToken tests
deno test --allow-read --allow-net tests/key-token.test.ts

# Run only Factory tests
deno test --allow-read --allow-net tests/factory.test.ts
```

### 4. Run Tests with Clarinet Console

```bash
# Start Clarinet console for interactive testing
clarinet console

# In the console, you can run individual test functions
# This is useful for debugging specific scenarios
```

## Test Structure

### KeyVendingMachine Tests

The KeyVendingMachine tests cover:

1. **Contract Initialization**
   - Owner-only initialization
   - Setting chat room ID and creator address
   - Protocol treasury configuration

2. **Price Calculations**
   - Bonding curve buy price calculations
   - Bonding curve sell price calculations
   - Progressive pricing verification

3. **Buy Keys Function**
   - Successful key purchases
   - Fee distribution (protocol + creator fees)
   - Treasury balance updates
   - Error cases (zero amount, insufficient payment)

4. **Sell Keys Function**
   - Successful key sales
   - Payout calculations
   - Treasury balance management
   - Error cases (zero amount, insufficient balance)

5. **Authorization**
   - Token minter authorization
   - Owner-only access controls

6. **Read-Only Functions**
   - Market info retrieval
   - Token supply queries

### KeyToken Tests

The KeyToken tests cover:

1. **Token Authorization**
   - Minter authorization
   - Owner-only controls

2. **Mint and Burn**
   - Token minting
   - Token burning
   - Balance updates

3. **Transfers**
   - Token transfers between users
   - Authorization checks
   - Balance validations

4. **Error Cases**
   - Zero amount operations
   - Insufficient balance
   - Unauthorized operations

5. **Read-Only Functions**
   - Token metadata (name, symbol, decimals)
   - Balance queries
   - Total supply tracking

### Factory Tests

The Factory tests cover:

1. **Contract Deployment**
   - KeyToken deployment
   - VendingMachine deployment
   - Owner-only access

2. **Contract Management**
   - Deployed contracts tracking
   - Room ID validation

3. **Error Cases**
   - Invalid room IDs
   - Duplicate room deployments

## Understanding Test Results

### Success Indicators

- ✅ `expectOk()` - Function executed successfully
- ✅ `expectBool(true)` - Boolean operation succeeded
- ✅ `expectUint(expected)` - Numeric value matches expectation
- ✅ `expectPrincipal(address)` - Principal address matches expectation

### Error Indicators

- ❌ `expectErr()` - Function returned an error
- ❌ `expectUint(error_code)` - Specific error code returned

### Common Error Codes

- `200` - Owner-only operation attempted by non-owner
- `201` - Insufficient payment/balance
- `202` - Insufficient balance
- `203` - Zero amount operation
- `204` - Token not set

## Bonding Curve Testing

The bonding curve implements a linear pricing model:
- **Base Price**: 1,000,000 microSTX (1 sBTC)
- **Price Increment**: 100,000 microSTX (0.1 sBTC) per key
- **Formula**: `Price = base-price + (supply * price-increment)`

### Example Pricing

| Keys | Supply | Price per Key | Total Price |
|------|--------|---------------|-------------|
| 1    | 0      | 1,000,000     | 1,000,000   |
| 1    | 1      | 1,100,000     | 1,100,000   |
| 2    | 0      | 1,000,000     | 2,100,000   |
| 2    | 1      | 1,100,000     | 2,300,000   |

## Fee Structure

The vending machine implements a fee structure:
- **Protocol Fee**: 2.5% (250 basis points)
- **Creator Fee**: 2.5% (250 basis points)
- **Treasury Amount**: Remaining balance after fees

## Debugging Tests

### 1. Enable Verbose Logging

```bash
# Run tests with detailed output
deno test --allow-read --allow-net --log-level=debug tests/
```

### 2. Use Clarinet Console

```bash
clarinet console
```

In the console, you can:
- Execute individual contract calls
- Check state variables
- Debug specific scenarios

### 3. Check Contract State

```typescript
// In Clarinet console
(contract-call? .KeyVendingMachine_v7 get-market-info)
(contract-call? .KeyToken_v7 get-total-supply)
```

## Frontend Integration

These tests are designed to work with the frontend by:

1. **Testing Real Scenarios**: All test cases mirror actual frontend usage
2. **Error Handling**: Tests cover all error conditions the frontend might encounter
3. **State Management**: Tests verify state changes that the frontend needs to track
4. **Integration Points**: Tests verify contract interactions that the frontend relies on

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Contract Tests
  run: |
    cd contract
    npm install
    npm run test:report
```

## Best Practices

1. **Test Coverage**: All public functions are tested
2. **Edge Cases**: Zero amounts, insufficient balances, unauthorized access
3. **State Verification**: Tests verify both success and state changes
4. **Error Codes**: All error conditions are tested with specific error codes
5. **Integration**: Tests verify contract interactions work correctly

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in test configuration
2. **Permission Errors**: Ensure proper file permissions for test files
3. **Dependency Issues**: Run `npm install` to ensure all dependencies are installed
4. **Clarinet Issues**: Ensure Clarinet is properly installed and configured

### Getting Help

- Check the [Clarinet documentation](https://github.com/hirosystems/clarinet)
- Review the [Stacks documentation](https://docs.stacks.co/)
- Check the test output for specific error messages
