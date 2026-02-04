import { useState, useRef, useEffect } from 'react'
import { SUPPORTED_CHAINS, COMMON_TOKENS, BASE_CHAIN_ID, type ChainConfig, type TokenConfig } from '../constants/chains.ts'
import type { LiFiQuote } from '../hooks/useLiFiQuote.ts'

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
        <span className="text-sm text-zinc-400">Cross-chain withdrawal</span>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-violet-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          {/* Header row: "To" label + chain selector */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs text-zinc-500 font-medium">To</span>

            {/* Chain dropdown */}
            <div ref={chainRef} className="relative">
              <button
                onClick={() => { setChainOpen(!chainOpen); setTokenOpen(false) }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-700/50 transition-colors"
              >
                <img src={selectedChain.logoUrl} alt={selectedChain.name} className="w-4 h-4 rounded-full" />
                <span className="text-sm text-zinc-300 font-medium">{selectedChain.name}</span>
                <ChevronDown />
              </button>

              {chainOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-20 py-1 overflow-hidden">
                  {destinationChains.map((chain) => (
                    <button
                      key={chain.chainId}
                      onClick={() => handleChainSelect(chain)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        selectedChain.chainId === chain.chainId
                          ? 'bg-violet-500/15 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
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
                className="flex items-center gap-2 py-1 rounded-lg hover:bg-zinc-700/50 transition-colors pr-1"
              >
                <img src={selectedToken.logoUrl} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                <span className="text-base text-white font-semibold">{selectedToken.symbol}</span>
                <ChevronDown />
              </button>

              {tokenOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-20 py-1 overflow-hidden">
                  {tokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenSelect(token)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        selectedToken.symbol === token.symbol
                          ? 'bg-violet-500/15 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <img src={token.logoUrl} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-zinc-600 text-xs ml-auto">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Estimated amount */}
            <div className="mt-1">
              {isLoadingQuote && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  <span className="text-sm">Fetching quote...</span>
                </div>
              )}

              {quoteError && (
                <p className="text-sm text-red-400">{quoteError}</p>
              )}

              {estimatedAmount && !isLoadingQuote && !quoteError && (
                <p className="text-xl text-zinc-400 font-medium tabular-nums">
                  ~{estimatedAmount}
                </p>
              )}
            </div>

            {/* Est. time */}
            {quote && !isLoadingQuote && !quoteError && (
              <p className="text-xs text-zinc-600 mt-1">
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
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-500">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
