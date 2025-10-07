;; KeyVendingMachine Contract - Market Logic with Bonding Curve

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-insufficient-payment (err u201))
(define-constant err-insufficient-balance (err u202))
(define-constant err-zero-amount (err u203))
(define-constant err-token-not-set (err u204))

;; Protocol fee: 2.5% (250 basis points)
(define-constant protocol-fee-bps u250)
;; Creator fee: 2.5% (250 basis points)
(define-constant creator-fee-bps u250)
(define-constant basis-points u10000)

;; Data Variables
(define-data-var chat-room-id (string-ascii 256) "")
(define-data-var creator-address principal tx-sender)
(define-data-var key-token-contract (optional principal) none)
(define-data-var protocol-treasury principal tx-sender)

;; Treasury balance (sBTC held for liquidity)
(define-data-var treasury-balance uint u0)

;; Configuration
(define-public (initialize (room-id (string-ascii 256)) (creator principal) (token-contract principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set chat-room-id room-id)
        (var-set creator-address creator)
        (var-set key-token-contract (some token-contract))
        (ok true)
    )
)

(define-public (set-protocol-treasury (treasury principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set protocol-treasury treasury))
    )
)

;; Bonding Curve: Simple linear formula
;; Price = base-price + (supply * price-increment)
;; For simplicity: price = 1000000 + (supply * 100000) microSTX per key
(define-read-only (calculate-buy-price (amount uint))
    (let
        (
            (current-supply (get-token-supply))
            (base-price u1000000) ;; 1 sBTC (in micro units)
            (price-increment u100000) ;; 0.1 sBTC per key
        )
        ;; Sum of prices for each key: sum from i=0 to amount-1 of (base + (supply+i)*increment)
        (ok (+ (* amount base-price) 
               (* price-increment (+ (* amount current-supply) (/ (* amount (- amount u1)) u2)))))
    )
)

(define-read-only (calculate-sell-price (amount uint))
    (let
        (
            (current-supply (get-token-supply))
            (base-price u1000000)
            (price-increment u100000)
            (new-supply (- current-supply amount))
        )
        ;; Sum of prices for each key being sold
        (ok (+ (* amount base-price)
               (* price-increment (+ (* amount new-supply) (/ (* amount (- amount u1)) u2)))))
    )
)

;; Helper to get token supply
(define-read-only (get-token-supply)
    (match (var-get key-token-contract)
        token-contract (match (contract-call? token-contract get-total-supply)
            total-supply total-supply
            u0)
        u0
    )
)

;; Buy Keys Function
(define-public (buy-keys (amount uint) (max-price uint))
    (let
        (
            (token-contract (unwrap! (var-get key-token-contract) err-token-not-set))
            (total-price (unwrap! (calculate-buy-price amount) err-zero-amount))
            (protocol-fee (/ (* total-price protocol-fee-bps) basis-points))
            (creator-fee (/ (* total-price creator-fee-bps) basis-points))
            (treasury-amount (- total-price (+ protocol-fee creator-fee)))
        )
        ;; Validations
        (asserts! (> amount u0) err-zero-amount)
        (asserts! (<= total-price max-price) err-insufficient-payment)
        
        ;; Transfer sBTC from buyer
        ;; Note: In production, use actual sBTC token contract
        ;; This is simplified - you'd use stx-transfer? or sBTC token transfer
        (try! (stx-transfer? total-price tx-sender (as-contract tx-sender)))
        
        ;; Distribute fees
        (try! (as-contract (stx-transfer? protocol-fee tx-sender (var-get protocol-treasury))))
        (try! (as-contract (stx-transfer? creator-fee tx-sender (var-get creator-address))))
        
        ;; Add to treasury
        (var-set treasury-balance (+ (var-get treasury-balance) treasury-amount))
        
        ;; Mint keys to buyer
        (as-contract (contract-call? token-contract mint amount tx-sender))
    )
)

;; Sell Keys Function
(define-public (sell-keys (amount uint) (min-price uint))
    (let
        (
            (token-contract (unwrap! (var-get key-token-contract) err-token-not-set))
            (total-price (unwrap! (calculate-sell-price amount) err-zero-amount))
            (protocol-fee (/ (* total-price protocol-fee-bps) basis-points))
            (payout (- total-price protocol-fee))
        )
        ;; Validations
        (asserts! (> amount u0) err-zero-amount)
        (asserts! (>= total-price min-price) err-insufficient-payment)
        (asserts! (>= (var-get treasury-balance) payout) err-insufficient-balance)
        
        ;; Burn keys from seller
        (try! (as-contract (contract-call? token-contract burn amount tx-sender)))
        
        ;; Deduct from treasury
        (var-set treasury-balance (- (var-get treasury-balance) payout))
        
        ;; Pay seller
        (try! (as-contract (stx-transfer? payout tx-sender tx-sender)))
        
        ;; Pay protocol fee
        (as-contract (stx-transfer? protocol-fee tx-sender (var-get protocol-treasury)))
    )
)

;; Read-only functions
(define-read-only (get-market-info)
    (ok {
        chat-room-id: (var-get chat-room-id),
        creator: (var-get creator-address),
        token-contract: (var-get key-token-contract),
        treasury-balance: (var-get treasury-balance),
        total-supply: (get-token-supply)
    })
)