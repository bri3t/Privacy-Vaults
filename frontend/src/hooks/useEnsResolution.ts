import { useMemo } from 'react'
import { useEnsAddress, useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'

export function useEnsResolution(input: string) {
  const trimmed = input.trim()

  const isRawAddress = /^0x[0-9a-fA-F]{40}$/.test(trimmed)
  const isEnsName = !isRawAddress && trimmed.includes('.')

  const normalizedName = useMemo(() => {
    if (!isEnsName) return undefined
    try {
      return normalize(trimmed)
    } catch {
      return undefined
    }
  }, [trimmed, isEnsName])

  const { data: ensAddress, isLoading: isLoadingAddress, isError: isAddressError } = useEnsAddress({
    name: normalizedName,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: avatar } = useEnsAvatar({
    name: normalizedName,
    chainId: 1,
    query: { enabled: !!normalizedName && !!ensAddress },
  })

  if (isRawAddress) {
    return { resolvedAddress: trimmed, ensName: null, avatar: null, isResolving: false, ensNotFound: false }
  }

  if (!isEnsName || !normalizedName) {
    return { resolvedAddress: null, ensName: null, avatar: null, isResolving: false, ensNotFound: false }
  }

  return {
    resolvedAddress: ensAddress ?? null,
    ensName: ensAddress ? trimmed : null,
    avatar: avatar ?? null,
    isResolving: isLoadingAddress,
    ensNotFound: !isLoadingAddress && (isAddressError || !ensAddress),
  }
}
