;; KeyToken Contract - SIP-010 Fungible Token
;; Each creator gets their own instance of this token

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-invalid-amount (err u103))

;; Data Variables
(define-data-var token-name (string-ascii 32) "Creator Key")
(define-data-var token-symbol (string-ascii 10) "KEY")
(define-data-var token-decimals uint u0)
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var total-supply uint u0)

;; The authorized minter (will be set to KeyVendingMachine address)
(define-data-var authorized-minter (optional principal) none)

;; Data Maps
(define-map balances principal uint)

;; SIP-010 Functions

(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-not-authorized)
    (asserts! (> amount u0) err-invalid-amount)
    
    (let ((sender-balance (unwrap! (get-balance sender) err-insufficient-balance)))
      (asserts! (>= sender-balance amount) err-insufficient-balance)
      
      (try! (ft-transfer-helper amount sender recipient))
      
      (print {
        type: "transfer",
        sender: sender,
        recipient: recipient,
        amount: amount,
        memo: memo
      })
      
      (ok true)
    )
  )
)

;; Private helper function for transfers
(define-private (ft-transfer-helper (amount uint) (sender principal) (recipient principal))
  (let (
    (sender-balance (default-to u0 (map-get? balances sender)))
    (recipient-balance (default-to u0 (map-get? balances recipient)))
  )
    (map-set balances sender (- sender-balance amount))
    (map-set balances recipient (+ recipient-balance amount))
    (ok true)
  )
)

;; Admin Functions

(define-public (set-token-metadata (name (string-ascii 32)) (symbol (string-ascii 10)) (uri (optional (string-utf8 256))))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set token-name name)
    (var-set token-symbol symbol)
    (var-set token-uri uri)
    (ok true)
  )
)

(define-public (set-authorized-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set authorized-minter (some minter))
    (ok true)
  )
)

;; Mint/Burn Functions (Only callable by authorized minter)

(define-public (mint (amount uint) (recipient principal))
  (let ((minter (var-get authorized-minter)))
    (asserts! (is-some minter) err-not-authorized)
    (asserts! (is-eq tx-sender (unwrap-panic minter)) err-not-authorized)
    (asserts! (> amount u0) err-invalid-amount)
    
    (let (
      (current-balance (default-to u0 (map-get? balances recipient)))
      (new-supply (+ (var-get total-supply) amount))
    )
      (var-set total-supply new-supply)
      (map-set balances recipient (+ current-balance amount))
      
      (print {
        type: "mint",
        recipient: recipient,
        amount: amount
      })
      
      (ok true)
    )
  )
)

(define-public (burn (amount uint) (owner principal))
  (let ((minter (var-get authorized-minter)))
    (asserts! (is-some minter) err-not-authorized)
    (asserts! (is-eq tx-sender (unwrap-panic minter)) err-not-authorized)
    (asserts! (> amount u0) err-invalid-amount)
    
    (let (
      (current-balance (default-to u0 (map-get? balances owner)))
      (new-supply (- (var-get total-supply) amount))
    )
      (asserts! (>= current-balance amount) err-insufficient-balance)
      
      (var-set total-supply new-supply)
      (map-set balances owner (- current-balance amount))
      
      (print {
        type: "burn",
        owner: owner,
        amount: amount
      })
      
      (ok true)
    )
  )
)