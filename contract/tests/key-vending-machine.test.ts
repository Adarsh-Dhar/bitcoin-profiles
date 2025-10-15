import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

Clarinet.test({
  name: "KeyVendingMachine - Contract Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

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
          types.principal(user2.address)
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(200); // err-owner-only
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Set Protocol Treasury",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Price Calculations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Buy Keys Success",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Deploy and setup KeyToken
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    // Authorize vending machine as minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    // Test buying 1 key
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [
          types.uint(1),
          types.uint(2000000), // max price
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check that user received tokens
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user1.address)],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Buy Keys Error Cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Deploy and setup KeyToken
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    // Authorize vending machine as minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    // Test buying 0 keys (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [
          types.uint(0),
          types.uint(2000000),
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(203); // err-zero-amount

    // Test buying with insufficient max price
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [
          types.uint(1),
          types.uint(500000), // too low max price
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(201); // err-insufficient-payment
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Sell Keys Success",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Deploy and setup KeyToken
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    // Authorize vending machine as minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    // First buy some keys to have treasury balance
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [
          types.uint(2),
          types.uint(5000000), // max price
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Now sell 1 key
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "sell-keys",
        [
          types.uint(1),
          types.uint(500000), // min price
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check that user has 1 key left
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user1.address)],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Sell Keys Error Cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Deploy and setup KeyToken
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    // Authorize vending machine as minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    // Test selling 0 keys (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "sell-keys",
        [
          types.uint(0),
          types.uint(500000),
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(203); // err-zero-amount

    // Test selling with insufficient treasury balance
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "sell-keys",
        [
          types.uint(1),
          types.uint(500000),
          types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(202); // err-insufficient-balance
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Read Only Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Test get-market-info
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "get-market-info",
        [],
        user1.address
      )
    ]);

    const marketInfo = block.receipts[0].result.expectOk();
    marketInfo.expectTuple()["chat-room-id"].expectAscii("test-room-123");
    marketInfo.expectTuple()["creator"].expectPrincipal(user1.address);
    marketInfo.expectTuple()["treasury-balance"].expectUint(0);

    // Test get-token-supply-public
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "get-token-supply-public",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(0);
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Authorize Token Minter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
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

    // Test that only owner can authorize token minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(200); // err-owner-only

    // Test successful authorization by owner
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
  }
});

Clarinet.test({
  name: "KeyVendingMachine - Bonding Curve Integration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const treasury = accounts.get("wallet_2")!;

    // Initialize and set up
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "initialize",
        [
          types.stringAscii("test-room-123"),
          types.principal(user1.address)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "set-protocol-treasury",
        [types.principal(treasury.address)],
        deployer.address
      )
    ]);

    // Deploy and setup KeyToken
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      )
    ]);

    // Authorize vending machine as minter
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "authorize-token-minter",
        [types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11")],
        deployer.address
      )
    ]);

    // Test progressive pricing - buy multiple keys and verify increasing prices
    const tokenAddr = types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.KeyToken_v11");

    // Buy 1st key
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [types.uint(1), types.uint(2000000), tokenAddr],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Buy 2nd key (should be more expensive)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyVendingMachine_v11",
        "buy-keys",
        [types.uint(1), types.uint(2000000), tokenAddr],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check final balance
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user1.address)],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(2);
  }
});
