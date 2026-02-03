import { useState, useEffect } from 'react'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'
import { SUPPORTED_CHAINS, COMMON_TOKENS, type ChainConfig, type TokenConfig } from '../constants/chains.ts'

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export interface WithdrawPreferences {
  chain: ChainConfig | null
  token: TokenConfig | null
}

export function useEnsWithdrawPreferences(ensName: string | null) {
  const [preferences, setPreferences] = useState<WithdrawPreferences>({ chain: null, token: null })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!ensName) {
      setPreferences({ chain: null, token: null })
      return
    }

    let cancelled = false

    async function fetchPreferences() {
      setIsLoading(true)
      try {
        const normalizedName = normalize(ensName!)

        // Read text records in parallel
        const [chainValue, tokenValue] = await Promise.all([
          mainnetClient.getEnsText({ name: normalizedName, key: 'privacy-vault.chain' }).catch(() => null),
          mainnetClient.getEnsText({ name: normalizedName, key: 'privacy-vault.token' }).catch(() => null),
        ])

        if (cancelled) return

        let chain: ChainConfig | null = null
        let token: TokenConfig | null = null

        // Parse chain preference (stored as chain ID string)
        if (chainValue) {
          const chainId = parseInt(chainValue, 10)
          chain = SUPPORTED_CHAINS.find((c) => c.chainId === chainId) ?? null
        }

        // Parse token preference (stored as token symbol)
        if (tokenValue && chain) {
          const tokens = COMMON_TOKENS[chain.chainId] || []
          token = tokens.find((t) => t.symbol.toLowerCase() === tokenValue.toLowerCase()) ?? null
        }

        setPreferences({ chain, token })
      } catch {
        if (!cancelled) setPreferences({ chain: null, token: null })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPreferences()
    return () => { cancelled = true }
  }, [ensName])

  return { preferences, isLoading }
}
