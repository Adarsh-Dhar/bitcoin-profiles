#!/usr/bin/env -S deno run --allow-read --allow-net --no-check

// Working test runner for Clarinet contracts
import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

let testCount = 0;
let passCount = 0;
let failCount = 0;

function logTest(name: string, passed: boolean, error?: string) {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`✅ PASS: ${name}`);
  } else {
    failCount++;
    console.log(`❌ FAIL: ${name}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }
}

// Test 1: KeyVendingMachine - Contract Initialization
Clarinet.test({
  name: "KeyVendingMachine - Contract Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;

      // Test initialization by owner
      let block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "initialize",
          [
            types.stringAscii("test-room-123"),
            types.principal(user1.address)
          ],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);

      // Test that only owner can initialize
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "initialize",
          [
            types.stringAscii("another-room"),
            types.principal(user1.address)
          ],
          user1.address
        )
      ]);

      block.receipts[0].result.expectErr().expectUint(200); // err-owner-only
      
      logTest("KeyVendingMachine - Contract Initialization", true);
    } catch (error) {
      logTest("KeyVendingMachine - Contract Initialization", false, error.message);
    }
  }
});

// Test 2: KeyVendingMachine - Set Protocol Treasury
Clarinet.test({
  name: "KeyVendingMachine - Set Protocol Treasury",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;
      const treasury = accounts.get("wallet_2")!;

      // Initialize first
      let block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "initialize",
          [
            types.stringAscii("test-room-123"),
            types.principal(user1.address)
          ],
          deployer.address
        )
      ]);

      // Test setting protocol treasury by owner
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "set-protocol-treasury",
          [types.principal(treasury.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);

      // Test that only owner can set treasury
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "set-protocol-treasury",
          [types.principal(user1.address)],
          user1.address
        )
      ]);

      block.receipts[0].result.expectErr().expectUint(200); // err-owner-only
      
      logTest("KeyVendingMachine - Set Protocol Treasury", true);
    } catch (error) {
      logTest("KeyVendingMachine - Set Protocol Treasury", false, error.message);
    }
  }
});

// Test 3: KeyVendingMachine - Price Calculations
Clarinet.test({
  name: "KeyVendingMachine - Price Calculations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;

      // Initialize
      let block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
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
          "KeyVendingMachine_v7",
          "calculate-buy-price",
          [types.uint(1)],
          user1.address
        )
      ]);

      // For 1 key: base-price = 1000000, supply = 0, increment = 100000
      // Price = 1000000 + (0 * 100000) = 1000000
      block.receipts[0].result.expectOk().expectUint(1000000);

      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "calculate-buy-price",
          [types.uint(2)],
          user1.address
        )
      ]);

      // For 2 keys: base-price = 1000000, supply = 0, increment = 100000
      // Price = 2*1000000 + 100000*(0 + 1) = 2000000 + 100000 = 2100000
      block.receipts[0].result.expectOk().expectUint(2100000);

      // Test sell price calculation
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v7",
          "calculate-sell-price",
          [types.uint(1)],
          user1.address
        )
      ]);

      // For selling 1 key when supply is 0: new-supply = 0-1 = -1 (underflow, but should be handled)
      // This should return the base price calculation
      block.receipts[0].result.expectOk().expectUint(1000000);
      
      logTest("KeyVendingMachine - Price Calculations", true);
    } catch (error) {
      logTest("KeyVendingMachine - Price Calculations", false, error.message);
    }
  }
});

// Test 4: KeyToken - Token Authorization
Clarinet.test({
  name: "KeyToken - Token Authorization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;

      // Test that only owner can authorize minter
      let block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "authorize-caller-as-minter",
          [],
          user1.address
        )
      ]);

      block.receipts[0].result.expectErr().expectUint(100); // err-owner-only

      // Test successful authorization by owner
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "authorize-caller-as-minter",
          [],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      
      logTest("KeyToken - Token Authorization", true);
    } catch (error) {
      logTest("KeyToken - Token Authorization", false, error.message);
    }
  }
});

// Test 5: KeyToken - Mint and Burn Functions
Clarinet.test({
  name: "KeyToken - Mint and Burn Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;

      // Authorize deployer as minter
      let block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "authorize-caller-as-minter",
          [],
          deployer.address
        )
      ]);

      // Test minting tokens
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "mint",
          [types.uint(100)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);

      // Check balance
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "get-balance",
          [types.principal(deployer.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectUint(100);

      // Test burning tokens
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "burn",
          [types.uint(50)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);

      // Check balance after burn
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v7",
          "get-balance",
          [types.principal(deployer.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectUint(50);
      
      logTest("KeyToken - Mint and Burn Functions", true);
    } catch (error) {
      logTest("KeyToken - Mint and Burn Functions", false, error.message);
    }
  }
});

// Test 6: Factory - Register Market
Clarinet.test({
  name: "Factory - Register Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;
      const vendingMachine = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v7";
      const tokenContract = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v7";

      // Test that only owner can register markets
      let block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v7",
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

      // Test successful registration by owner
      block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v7",
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
      
      logTest("Factory - Register Market", true);
    } catch (error) {
      logTest("Factory - Register Market", false, error.message);
    }
  }
});

// Test 7: Factory - Get Market
Clarinet.test({
  name: "Factory - Get Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    try {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;
      const vendingMachine = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v7";
      const tokenContract = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v7";

      // Register a market first
      let block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v7",
          "register-market",
          [
            types.stringAscii("test-room-456"),
            types.principal(vendingMachine),
            types.principal(tokenContract)
          ],
          deployer.address
        )
      ]);

      // Test getting market by chat room ID
      block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v7",
          "get-market",
          [types.stringAscii("test-room-456")],
          user1.address
        )
      ]);

      const market = block.receipts[0].result.expectOk();
      market.expectSome().expectTuple()["vending-machine"].expectPrincipal(vendingMachine);
      market.expectSome().expectTuple()["token-contract"].expectPrincipal(tokenContract);

      // Test getting non-existent market
      block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v7",
          "get-market",
          [types.stringAscii("non-existent-room")],
          user1.address
        )
      ]);

      block.receipts[0].result.expectOk().expectNone();
      
      logTest("Factory - Get Market", true);
    } catch (error) {
      logTest("Factory - Get Market", false, error.message);
    }
  }
});

// Print final results after a delay to allow tests to complete
setTimeout(() => {
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${testCount > 0 ? ((passCount / testCount) * 100).toFixed(1) : 0}%`);
  console.log("=".repeat(50));
  
  if (failCount === 0 && testCount > 0) {
    console.log("🎉 All tests passed successfully!");
  } else if (testCount === 0) {
    console.log("⚠️  No tests were executed.");
  } else {
    console.log("⚠️  Some tests failed. Please check the output above.");
  }
}, 2000);
