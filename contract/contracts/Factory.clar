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

;; Data Maps
;; Maps creator address to their market ID
(define-map creator-markets principal uint)

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
    
    ;; Register the new market
    (map-set creator-markets creator market-id)
    (map-set market-to-creator market-id creator)
    (var-set market-count market-id)
    
    (print {
      type: "market-created",
      creator: creator,
      market-id: market-id,
      token-name: token-name,
      token-symbol: token-symbol,
      created-at: block-height
    })
    
    (ok {
      market-id: market-id,
      creator: creator
    })
  )
)


;; Admin functions

(define-public (set-protocol-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set protocol-treasury new-treasury)
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