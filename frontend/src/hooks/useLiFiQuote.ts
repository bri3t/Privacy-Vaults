import { useState, useEffect, useRef } from 'react'
import { BASE_CHAIN_ID, BASE_USDC_ADDRESS } from '../constants/chains.ts'

const LIFI_API = 'https://li.quest/v1'

export interface LiFiQuote {
  id: string
  transactionRequest: {
    to: string
    data: string
    value: string
    gasLimit: string
    chainId: number
  }
  estimate: {
    toAmount: string
    toAmountMin: string
    executionDuration: number // seconds
    feeCosts: Array<{ amount: string; token: { symbol: string } }>
    gasCosts: Array<{ amount: string; token: { symbol: string } }>
  }
  action: {
    fromToken: { symbol: string; decimals: number }
    toToken: { symbol: string; decimals: number }
  }
}

interface UseLiFiQuoteProps {
  fromAmount: string // USDC amount in smallest units (e.g. "1000000" for 1 USDC)
  fromAddress: string
  toChainId: number
  toTokenAddress: string
  enabled: boolean
}

export function useLiFiQuote({ fromAmount, fromAddress, toChainId, toTokenAddress, enabled }: UseLiFiQuoteProps) {
  const [quote, setQuote] = useState<LiFiQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!enabled || !fromAmount || fromAmount === '0' || !fromAddress || !toChainId || !toTokenAddress) {
      setQuote(null)
      setError(null)
      return
    }

    // Don't fetch if same chain and same token
    if (toChainId === BASE_CHAIN_ID && toTokenAddress.toLowerCase() === BASE_USDC_ADDRESS.toLowerCase()) {
      setQuote(null)
      setError(null)
      return
    }

    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          fromChain: BASE_CHAIN_ID.toString(),
          toChain: toChainId.toString(),
          fromToken: BASE_USDC_ADDRESS,
          toToken: toTokenAddress,
          fromAmount,
          fromAddress,
        })

        const res = await fetch(`${LIFI_API}/quote?${params}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || `LI.FI quote failed (${res.status})`)
        }

        const data = await res.json()
        setQuote(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to fetch quote')
        setQuote(null)
      } finally {
        setIsLoading(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fromAmount, fromAddress, toChainId, toTokenAddress, enabled])

  return { quote, isLoading, error }
}
