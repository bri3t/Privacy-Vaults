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
        <div className="space-y-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500">
            Withdraw on Base first, then bridge to your destination chain.
          </p>

          {/* Chain selector */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Destination chain</label>
            <div className="flex gap-2">
              {destinationChains.map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => {
                    onChainChange(chain)
                    // Auto-select USDC on the new chain
                    const chainTokens = COMMON_TOKENS[chain.chainId] || []
                    const usdc = chainTokens.find((t) => t.symbol === 'USDC')
                    if (usdc) onTokenChange(usdc)
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                    selectedChain.chainId === chain.chainId
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {chain.shortName}
                </button>
              ))}
            </div>
          </div>

          {/* Token selector */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Receive as</label>
            <div className="flex gap-2">
              {tokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => onTokenChange(token)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                    selectedToken.symbol === token.symbol
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Quote display */}
          {isLoadingQuote && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              Fetching route...
            </div>
          )}

          {quoteError && (
            <p className="text-xs text-red-400">{quoteError}</p>
          )}

          {quote && !isLoadingQuote && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>You receive</span>
                <span className="text-white font-medium">
                  ~{(Number(quote.estimate.toAmount) / 10 ** quote.action.toToken.decimals).toFixed(
                    quote.action.toToken.decimals > 6 ? 4 : 2,
                  )}{' '}
                  {quote.action.toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Est. time</span>
                <span>{Math.ceil(quote.estimate.executionDuration / 60)} min</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
