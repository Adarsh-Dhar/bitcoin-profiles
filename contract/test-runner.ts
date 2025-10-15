#!/usr/bin/env -S deno run --allow-read --allow-net --no-check

// Simple test runner for Clarinet contracts
// This script tests the contracts using the Clarinet console approach

import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

// Test KeyVendingMachine initialization
Clarinet.test({
  name: "KeyVendingMachine - Contract Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

// Test KeyToken authorization
Clarinet.test({
  name: "KeyToken - Token Authorization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

// Test Factory market registration
Clarinet.test({
  name: "Factory - Register Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

console.log("All tests completed successfully!");
