import { useState, useEffect, useCallback } from 'react'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

interface DepositEntry {
  leafIndex: number
  timestamp: number
}

interface VaultStats {
  deposits: DepositEntry[]
  totalDeposits: number
  isLoading: boolean
  error: string | null
}

function formatRelativeTime(timestampSec: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestampSec

  if (diff < 60) return 'just now'
  if (diff < 3600) {
    const mins = Math.floor(diff / 60)
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }
  const days = Math.floor(diff / 86400)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

export function useVaultStats(vaultAddress: string | undefined): VaultStats {
  const [deposits, setDeposits] = useState<DepositEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (address: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${RELAYER_URL}/api/vault/stats?vaultAddress=${address}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setDeposits(data.deposits ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setDeposits([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!vaultAddress) return
    fetchStats(vaultAddress)
  }, [vaultAddress, fetchStats])

  return {
    deposits,
    totalDeposits: deposits.length,
    isLoading,
    error,
  }
}

export { formatRelativeTime }
export type { DepositEntry }
