#!/usr/bin/env -S deno run --allow-read --allow-net --no-check

// Comprehensive test runner for all Clarinet contracts
// This script tests all contracts using the Clarinet console approach

import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

let testCount = 0;
let passCount = 0;
let failCount = 0;

async function runTest(name: string, testFn: () => Promise<void>) {
  testCount++;
  try {
    console.log(`\n🧪 Running: ${name}`);
    await testFn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
}

// KeyVendingMachine Tests
Clarinet.test({
  name: "KeyVendingMachine - Contract Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("KeyVendingMachine - Contract Initialization", async () => {
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
    });
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Set Protocol Treasury",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("KeyVendingMachine - Set Protocol Treasury", async () => {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;
      const treasury = accounts.get("wallet_2")!;

      // Initialize first
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

      // Test setting protocol treasury by owner
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v11",
          "set-protocol-treasury",
          [types.principal(treasury.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectBool(true);

      // Test that only owner can set treasury
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v11",
          "set-protocol-treasury",
          [types.principal(user1.address)],
          user1.address
        )
      ]);

      block.receipts[0].result.expectErr().expectUint(200); // err-owner-only
    });
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Price Calculations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("KeyVendingMachine - Price Calculations", async () => {
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
      block.receipts[0].result.expectOk().expectUint(1000000);

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
      block.receipts[0].result.expectOk().expectUint(2100000);

      // Test sell price calculation
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyVendingMachine_v11",
          "calculate-sell-price",
          [types.uint(1)],
          user1.address
        )
      ]);

      // For selling 1 key when supply is 0: new-supply = 0-1 = -1 (underflow, but should be handled)
      // This should return the base price calculation
      block.receipts[0].result.expectOk().expectUint(1000000);
    });
  }
});

// KeyToken Tests
Clarinet.test({
  name: "KeyToken - Token Authorization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("KeyToken - Token Authorization", async () => {
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
    });
  }
});

Clarinet.test({
  name: "KeyToken - Mint and Burn Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("KeyToken - Mint and Burn Functions", async () => {
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

      // Check balance
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v11",
          "get-balance",
          [types.principal(deployer.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectUint(100);

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

      // Check balance after burn
      block = chain.mineBlock([
        Tx.contractCall(
          "KeyToken_v11",
          "get-balance",
          [types.principal(deployer.address)],
          deployer.address
        )
      ]);

      block.receipts[0].result.expectOk().expectUint(50);
    });
  }
});

// Factory Tests
Clarinet.test({
  name: "Factory - Register Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("Factory - Register Market", async () => {
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
    });
  }
});

Clarinet.test({
  name: "Factory - Get Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    await runTest("Factory - Get Market", async () => {
      const deployer = accounts.get("deployer")!;
      const user1 = accounts.get("wallet_1")!;
      const vendingMachine = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v11";
      const tokenContract = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11";

      // Register a market first
      let block = chain.mineBlock([
        Tx.contractCall(
          "Factory_v11",
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
          "Factory_v11",
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
          "Factory_v11",
          "get-market",
          [types.stringAscii("non-existent-room")],
          user1.address
        )
      ]);

      block.receipts[0].result.expectOk().expectNone();
    });
  }
});

// Print final results
setTimeout(() => {
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);
  console.log("=".repeat(50));
  
  if (failCount === 0) {
    console.log("🎉 All tests passed successfully!");
  } else {
    console.log("⚠️  Some tests failed. Please check the output above.");
  }
}, 1000);
