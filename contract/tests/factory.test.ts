import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

Clarinet.test({
  name: "Factory - Register Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

Clarinet.test({
  name: "Factory - Get Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

Clarinet.test({
  name: "Factory - Has Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
          types.stringAscii("test-room-789"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      )
    ]);

    // Test has-market for existing room
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "has-market",
        [types.stringAscii("test-room-789")],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Test has-market for non-existent room
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "has-market",
        [types.stringAscii("non-existent-room")],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(false);
  }
});

Clarinet.test({
  name: "Factory - Get Total Markets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const vendingMachine1 = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v7";
    const tokenContract1 = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v7";
    const vendingMachine2 = "ST2NEB84ASENDXKYG9QW7QW6VV2S9SF4A11TRSBVY.KeyVendingMachine_v7";
    const tokenContract2 = "ST2NEB84ASENDXKYG9QW7QW6VV2S9SF4A11TRSBVY.KeyToken_v7";

    // Check initial count
    let block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "get-total-markets",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(0);

    // Register first market
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "register-market",
        [
          types.stringAscii("room-1"),
          types.principal(vendingMachine1),
          types.principal(tokenContract1)
        ],
        deployer.address
      )
    ]);

    // Check count after first market
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "get-total-markets",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(1);

    // Register second market
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "register-market",
        [
          types.stringAscii("room-2"),
          types.principal(vendingMachine2),
          types.principal(tokenContract2)
        ],
        deployer.address
      )
    ]);

    // Check count after second market
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "get-total-markets",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(2);
  }
});

Clarinet.test({
  name: "Factory - Error Cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const vendingMachine = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyVendingMachine_v7";
    const tokenContract = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v7";

    // Test registering with empty room ID (should fail)
    let block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "register-market",
        [
          types.stringAscii(""),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(302); // err-not-found

    // Test registering same room twice (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "register-market",
        [
          types.stringAscii("duplicate-room"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "Factory_v7",
        "register-market",
        [
          types.stringAscii("duplicate-room"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectErr().expectUint(301); // err-already-exists
  }
});

Clarinet.test({
  name: "Factory - Unregister Market",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
          types.stringAscii("room-to-remove"),
          types.principal(vendingMachine),
          types.principal(tokenContract)
        ],
        deployer.address
      )
    ]);

    // Test that only owner can unregister
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "unregister-market",
        [types.stringAscii("room-to-remove")],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(300); // err-owner-only

    // Test successful unregistration by owner
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "unregister-market",
        [types.stringAscii("room-to-remove")],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Verify market is no longer available
    block = chain.mineBlock([
      Tx.contractCall(
        "Factory_v7",
        "has-market",
        [types.stringAscii("room-to-remove")],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(false);
  }
});
