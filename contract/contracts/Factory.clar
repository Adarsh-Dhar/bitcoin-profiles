;; Factory Contract - Deploys new creator markets
;; Allows any creator to launch their own key market

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u300))
(define-constant err-market-exists (err u301))
(define-constant err-deployment-failed (err u302))

;; Data Variables
(define-data-var protocol-treasury principal tx-sender)
(define-data-var market-count uint u0)

;; Template contract principals (these would be set to actual deployed template contracts)
(define-data-var key-token-template principal tx-sender)
(define-data-var vending-machine-template principal tx-sender)

;; Data Maps
;; Maps creator address to their market contracts
(define-map creator-markets 
  principal 
  {
    token-contract: principal,
    vending-machine: principal,
    created-at: uint,
    market-id: uint
  }
)

;; Maps market ID to creator (reverse lookup)
(define-map market-to-creator uint principal)

;; Read-only functions

(define-read-only (get-creator-market (creator principal))
  (map-get? creator-markets creator)
)

(define-read-only (get-market-creator (market-id uint))
  (map-get? market-to-creator market-id)
)

(define-read-only (get-market-count)
  (ok (var-get market-count))
)

(define-read-only (has-market (creator principal))
  (is-some (map-get? creator-markets creator))
)

;; Main factory function
(define-public (create-market (token-name (string-ascii 32)) (token-symbol (string-ascii 10)) (token-uri (optional (string-utf8 256))))
  (let (
    (creator tx-sender)
    (market-id (+ (var-get market-count) u1))
    (block-height block-height)
  )
    ;; Check if creator already has a market
    (asserts! (not (has-market creator)) err-market-exists)
    
    ;; In a real implementation, you would deploy new contract instances here
    ;; This is a simplified version that shows the structure
    ;; Actual deployment would use contract deployment functions specific to Stacks
    
    ;; For now, we'll register a placeholder - in production, you'd deploy actual contracts
    (let (
      ;; These would be the newly deployed contract addresses
      (new-token-contract (generate-contract-address market-id "token"))
      (new-vending-machine (generate-contract-address market-id "vending"))
    )
      
      ;; Register the new market
      (map-set creator-markets creator {
        token-contract: new-token-contract,
        vending-machine: new-vending-machine,
        created-at: block-height,
        market-id: market-id
      })
      
      (map-set market-to-creator market-id creator)
      (var-set market-count market-id)
      
      ;; Initialize the contracts (in production, these would be actual contract calls)
      ;; (try! (contract-call? new-token-contract set-authorized-minter new-vending-machine))
      ;; (try! (contract-call? new-token-contract set-token-metadata token-name token-symbol token-uri))
      ;; (try! (contract-call? new-vending-machine initialize creator (var-get protocol-treasury) new-token-contract))
      
      (print {
        type: "market-created",
        creator: creator,
        market-id: market-id,
        token-contract: new-token-contract,
        vending-machine: new-vending-machine,
        token-name: token-name,
        token-symbol: token-symbol,
        created-at: block-height
      })
      
      (ok {
        market-id: market-id,
        token-contract: new-token-contract,
        vending-machine: new-vending-machine
      })
    )
  )
)

;; Helper function to generate deterministic contract addresses
;; In production, this would use actual contract deployment
(define-private (generate-contract-address (market-id uint) (contract-type (string-ascii 10)))
  ;; This is a placeholder - actual implementation would deploy real contracts
  ;; and return their addresses
  tx-sender ;; Placeholder return
)

;; Admin functions

(define-public (set-protocol-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set protocol-treasury new-treasury)
    (ok true)
  )
)

(define-public (set-templates (token-template principal) (vending-template principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set key-token-template token-template)
    (var-set vending-machine-template vending-template)
    (ok true)
  )
)

;; Emergency pause function (optional, for additional security)
(define-data-var is-paused bool false)

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set is-paused paused)
    (ok true)
  )
)

(define-read-only (get-paused)
  (var-get is-paused)
)