import { useMemo } from 'react'
import { useNetworkMode } from '../contexts/NetworkModeContext.tsx'
import { NETWORK_CONFIGS, type NetworkConfig } from '../contracts/addresses.ts'

export function useNetworkConfig(): NetworkConfig {
  const { mode } = useNetworkMode()
  return useMemo(() => NETWORK_CONFIGS[mode], [mode])
}
