import { useState, useEffect } from 'react'
import type { YieldPoolIds } from '../contracts/addresses.ts'

export function useYieldApy(pools?: YieldPoolIds) {
  const [blendedApy, setBlendedApy] = useState<number | null>(null)

  useEffect(() => {
    if (!pools) return

    const controller = new AbortController()

    async function fetchApy() {
      try {
        const [aaveRes, morphoRes] = await Promise.all([
          fetch(`https://yields.llama.fi/chart/${pools!.aave}`, { signal: controller.signal }),
          fetch(`https://yields.llama.fi/chart/${pools!.morpho}`, { signal: controller.signal }),
        ])

        if (!aaveRes.ok || !morphoRes.ok) return

        const aaveData = await aaveRes.json()
        const morphoData = await morphoRes.json()

        const aaveApy = aaveData.data?.at(-1)?.apy ?? null
        const morphoApy = morphoData.data?.at(-1)?.apy ?? null

        if (aaveApy != null && morphoApy != null) {
          setBlendedApy((aaveApy + morphoApy) / 2)
        } else if (aaveApy != null) {
          setBlendedApy(aaveApy)
        } else if (morphoApy != null) {
          setBlendedApy(morphoApy)
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchApy()
    return () => controller.abort()
  }, [pools?.aave, pools?.morpho])

  return { blendedApy }
}
