;; KeyVendingMachine Contract - Market Logic with Bonding Curve

;; Define token trait for contract calls (lightweight, avoids extra view signatures)
(define-trait token-trait
    (
        ;; Transfer from the caller to a new principal
        (transfer (uint principal principal (optional (buff 34))) (response bool uint))
        ;; Mint new token (recipient is tx-sender inside token)
        (mint (uint) (response bool uint))
        ;; Burn token (sender is tx-sender inside token)
        (burn (uint) (response bool uint))
        ;; Get balance of the owner
        (get-balance (principal) (response uint uint))
        ;; Get total supply
        (get-total-supply () (response uint uint))
        ;; Optional owner-helper for minter authorization
        (authorize-caller-as-minter () (response bool uint))
    )
)

;; Constants
(define-data-var contract-owner principal tx-sender)
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
(define-data-var protocol-treasury principal tx-sender)

;; Treasury balance (sBTC held for liquidity)
(define-data-var treasury-balance uint u0)
;; Cached token supply maintained by this contract (avoids dynamic contract calls)
(define-data-var token-supply-cache uint u0)

;; Configuration
(define-public (initialize (room-id (string-ascii 256)) (creator principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
        (var-set chat-room-id room-id)
        (var-set creator-address creator)
        (ok true)
    )
)

;; Removed persistent token pointer; token is provided as a trait-typed argument to calls

(define-public (set-protocol-treasury (treasury principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
        (ok (var-set protocol-treasury treasury))
    )
)

;; Bonding Curve: Simple linear formula
;; Price = base-price + (supply * price-increment)
;; For simplicity: price = 1000000 + (supply * 100000) microSTX per key
(define-private (calculate-buy-price-private (amount uint))
    (let
        (
            (current-supply (var-get token-supply-cache))
            (base-price u1000000) ;; 1 sBTC (in micro units)
            (price-increment u100000) ;; 0.1 sBTC per key
        )
        ;; Sum of prices for each key: sum from i=0 to amount-1 of (base + (supply+i)*increment)
        (+ (* amount base-price)
           (* price-increment (+ (* amount current-supply) (/ (* amount (- amount u1)) u2))))
    )
)

(define-private (calculate-sell-price-private (amount uint))
    (let
        (
            (current-supply (var-get token-supply-cache))
            (base-price u1000000)
            (price-increment u100000)
            (new-supply (- current-supply amount))
        )
        ;; Sum of prices for each key being sold
        (+ (* amount base-price)
           (* price-increment (+ (* amount new-supply) (/ (* amount (- amount u1)) u2))))
    )
)

;; Read-only functions for price calculation
;; Safe in read-only as they only read data vars
(define-read-only (calculate-buy-price (amount uint))
    (ok (calculate-buy-price-private amount))
)

(define-read-only (calculate-sell-price (amount uint))
    (ok (calculate-sell-price-private amount))
)

;; No dynamic contract calls: we rely on token-supply-cache being updated by this contract

;; Buy Keys Function
(define-public (buy-keys (amount uint) (max-price uint) (token-addr <token-trait>))
    (let
        (
            (total-price (calculate-buy-price-private amount))
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
        
        ;; Distribute fees from contract balance (as the contract)
        (try! (as-contract (stx-transfer? protocol-fee tx-sender (var-get protocol-treasury))))
        (try! (as-contract (stx-transfer? creator-fee tx-sender (var-get creator-address))))
        
        ;; Add to treasury
        (var-set treasury-balance (+ (var-get treasury-balance) treasury-amount))
        ;; Update cached supply after successful mint
        (var-set token-supply-cache (+ (var-get token-supply-cache) amount))
        
        ;; Mint keys on provided token contract (recipient is tx-sender inside token contract)
        (try! (as-contract (contract-call? token-addr mint amount)))
        
        (ok true)
    )
)

;; Sell Keys Function
(define-public (sell-keys (amount uint) (min-price uint) (token-addr <token-trait>))
    (let
        (
            (total-price (calculate-sell-price-private amount))
            (protocol-fee (/ (* total-price protocol-fee-bps) basis-points))
            (payout (- total-price protocol-fee))
            (seller tx-sender)
        )
        ;; Validations
        (asserts! (> amount u0) err-zero-amount)
        (asserts! (>= total-price min-price) err-insufficient-payment)
        (asserts! (>= (var-get treasury-balance) payout) err-insufficient-balance)
        
        ;; Burn keys on provided token contract (sender is tx-sender inside token contract)
        (try! (as-contract (contract-call? token-addr burn amount)))
        
        ;; Deduct from treasury
        (var-set treasury-balance (- (var-get treasury-balance) payout))
        ;; Update cached supply after successful burn
        (var-set token-supply-cache (- (var-get token-supply-cache) amount))
        
        ;; Pay seller from contract balance (from contract -> original tx sender)
        (try! (as-contract (stx-transfer? payout tx-sender seller)))
        
        ;; Pay protocol fee from contract balance
        (as-contract (stx-transfer? protocol-fee tx-sender (var-get protocol-treasury)))
    )
)

;; Owner action: authorize this vending machine as minter on the local KeyToken
(define-public (authorize-token-minter (token-addr <token-trait>))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
        (try! (as-contract (contract-call? token-addr authorize-caller-as-minter)))
        (ok true)
    )
)

;; Read-only functions
(define-read-only (get-market-info)
    (ok {
        chat-room-id: (var-get chat-room-id),
        creator: (var-get creator-address),
        treasury-balance: (var-get treasury-balance)
    })
)

;; Get token supply (public function that can make contract calls)
;; Note: This returns 0 since dynamic contract calls are not supported in Clarity
(define-public (get-token-supply-public)
    (ok u0)
)