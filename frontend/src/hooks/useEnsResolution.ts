import { useState, useEffect, useRef } from 'react'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export function useEnsResolution(input: string) {
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [ensName, setEnsName] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const trimmed = input.trim()

    // Reset if empty
    if (!trimmed) {
      setResolvedAddress(null)
      setEnsName(null)
      return
    }

    // If it's already a valid address, no resolution needed
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setResolvedAddress(trimmed)
      setEnsName(null)
      return
    }

    // If it looks like an ENS name (contains a dot)
    if (!trimmed.includes('.')) {
      setResolvedAddress(null)
      setEnsName(null)
      return
    }

    // Debounce ENS resolution
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsResolving(true)
      try {
        const address = await mainnetClient.getEnsAddress({
          name: normalize(trimmed),
        })
        if (address) {
          setResolvedAddress(address)
          setEnsName(trimmed)
        } else {
          setResolvedAddress(null)
          setEnsName(null)
        }
      } catch {
        setResolvedAddress(null)
        setEnsName(null)
      } finally {
        setIsResolving(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input])

  return { resolvedAddress, ensName, isResolving }
}
