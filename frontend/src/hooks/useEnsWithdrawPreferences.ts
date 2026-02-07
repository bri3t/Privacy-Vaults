import { useMemo } from 'react'
import { useEnsText } from 'wagmi'
import { normalize } from 'viem/ens'
import { SUPPORTED_CHAINS, COMMON_TOKENS, type ChainConfig, type TokenConfig } from '../constants/chains.ts'

export interface WithdrawPreferences {
  chain: ChainConfig | null
  token: TokenConfig | null
}

export function useEnsWithdrawPreferences(ensName: string | null) {
  const normalizedName = useMemo(() => {
    if (!ensName) return undefined
    try {
      return normalize(ensName)
    } catch {
      return undefined
    }
  }, [ensName])

  const { data: chainValue, isLoading: isLoadingChain } = useEnsText({
    name: normalizedName,
    key: 'privacy-vault.chain',
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: tokenValue, isLoading: isLoadingToken } = useEnsText({
    name: normalizedName,
    key: 'privacy-vault.token',
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const preferences = useMemo<WithdrawPreferences>(() => {
    let chain: ChainConfig | null = null
    let token: TokenConfig | null = null

    if (chainValue) {
      const chainId = parseInt(chainValue, 10)
      chain = SUPPORTED_CHAINS.find((c) => c.chainId === chainId) ?? null
    }

    if (tokenValue && chain) {
      const tokens = COMMON_TOKENS[chain.chainId] || []
      token = tokens.find((t) => t.symbol.toLowerCase() === tokenValue.toLowerCase()) ?? null
    }

    return { chain, token }
  }, [chainValue, tokenValue])

  return { preferences, isLoading: isLoadingChain || isLoadingToken }
}
