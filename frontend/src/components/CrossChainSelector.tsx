import { useState, useRef, useEffect } from 'react'
import { SUPPORTED_CHAINS, COMMON_TOKENS, BASE_CHAIN_ID, type ChainConfig, type TokenConfig } from '../constants/chains.ts'
import type { LiFiQuote } from '../hooks/lifi/useLiFiQuote.ts'

interface CrossChainSelectorProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  selectedChain: ChainConfig
  onChainChange: (chain: ChainConfig) => void
  selectedToken: TokenConfig
  onTokenChange: (token: TokenConfig) => void
  quote: LiFiQuote | null
  isLoadingQuote: boolean
  quoteError: string | null
  isTestnet?: boolean
}

export function CrossChainSelector({
  enabled,
  onToggle,
  selectedChain,
  onChainChange,
  selectedToken,
  onTokenChange,
  quote,
  isLoadingQuote,
  quoteError,
  isTestnet = false,
}: CrossChainSelectorProps) {
  const destinationChains = SUPPORTED_CHAINS.filter((c) => c.chainId !== BASE_CHAIN_ID)
  const tokens = COMMON_TOKENS[selectedChain.chainId] || []

  const [chainOpen, setChainOpen] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(false)
  const chainRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) setChainOpen(false)
      if (tokenRef.current && !tokenRef.current.contains(e.target as Node)) setTokenOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChainSelect = (chain: ChainConfig) => {
    onChainChange(chain)
    setChainOpen(false)
    const chainTokens = COMMON_TOKENS[chain.chainId] || []
    const usdc = chainTokens.find((t) => t.symbol === 'USDC')
    if (usdc) onTokenChange(usdc)
  }

  const handleTokenSelect = (token: TokenConfig) => {
    onTokenChange(token)
    setTokenOpen(false)
  }

  const estimatedAmount = quote
    ? (Number(quote.estimate.toAmount) / 10 ** quote.action.toToken.decimals).toFixed(
        quote.action.toToken.decimals > 6 ? 4 : 2,
      )
    : null

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-tertiary)]">Cross-chain withdrawal</span>
          {isTestnet && (
            <span className="relative group flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Disabled on testnet
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="cursor-help">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-amber-500/20 text-xs text-amber-300 leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-20 shadow-lg">
                Cross-chain bridging via LI.FI is only available on mainnet. The UI is shown for preview only.
              </span>
            </span>
          )}
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-primary)]'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-primary)]">
          {/* Header row: "To" label + chain selector */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs text-[var(--text-muted)] font-medium">To</span>

            {/* Chain dropdown */}
            <div ref={chainRef} className="relative">
              <button
                onClick={() => { setChainOpen(!chainOpen); setTokenOpen(false) }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <img src={selectedChain.logoUrl} alt={selectedChain.name} className="w-4 h-4 rounded-full" />
                <span className="text-sm text-[var(--text-secondary)] font-medium">{selectedChain.name}</span>
                <ChevronDown />
              </button>

              {chainOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-xl shadow-black/40 z-20 py-1 overflow-hidden backdrop-blur-xl">
                  {destinationChains.map((chain) => (
                    <button
                      key={chain.chainId}
                      onClick={() => handleChainSelect(chain)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        selectedChain.chainId === chain.chainId
                          ? 'bg-white/10 text-[var(--text-primary)]'
                          : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <img src={chain.logoUrl} alt={chain.name} className="w-5 h-5 rounded-full" />
                      {chain.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Token selector + estimated amount */}
          <div className="px-4 pb-4">
            {/* Token dropdown */}
            <div ref={tokenRef} className="relative inline-block">
              <button
                onClick={() => { setTokenOpen(!tokenOpen); setChainOpen(false) }}
                className="flex items-center gap-2 py-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors pr-1"
              >
                <img src={selectedToken.logoUrl} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                <span className="text-base text-[var(--text-primary)] font-semibold">{selectedToken.symbol}</span>
                <ChevronDown />
              </button>

              {tokenOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-xl shadow-black/40 z-20 py-1 overflow-hidden backdrop-blur-xl">
                  {tokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenSelect(token)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        selectedToken.symbol === token.symbol
                          ? 'bg-white/10 text-[var(--text-primary)]'
                          : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <img src={token.logoUrl} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-[var(--text-muted)] text-xs ml-auto">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Estimated amount */}
            <div className="mt-1">
              {isLoadingQuote && (
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                  <span className="text-sm">Fetching quote...</span>
                </div>
              )}

              {quoteError && (
                <p className="text-sm text-red-400">{quoteError}</p>
              )}

              {estimatedAmount && !isLoadingQuote && !quoteError && (
                <p className="text-xl text-[var(--text-tertiary)] font-medium tabular-nums">
                  ~{estimatedAmount}
                </p>
              )}
            </div>

            {/* Est. time */}
            {quote && !isLoadingQuote && !quoteError && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Est. {Math.ceil(quote.estimate.executionDuration / 60)} min via LI.FI
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-muted)]">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
