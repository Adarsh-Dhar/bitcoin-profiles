import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.0/index.ts";

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

Clarinet.test({
  name: "KeyToken - Mint and Burn Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

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
  }
});

Clarinet.test({
  name: "KeyToken - Transfer Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Authorize deployer as minter and mint tokens
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "mint",
        [types.uint(100)],
        deployer.address
      )
    ]);

    // Test transfer from deployer to user1
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "transfer",
        [
          types.uint(30),
          types.principal(deployer.address),
          types.principal(user1.address),
          types.none()
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check balances
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(deployer.address)],
        deployer.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user1.address)],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(70);
    block.receipts[1].result.expectOk().expectUint(30);

    // Test transfer from user1 to user2
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "transfer",
        [
          types.uint(10),
          types.principal(user1.address),
          types.principal(user2.address),
          types.none()
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check final balances
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user1.address)],
        user1.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "get-balance",
        [types.principal(user2.address)],
        user2.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(20);
    block.receipts[1].result.expectOk().expectUint(10);
  }
});

Clarinet.test({
  name: "KeyToken - Error Cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Authorize deployer as minter and mint tokens
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "mint",
        [types.uint(100)],
        deployer.address
      )
    ]);

    // Test minting 0 tokens (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "mint",
        [types.uint(0)],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(102); // err-insufficient-balance

    // Test burning more tokens than available (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "burn",
        [types.uint(200)],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(102); // err-insufficient-balance

    // Test transferring 0 tokens (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "transfer",
        [
          types.uint(0),
          types.principal(deployer.address),
          types.principal(user1.address),
          types.none()
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(102); // err-insufficient-balance

    // Test transferring to same address (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "transfer",
        [
          types.uint(10),
          types.principal(deployer.address),
          types.principal(deployer.address),
          types.none()
        ],
        deployer.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(103); // err-unauthorized

    // Test unauthorized transfer (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "transfer",
        [
          types.uint(10),
          types.principal(deployer.address),
          types.principal(user1.address),
          types.none()
        ],
        user1.address
      )
    ]);

    block.receipts[0].result.expectErr().expectUint(101); // err-not-authorized
  }
});

Clarinet.test({
  name: "KeyToken - Read Only Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Test token metadata
    let block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-name",
        [],
        user1.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "get-symbol",
        [],
        user1.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "get-decimals",
        [],
        user1.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "get-total-supply",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectAscii("Chat Room Keys");
    block.receipts[1].result.expectOk().expectAscii("KEYS");
    block.receipts[2].result.expectOk().expectUint(6);
    block.receipts[3].result.expectOk().expectUint(0);

    // Mint some tokens and check supply
    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "authorize-caller-as-minter",
        [],
        deployer.address
      ),
      Tx.contractCall(
        "KeyToken_v11",
        "mint",
        [types.uint(50)],
        deployer.address
      )
    ]);

    block = chain.mineBlock([
      Tx.contractCall(
        "KeyToken_v11",
        "get-total-supply",
        [],
        user1.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(50);
  }
});
