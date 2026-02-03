import { useState, useCallback, useRef } from 'react'
import { useSendTransaction } from 'wagmi'
import type { LiFiQuote } from './useLiFiQuote.ts'

const LIFI_API = 'https://li.quest/v1'

export type BridgeStep = 'idle' | 'approving' | 'bridging' | 'polling' | 'complete' | 'error'

interface BridgeState {
  step: BridgeStep
  txHash: string | null
  error: string | null
}

export function useLiFiBridge() {
  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const { sendTransactionAsync } = useSendTransaction()
  const pollingRef = useRef<ReturnType<typeof setInterval>>(null)

  const bridge = useCallback(async (quote: LiFiQuote) => {
    try {
      setState({ step: 'bridging', txHash: null, error: null })

      const tx = quote.transactionRequest
      const txHash = await sendTransactionAsync({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || '0'),
        chainId: tx.chainId,
      })

      setState((s) => ({ ...s, step: 'polling', txHash }))

      // Poll LI.FI status API
      await new Promise<void>((resolve, reject) => {
        let attempts = 0
        pollingRef.current = setInterval(async () => {
          attempts++
          if (attempts > 120) { // ~10 minutes
            if (pollingRef.current) clearInterval(pollingRef.current)
            reject(new Error('Bridge timeout — check your wallet for status'))
            return
          }

          try {
            const params = new URLSearchParams({
              txHash,
              bridge: 'lifi',
              fromChain: quote.transactionRequest.chainId.toString(),
            })
            const res = await fetch(`${LIFI_API}/status?${params}`)
            if (!res.ok) return // Retry on error

            const data = await res.json()
            if (data.status === 'DONE') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              resolve()
            } else if (data.status === 'FAILED') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              reject(new Error('Bridge transaction failed'))
            }
          } catch {
            // Ignore polling errors, will retry
          }
        }, 5000)
      })

      setState({ step: 'complete', txHash, error: null })
    } catch (err) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      const message = err instanceof Error ? err.message : 'Bridge failed'
      setState((s) => ({ ...s, step: 'error', error: message }))
    }
  }, [sendTransactionAsync])

  const reset = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, bridge, reset }
}
