;; KeyToken Contract - Fungible Token for Chat Room Keys
;; This implements SIP-10 compliant fungible token functions

;; Define the token
(define-fungible-token chat-keys)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-unauthorized (err u103))

;; Data Variables
(define-data-var token-name (string-ascii 32) "Chat Room Keys")
(define-data-var token-symbol (string-ascii 10) "KEYS")
(define-data-var token-decimals uint u6)
(define-data-var authorized-minter (optional principal) none)

;; Authorization - Only authorized minter (KeyVendingMachine) can mint/burn
;; Owner-only: set the authorized minter to the contract-caller (safe, no unchecked principal)
(define-public (authorize-caller-as-minter)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set authorized-minter (some contract-caller))
        (ok true)
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
        ;; Validate amount is not zero
        (asserts! (> amount u0) err-insufficient-balance)
        ;; Validate sender and recipient are different
        (asserts! (not (is-eq sender recipient)) err-unauthorized)
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
(define-public (mint (amount uint))
    (begin
        (asserts! (is-authorized) err-not-authorized)
        ;; Validate amount is not zero
        (asserts! (> amount u0) err-insufficient-balance)
        (ft-mint? chat-keys amount tx-sender)
    )
)

;; Burn function - Only callable by authorized minter
(define-public (burn (amount uint))
    (begin
        (asserts! (is-authorized) err-not-authorized)
        (asserts! (>= (ft-get-balance chat-keys tx-sender) amount) err-insufficient-balance)
        (ft-burn? chat-keys amount tx-sender)
    )
)