;; ChatRoomFactory Contract - Registry and Manager for Chat Room Markets
;; Note: In Clarity, we can't dynamically deploy contracts, so this acts as a registry
;; that tracks which KeyToken and KeyVendingMachine contracts belong to which chat rooms

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u300))
(define-constant err-already-exists (err u301))
(define-constant err-not-found (err u302))
(define-constant err-unauthorized (err u303))

;; Data Maps
;; Maps chat room ID to its market contracts
(define-map market-registry
    (string-ascii 256)
    {
        vending-machine: principal,
        token-contract: principal,
        creator: principal,
        created-at: uint
    }
)

;; Maps to track which contracts are registered (prevents duplicates)
(define-map registered-vending-machines principal bool)
(define-map registered-tokens principal bool)

;; Track total markets created
(define-data-var total-markets uint u0)

;; Register a new market
;; In practice, you deploy KeyToken and KeyVendingMachine separately, then register them here
(define-public (register-market 
    (chat-room-id (string-ascii 256))
    (vending-machine principal)
    (token-contract principal)
    (creator principal))
    (let
        (
            (existing-market (map-get? market-registry chat-room-id))
        )
        ;; Validations
        (asserts! (is-none existing-market) err-already-exists)
        (asserts! (is-none (map-get? registered-vending-machines vending-machine)) err-already-exists)
        (asserts! (is-none (map-get? registered-tokens token-contract)) err-already-exists)
        ;; Validate creator is not zero address - removed problematic validation
        
        ;; Register the market
        (map-set market-registry chat-room-id {
            vending-machine: vending-machine,
            token-contract: token-contract,
            creator: creator,
            created-at: burn-block-height
        })
        
        ;; Mark contracts as registered
        (map-set registered-vending-machines vending-machine true)
        (map-set registered-tokens token-contract true)
        
        ;; Increment counter
        (var-set total-markets (+ (var-get total-markets) u1))
        
        (ok {
            chat-room-id: chat-room-id,
            vending-machine: vending-machine,
            token-contract: token-contract
        })
    )
)

;; Look up market by chat room ID
(define-read-only (get-market (chat-room-id (string-ascii 256)))
    (ok (map-get? market-registry chat-room-id))
)

;; Get market by vending machine address
(define-read-only (get-market-by-vending-machine (vending-machine principal))
    (ok (map-get? registered-vending-machines vending-machine))
)

;; Check if a chat room has a market
(define-read-only (has-market (chat-room-id (string-ascii 256)))
    (ok (is-some (map-get? market-registry chat-room-id)))
)

;; Get total number of markets
(define-read-only (get-total-markets)
    (ok (var-get total-markets))
)

;; Administrative function to remove a market (if needed)
(define-public (unregister-market (chat-room-id (string-ascii 256)))
    (let
        (
            (market-data (unwrap! (map-get? market-registry chat-room-id) err-not-found))
            (vending-machine-addr (get vending-machine market-data))
            (token-contract-addr (get token-contract market-data))
        )
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        
        ;; Remove from registry
        (map-delete market-registry chat-room-id)
        (map-delete registered-vending-machines vending-machine-addr)
        (map-delete registered-tokens token-contract-addr)
        
        ;; Decrement counter
        (var-set total-markets (- (var-get total-markets) u1))
        
        (ok true)
    )
)

;; Helper function to check if caller is a registered vending machine
(define-read-only (is-registered-vending-machine (contract principal))
    (default-to false (map-get? registered-vending-machines contract))
)