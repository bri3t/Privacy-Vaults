import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type NetworkMode = 'testnet' | 'mainnet'

interface NetworkModeContextValue {
  mode: NetworkMode
  isMainnet: boolean
  isTestnet: boolean
  toggleMode: () => void
  setMode: (mode: NetworkMode) => void
}

const STORAGE_KEY = 'privacy-vault-network-mode'

function readStoredMode(): NetworkMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'mainnet' || stored === 'testnet') return stored
  } catch {}
  return 'testnet'
}

const NetworkModeContext = createContext<NetworkModeContextValue | null>(null)

export function NetworkModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<NetworkMode>(readStoredMode)

  const setMode = useCallback((m: NetworkMode) => {
    setModeState(m)
    try { localStorage.setItem(STORAGE_KEY, m) } catch {}
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'testnet' ? 'mainnet' : 'testnet')
  }, [mode, setMode])

  return (
    <NetworkModeContext.Provider
      value={{
        mode,
        isMainnet: mode === 'mainnet',
        isTestnet: mode === 'testnet',
        toggleMode,
        setMode,
      }}
    >
      {children}
    </NetworkModeContext.Provider>
  )
}

export function useNetworkMode() {
  const ctx = useContext(NetworkModeContext)
  if (!ctx) throw new Error('useNetworkMode must be used within NetworkModeProvider')
  return ctx
}
