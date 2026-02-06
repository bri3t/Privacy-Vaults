import { useState, useEffect } from 'react'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

interface WithdrawPreview {
  payout: string
  fee: string
  received: string
  feeBps: number
  isLoading: boolean
}

const initialState: WithdrawPreview = {
  payout: '',
  fee: '',
  received: '',
  feeBps: 0,
  isLoading: false,
}

export function useWithdrawPreview(
  vaultAddress: string,
  denomination: bigint,
  noteYieldIndex: string,
  isNoteValid: boolean,
): WithdrawPreview {
  const [state, setState] = useState<WithdrawPreview>(initialState)

  useEffect(() => {
    if (!isNoteValid || !noteYieldIndex) {
      setState(initialState)
      return
    }

    let cancelled = false

    async function fetchPreview() {
      setState((s) => ({ ...s, isLoading: true }))

      try {
        const [feeRes, yieldRes] = await Promise.all([
          fetch(`${RELAYER_URL}/api/vault/fee?vaultAddress=${encodeURIComponent(vaultAddress)}`),
          fetch(`${RELAYER_URL}/api/vault/yield-index?vaultAddress=${encodeURIComponent(vaultAddress)}`),
        ])

        if (!feeRes.ok || !yieldRes.ok) {
          throw new Error('Failed to fetch preview data')
        }

        const { feeBps } = (await feeRes.json()) as { feeBps: number }
        const { yieldIndex: currentYieldIndex } = (await yieldRes.json()) as { yieldIndex: string }

        if (cancelled) return

        const noteYI = BigInt(noteYieldIndex)
        const currentYI = BigInt(currentYieldIndex)

        const payout = (denomination * currentYI) / noteYI
        const fee = (payout * BigInt(feeBps)) / 10000n
        const received = payout - fee

        const format = (v: bigint) => `${(Number(v) / 1e6).toFixed(2)} USDC`

        setState({
          payout: format(payout),
          fee: format(fee),
          received: format(received),
          feeBps,
          isLoading: false,
        })
      } catch {
        if (cancelled) return
        setState(initialState)
      }
    }

    fetchPreview()

    return () => {
      cancelled = true
    }
  }, [vaultAddress, denomination, noteYieldIndex, isNoteValid])

  return state
}
