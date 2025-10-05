;; KeyVendingMachine Contract - Bonding Curve AMM
;; Handles buying and selling of keys for a single creator

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u200))
(define-constant err-invalid-amount (err u201))
(define-constant err-insufficient-payment (err u202))
(define-constant err-insufficient-balance (err u203))
(define-constant err-transfer-failed (err u204))
(define-constant err-mint-failed (err u205))
(define-constant err-burn-failed (err u206))

;; Trait for sBTC contract interactions
(define-trait sbtc-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
  )
)

;; Note: token contract is called dynamically using its principal

;; Fee constants (in basis points, 250 = 2.5%)
(define-constant creator-fee-bps u250)
(define-constant protocol-fee-bps u250)
(define-constant total-fee-bps u500) ;; 5% total

;; Bonding curve constants (linear curve: price = base-price + (supply * slope))
(define-constant base-price u1000000) ;; 0.01 sBTC in satoshis (1 sBTC = 100,000,000 sats)
(define-constant price-slope u10000) ;; Price increases by 0.0001 sBTC per key

;; Data Variables
(define-data-var creator-address principal tx-sender)
(define-data-var protocol-treasury principal tx-sender)
(define-data-var key-token-contract principal tx-sender)
(define-data-var sbtc-contract principal 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-sbtc) ;; Replace with actual sBTC contract

;; Initialize function (called once after deployment)
(define-public (initialize (creator principal) (treasury principal) (token-contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set creator-address creator)
    (var-set protocol-treasury treasury)
    (var-set key-token-contract token-contract)
    (ok true)
  )
)

;; Pricing helpers

(define-read-only (get-current-supply)
  (let ()
    (unwrap-panic (contract-call? (var-get key-token-contract) get-total-supply))
  )
)

(define-read-only (calculate-price-at-supply (supply uint))
  (+ base-price (* supply price-slope))
)

(define-read-only (get-buy-price (amount uint))
  (let (
    (current-supply (get-current-supply))
    (new-supply (+ current-supply amount))
  )
    ;; Sum of arithmetic series: cost = amount * (price-at-start + price-at-end) / 2
    (let (
      (start-price (calculate-price-at-supply current-supply))
      (end-price (calculate-price-at-supply (- new-supply u1)))
      (avg-price (/ (+ start-price end-price) u2))
      (total-cost (* amount avg-price))
    )
      {
        total-cost: total-cost,
        creator-fee: (/ (* total-cost creator-fee-bps) u10000),
        protocol-fee: (/ (* total-cost protocol-fee-bps) u10000),
        net-cost: total-cost
      }
    )
  )
)

(define-read-only (get-sell-price (amount uint))
  (let (
    (current-supply (get-current-supply))
  )
    (asserts! (>= current-supply amount) (ok { total-payout: u0, creator-fee: u0, protocol-fee: u0, net-payout: u0 }))
    
    (let (
      (new-supply (- current-supply amount))
      (start-price (calculate-price-at-supply (- current-supply u1)))
      (end-price (calculate-price-at-supply new-supply))
      (avg-price (/ (+ start-price end-price) u2))
      (gross-payout (* amount avg-price))
      (creator-fee (/ (* gross-payout creator-fee-bps) u10000))
      (protocol-fee (/ (* gross-payout protocol-fee-bps) u10000))
      (net-payout (- gross-payout (+ creator-fee protocol-fee)))
    )
      (ok {
        total-payout: gross-payout,
        creator-fee: creator-fee,
        protocol-fee: protocol-fee,
        net-payout: net-payout
      })
    )
  )
)

;; Buy keys function
(define-public (buy-keys (amount uint) (max-price uint))
  (let (
    (buyer tx-sender)
    (price-data (get-buy-price amount))
    (total-cost (get total-cost price-data))
    (creator-fee (get creator-fee price-data))
    (protocol-fee (get protocol-fee price-data))
  )
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= total-cost max-price) err-insufficient-payment)
    
    ;; Transfer sBTC from buyer to this contract
    (unwrap! (stx-transfer-sbtc total-cost buyer (as-contract tx-sender)) err-transfer-failed)
    
    ;; Distribute fees (only if fees > 0)
    (if (> creator-fee u0)
      (unwrap! (as-contract (stx-transfer-sbtc creator-fee tx-sender (var-get creator-address))) err-transfer-failed)
    )
    (if (> protocol-fee u0)
      (unwrap! (as-contract (stx-transfer-sbtc protocol-fee tx-sender (var-get protocol-treasury))) err-transfer-failed)
    )
    
    ;; Mint keys to buyer
    (let ()
      (asserts!
        (is-ok (as-contract (contract-call? (var-get key-token-contract) mint amount buyer)))
        err-mint-failed
      )
    )
    
    (print {
      type: "buy-keys",
      buyer: buyer,
      amount: amount,
      total-cost: total-cost,
      creator-fee: creator-fee,
      protocol-fee: protocol-fee
    })
    
    (ok {amount: amount, cost: total-cost})
  )
)

;; Sell keys function
(define-public (sell-keys (amount uint) (min-payout uint))
  (let (
    (seller tx-sender)
    (price-result (unwrap! (get-sell-price amount) err-invalid-amount))
    (gross-payout (get total-payout price-result))
    (creator-fee (get creator-fee price-result))
    (protocol-fee (get protocol-fee price-result))
    (net-payout (get net-payout price-result))
  )
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (>= net-payout min-payout) err-insufficient-payment)
    
    ;; Burn keys from seller
    (let ()
      (asserts!
        (is-ok (as-contract (contract-call? (var-get key-token-contract) burn amount seller)))
        err-burn-failed
      )
    )
    
    ;; Distribute fees (only if fees > 0)
    (if (> creator-fee u0)
      (unwrap! (as-contract (stx-transfer-sbtc creator-fee tx-sender (var-get creator-address))) err-transfer-failed)
    )
    (if (> protocol-fee u0)
      (unwrap! (as-contract (stx-transfer-sbtc protocol-fee tx-sender (var-get protocol-treasury))) err-transfer-failed)
    )
    
    ;; Pay seller
    (unwrap! (as-contract (stx-transfer-sbtc net-payout tx-sender seller)) err-transfer-failed)
    
    (print {
      type: "sell-keys",
      seller: seller,
      amount: amount,
      gross-payout: gross-payout,
      net-payout: net-payout,
      creator-fee: creator-fee,
      protocol-fee: protocol-fee
    })
    
    (ok {amount: amount, payout: net-payout})
  )
)

;; Helper function for sBTC transfers (simplified - you'll need to integrate with actual sBTC contract)
(define-private (stx-transfer-sbtc (amount uint) (sender principal) (recipient principal))
  (ok true)
)

;; Removed unused read-only balance helper to avoid disallowed constructs in read-only context

;; Admin function to update protocol treasury
(define-public (set-protocol-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set protocol-treasury new-treasury)
    (ok true)
  )
)