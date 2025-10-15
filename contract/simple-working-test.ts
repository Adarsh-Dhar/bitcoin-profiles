#!/usr/bin/env -S deno run --allow-read --allow-net --no-check

// Simple working test for Clarinet contracts
import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

console.log("🚀 Starting Clarinet tests...");

// Test 1: KeyVendingMachine - Contract Initialization
Clarinet.test({
  name: "KeyVendingMachine - Contract Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    console.log("🧪 Running: KeyVendingMachine - Contract Initialization");
    
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Test initialization by owner
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    console.log("✅ Owner initialization successful");

    // Test that only owner can initialize
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("another-room"),
          types.principal(user1.address)
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(200); // err-owner-only
    console.log("✅ Non-owner initialization correctly rejected");
  }
});

// Test 2: KeyToken - Token Authorization
Clarinet.test({
  name: "KeyToken - Token Authorization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    console.log("🧪 Running: KeyToken - Token Authorization");
    
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Test that only owner can authorize minter
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(100); // err-owner-only
    console.log("✅ Non-owner authorization correctly rejected");

    // Test successful authorization by owner
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    console.log("✅ Owner authorization successful");
  }
});

// Test 3: Factory - Register Market
Clarinet.test({
  name: "Factory - Register Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    console.log("🧪 Running: Factory - Register Market");
    
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const vendingMachine = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v11";
    const tokenContract = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11";

    // Test that only owner can register markets
    let block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v11",
        "register-market",
        [
          types.stringAscii("test-room-123"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(300); // err-owner-only
    console.log("✅ Non-owner market registration correctly rejected");

    // Test successful registration by owner
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v11",
        "register-market",
        [
          types.stringAscii("test-room-123"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      )
    ]);

    const result = block.receipts[0].result.expectOk();
    result.expectTuple()["chat-room-id"].expectAscii("test-room-123");
    result.expectTuple()["vending-machine"].expectPrincipal(vendingMachine);
    result.expectTuple()["token-contract"].expectPrincipal(tokenContract);
    console.log("✅ Owner market registration successful");
  }
});

// Test 4: KeyVendingMachine - Price Calculations
Clarinet.test({
  name: "KeyVendingMachine - Price Calculations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    console.log("🧪 Running: KeyVendingMachine - Price Calculations");
    
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Initialize
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      )
    ]);

    // Test buy price calculation with different amounts
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "calculate-buy-price",
        [types.uint(1)],
        user1.address
      )
    ]);

    // For 1 key: base-price = 1000000, supply = 0, increment = 100000
    // Price = 1000000 + (0 * 100000) = 1000000
    const price1 = block.receipts[0].result.expectOk().expectUint(1000000);
    console.log(`✅ Price for 1 key: ${price1}`);

    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "calculate-buy-price",
        [types.uint(2)],
        user1.address
      )
    ]);

    // For 2 keys: base-price = 1000000, supply = 0, increment = 100000
    // Price = 2*1000000 + 100000*(0 + 1) = 2000000 + 100000 = 2100000
    const price2 = block.receipts[0].result.expectOk().expectUint(2100000);
    console.log(`✅ Price for 2 keys: ${price2}`);

    // Test sell price calculation
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "calculate-sell-price",
        [types.uint(1)],
        user1.address
      )
    ]);

    const sellPrice = block.receipts[0].result.expectOk().expectUint(1000000);
    console.log(`✅ Sell price for 1 key: ${sellPrice}`);
  }
});

// Test 5: KeyToken - Mint and Burn Functions
Clarinet.test({
  name: "KeyToken - Mint and Burn Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    console.log("🧪 Running: KeyToken - Mint and Burn Functions");
    
    const deployer = accounts.get("deployer")!;

    // Authorize deployer as minter
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    console.log("✅ Minter authorization successful");

    // Test minting tokens
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "mint",
        [types.uint(100)],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    console.log("✅ Token minting successful");

    // Check balance
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(deployer.address)],
        deployer.address
      )
    ]);

    const balance = block.receipts[0].result.expectOk().expectUint(100);
    console.log(`✅ Balance after mint: ${balance}`);

    // Test burning tokens
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "burn",
        [types.uint(50)],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    console.log("✅ Token burning successful");

    // Check balance after burn
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(deployer.address)],
        deployer.address
      )
    ]);

    const finalBalance = block.receipts[0].result.expectOk().expectUint(50);
    console.log(`✅ Final balance after burn: ${finalBalance}`);
  }
});

console.log("🎉 All tests completed!");
