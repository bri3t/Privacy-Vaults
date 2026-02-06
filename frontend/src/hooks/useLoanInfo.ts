import { useState, useEffect } from 'react'
import { decodeNote } from '../zk/note.ts'
import { computeCollateralNullifierHash } from '../zk/proof.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

interface LoanInfo {
  debt: string
  fee: string
  repaymentAmount: string
  loan: {
    principalAmount: string
    borrowYieldIndex: string
    depositYieldIndex: string
    active: boolean
  } | null
  collateralNullifierHash: string | null
  isLoading: boolean
  error: string | null
}

export function useLoanInfo(noteInput: string, vaultAddress: string) {
  const [info, setInfo] = useState<LoanInfo>({
    debt: '0',
    fee: '0',
    repaymentAmount: '0',
    loan: null,
    collateralNullifierHash: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    const trimmed = noteInput.trim()
    if (!trimmed || trimmed.length !== 258) {
      setInfo({ debt: '0', fee: '0', repaymentAmount: '0', loan: null, collateralNullifierHash: null, isLoading: false, error: null })
      return
    }

    let cancelled = false

    async function fetchLoan() {
      setInfo((s) => ({ ...s, isLoading: true, error: null }))
      try {
        const { nullifier } = decodeNote(trimmed)
        const collateralNullifierHash = await computeCollateralNullifierHash(nullifier)

        const res = await fetch(
          `${RELAYER_URL}/api/vault/loan?vaultAddress=${encodeURIComponent(vaultAddress)}&collateralNullifierHash=${encodeURIComponent(collateralNullifierHash)}`,
        )
        if (!res.ok) throw new Error('Failed to fetch loan info')
        const data = await res.json()

        if (!cancelled) {
          setInfo({
            debt: data.debt,
            fee: data.fee ?? '0',
            repaymentAmount: data.repaymentAmount ?? data.debt,
            loan: data.loan,
            collateralNullifierHash,
            isLoading: false,
            error: null,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setInfo((s) => ({
            ...s,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }))
        }
      }
    }

    fetchLoan()
    return () => { cancelled = true }
  }, [noteInput, vaultAddress])

  return info
}
