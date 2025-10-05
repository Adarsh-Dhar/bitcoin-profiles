;; Minimal Factory Contract for testing deployment

;; Constants
(define-constant contract-owner tx-sender)

;; Data Variables
(define-data-var market-count uint u0)

;; Data Maps
(define-map creator-markets principal uint)

;; Read-only functions
(define-read-only (get-market-count)
  (ok (var-get market-count))
)

(define-read-only (has-market (creator principal))
  (is-some (map-get? creator-markets creator))
)

;; Main factory function
(define-public (create-market (token-name (string-ascii 32)) (token-symbol (string-ascii 10)))
  (let (
    (creator tx-sender)
    (market-id (+ (var-get market-count) u1))
  )
    ;; Check if creator already has a market
    (asserts! (not (has-market creator)) (err u301))
    
    ;; Register the new market
    (map-set creator-markets creator market-id)
    (var-set market-count market-id)
    
    (ok {
      market-id: market-id,
      creator: creator
    })
  )
)
