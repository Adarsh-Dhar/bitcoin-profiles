;; KeyToken Contract - Fungible Token for Chat Room Keys
;; This is a SIP-10 compliant fungible token

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Define the token
(define-fungible-token chat-keys)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-insufficient-balance (err u102))

;; Data Variables
(define-data-var token-name (string-ascii 32) "Chat Room Keys")
(define-data-var token-symbol (string-ascii 10) "KEYS")
(define-data-var token-decimals uint u6)
(define-data-var authorized-minter (optional principal) none)

;; Authorization - Only authorized minter (KeyVendingMachine) can mint/burn
(define-public (set-authorized-minter (minter principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set authorized-minter (some minter)))
    )
)

;; Private function to check authorization
(define-private (is-authorized)
    (match (var-get authorized-minter)
        authorized (is-eq contract-caller authorized)
        false
    )
)

;; SIP-010 Functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-not-authorized)
        (try! (ft-transfer? chat-keys amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok (var-get token-name))
)

(define-read-only (get-symbol)
    (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
    (ok (var-get token-decimals))
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance chat-keys who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply chat-keys))
)

(define-read-only (get-token-uri)
    (ok none)
)

;; Mint function - Only callable by authorized minter
(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-authorized) err-not-authorized)
        (ft-mint? chat-keys amount recipient)
    )
)

;; Burn function - Only callable by authorized minter
(define-public (burn (amount uint) (sender principal))
    (begin
        (asserts! (is-authorized) err-not-authorized)
        (asserts! (>= (ft-get-balance chat-keys sender) amount) err-insufficient-balance)
        (ft-burn? chat-keys amount sender)
    )
)