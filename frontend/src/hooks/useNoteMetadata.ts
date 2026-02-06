import { useState, useEffect } from 'react'
import { decodeNote } from '../zk/note.ts'
import { bytesToHex } from '../zk/utils.ts'
import { getBarretenberg } from '../zk/barretenberg.ts'
import { formatRelativeTime } from './useVaultStats.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

export interface NoteMetadata {
  isValid: boolean
  amount: string
  depositTime: number
  timePassed: string
  leafIndex: number
  totalDeposits: number
  depositsAfter: number
  yieldIndex: string
  isLoading: boolean
  error: string | null
}

const initialState: NoteMetadata = {
  isValid: false,
  amount: '',
  depositTime: 0,
  timePassed: '',
  leafIndex: -1,
  totalDeposits: 0,
  depositsAfter: 0,
  yieldIndex: '',
  isLoading: false,
  error: null,
}

export function useNoteMetadata(
  noteHex: string,
  vaultAddress: string,
  denomination: number,
  displayAmount: number,
): NoteMetadata {
  const [state, setState] = useState<NoteMetadata>(initialState)

  useEffect(() => {
    // Reset if note is empty
    if (!noteHex.trim()) {
      setState(initialState)
      return
    }

    // Quick validation: note should be 258 chars (0x + 256 hex chars)
    const trimmed = noteHex.trim()
    const hexPart = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    if (hexPart.length !== 256) {
      setState(initialState)
      return
    }

    let cancelled = false

    async function fetchMetadata() {
      setState((s) => ({ ...s, isLoading: true, error: null }))

      try {
        // Step 1: Decode note
        const { commitment, yieldIndex: yieldIndexBytes } = decodeNote(trimmed)
        const yieldIndexHex = bytesToHex(yieldIndexBytes)

        // Step 2: Compute final commitment using Barretenberg
        const bb = await getBarretenberg()
        const { hash: finalCommitment } = await bb.poseidon2Hash({
          inputs: [commitment, yieldIndexBytes],
        })
        const commitmentHex = bytesToHex(finalCommitment)

        if (cancelled) return

        // Step 3: Fetch commitments from backend
        const commitmentsRes = await fetch(
          `${RELAYER_URL}/api/vault/commitments?vaultAddress=${encodeURIComponent(vaultAddress)}`,
        )
        if (!commitmentsRes.ok) {
          throw new Error('Failed to fetch commitments')
        }
        const { commitments } = (await commitmentsRes.json()) as { commitments: string[] }

        if (cancelled) return

        // Step 4: Find leafIndex
        const leafIndex = commitments.indexOf(commitmentHex)
        if (leafIndex === -1) {
          throw new Error('Note not found in this vault')
        }

        // Step 5: Fetch stats to get timestamp
        const statsRes = await fetch(
          `${RELAYER_URL}/api/vault/stats?vaultAddress=${encodeURIComponent(vaultAddress)}`,
        )
        if (!statsRes.ok) {
          throw new Error('Failed to fetch vault stats')
        }
        const { deposits } = (await statsRes.json()) as {
          deposits: { leafIndex: number; timestamp: number }[]
        }

        if (cancelled) return

        // Step 6: Find deposit entry by leafIndex
        const depositEntry = deposits.find((d) => d.leafIndex === leafIndex)
        if (!depositEntry) {
          throw new Error('Deposit timestamp not found')
        }

        const totalDeposits = commitments.length
        const depositsAfter = totalDeposits - leafIndex - 1

        setState({
          isValid: true,
          amount: `${displayAmount} USDC`,
          depositTime: depositEntry.timestamp,
          timePassed: formatRelativeTime(depositEntry.timestamp),
          leafIndex,
          totalDeposits,
          depositsAfter,
          yieldIndex: yieldIndexHex,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Invalid note'
        setState({
          ...initialState,
          error: message,
        })
      }
    }

    fetchMetadata()

    return () => {
      cancelled = true
    }
  }, [noteHex, vaultAddress, denomination, displayAmount])

  return state
}
