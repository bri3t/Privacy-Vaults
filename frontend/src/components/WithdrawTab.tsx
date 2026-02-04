import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { OpenfortButton } from '@openfort/react'
import { useWithdraw } from '../hooks/useWithdraw.ts'
import { StatusIndicator } from './StatusIndicator.tsx'
import { CrossChainSelector } from './CrossChainSelector.tsx'
import { useLiFiQuote } from '../hooks/useLiFiQuote.ts'
import { useLiFiBridge } from '../hooks/useLiFiBridge.ts'
import { useEnsResolution } from '../hooks/useEnsResolution.ts'
import { useEnsWithdrawPreferences } from '../hooks/useEnsWithdrawPreferences.ts'
import { SUPPORTED_CHAINS, COMMON_TOKENS, type ChainConfig, type TokenConfig } from '../constants/chains.ts'
import type { VaultConfig, NetworkConfig } from '../contracts/addresses.ts'
import { useNetworkMode } from '../contexts/NetworkModeContext.tsx'

const WITHDRAW_STEPS = [
  { key: 'fetching-events', label: 'Fetching deposit events' },
  { key: 'building-tree', label: 'Building Merkle tree' },
  { key: 'generating-proof', label: 'Generating ZK proof' },
  { key: 'submitting', label: 'Submitting transaction' },
]

const BRIDGE_STEPS = [
  { key: 'bridging', label: 'Signing bridge transaction' },
  { key: 'polling', label: 'Waiting for bridge confirmation' },
]

const defaultChain = SUPPORTED_CHAINS.find((c) => c.chainId === 1) ?? SUPPORTED_CHAINS[0]
const defaultToken = COMMON_TOKENS[defaultChain.chainId]?.find((t) => t.symbol === 'USDC') ?? COMMON_TOKENS[defaultChain.chainId]?.[0]

export function WithdrawTab({ selectedVault, networkConfig }: { selectedVault: VaultConfig; networkConfig: NetworkConfig }) {
  const { isTestnet } = useNetworkMode()
  const [noteInput, setNoteInput] = useState('')
  const [recipient, setRecipient] = useState('')
  const [crossChainEnabled, setCrossChainEnabled] = useState(false)
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(defaultChain)
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(defaultToken)
  const { address, isConnected } = useAccount()
  const { step, txHash, error, withdraw, reset } = useWithdraw(selectedVault.address)
  const { step: bridgeStep, txHash: bridgeTxHash, error: bridgeError, bridge, reset: bridgeReset } = useLiFiBridge()

  // ENS resolution
  const { resolvedAddress, ensName, isResolving } = useEnsResolution(recipient)
  const { preferences, isLoading: isLoadingPrefs } = useEnsWithdrawPreferences(ensName)

  // Auto-populate cross-chain settings from ENS text records
  useEffect(() => {
    if (preferences.chain) {
      setCrossChainEnabled(true)
      setSelectedChain(preferences.chain)
      if (preferences.token) {
        setSelectedToken(preferences.token)
      }
    }
  }, [preferences])

  // Use resolved address for the actual withdrawal
  const effectiveRecipient = resolvedAddress || recipient

  const effectiveCrossChain = crossChainEnabled && !isTestnet

  const { quote, isLoading: isLoadingQuote, error: quoteError } = useLiFiQuote({
    fromAmount: selectedVault.denomination.toString(),
    fromAddress: address || '',
    toChainId: selectedChain.chainId,
    toTokenAddress: selectedToken.address,
    enabled: effectiveCrossChain && isConnected && !!address,
  })

  const isActive =
    step !== 'idle' && step !== 'done' && step !== 'error'
  const isBridging = bridgeStep !== 'idle' && bridgeStep !== 'complete' && bridgeStep !== 'error'

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = (reader.result as string).trim()
      setNoteInput(text)
    }
    reader.readAsText(file)
  }

  const handleWithdraw = () => {
    if (!noteInput.trim() || !effectiveRecipient.trim()) return
    withdraw(noteInput.trim(), effectiveRecipient.trim())
  }

  return (
    <div className="space-y-5">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Paste your withdrawal note and specify the recipient address to
        withdraw {selectedVault.label} from the vault.
      </p>

      <div className="space-y-2">
        <label className="text-sm text-zinc-300 font-medium">
          Withdrawal Note
        </label>
        <textarea
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="0x..."
          rows={3}
          disabled={isActive}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/60 transition-colors"
        />
        <label className="block">
          <span className="text-xs text-zinc-500 cursor-pointer hover:text-violet-400 transition-colors">
            Or upload a .txt file
          </span>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isActive}
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-300 font-medium">Recipient</label>
        <div className="flex gap-2">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x... or name.eth"
            disabled={isActive}
            className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          {address && (
            <button
              onClick={() => setRecipient(address)}
              disabled={isActive}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-xl text-xs font-medium whitespace-nowrap border border-zinc-700 transition-colors"
            >
              Me
            </button>
          )}
        </div>
        {/* ENS resolution feedback */}
        {isResolving && (
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            Resolving ENS name...
          </p>
        )}
        {ensName && resolvedAddress && (
          <div className="space-y-1">
            <p className="text-xs text-violet-400">
              {ensName} &rarr; <span className="font-mono text-zinc-300">{resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}</span>
            </p>
            {isLoadingPrefs && (
              <p className="text-xs text-zinc-500">Loading withdrawal preferences...</p>
            )}
            {preferences.chain && (
              <p className="text-xs text-cyan-400">
                Preferences loaded: {preferences.chain.shortName}{preferences.token ? ` / ${preferences.token.symbol}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cross-chain selector (hidden in testnet mode) */}
      {!isTestnet && (
        <CrossChainSelector
          enabled={crossChainEnabled}
          onToggle={setCrossChainEnabled}
          selectedChain={selectedChain}
          onChainChange={setSelectedChain}
          selectedToken={selectedToken}
          onTokenChange={setSelectedToken}
          quote={quote}
          isLoadingQuote={isLoadingQuote}
          quoteError={quoteError}
        />
      )}

      {/* Action button */}
      {isConnected ? (
        <button
          onClick={handleWithdraw}
          disabled={isActive || isBridging || !noteInput.trim() || !effectiveRecipient.trim()}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isActive ? 'Processing...' : isBridging ? 'Bridging...' : `Withdraw ${selectedVault.label}`}
        </button>
      ) : (
        <div className="space-y-2">
          <OpenfortButton label="Log In to Withdraw" />
        </div>
      )}

      {/* Withdraw progress */}
      {step !== 'idle' && (
        <StatusIndicator
          steps={WITHDRAW_STEPS}
          currentStep={step}
          error={error}
        />
      )}

      {/* Bridge progress (step 2 of cross-chain) */}
      {bridgeStep !== 'idle' && (
        <StatusIndicator
          steps={BRIDGE_STEPS}
          currentStep={bridgeStep}
          error={bridgeError}
        />
      )}

      {/* Error retry */}
      {(step === 'error' || bridgeStep === 'error') && (
        <button
          onClick={() => { reset(); bridgeReset(); }}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
        >
          Try again
        </button>
      )}

      {/* Success — base chain withdraw done */}
      {step === 'done' && txHash && bridgeStep === 'idle' && !effectiveCrossChain && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-green-300 text-sm">
          Withdrawal successful!{' '}
          <a
            href={`${networkConfig.explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:underline font-medium"
          >
            View transaction
          </a>
        </div>
      )}

      {/* Success — withdraw done, trigger bridge */}
      {step === 'done' && txHash && effectiveCrossChain && bridgeStep === 'idle' && quote && (
        <div className="space-y-3">
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-green-300 text-sm">
            Step 1 complete — USDC withdrawn to your wallet on Base.
          </div>
          <button
            onClick={() => bridge(quote)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            Bridge to {selectedChain.name}
          </button>
        </div>
      )}

      {/* Bridge complete */}
      {bridgeStep === 'complete' && bridgeTxHash && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-green-300 text-sm">
          Bridge complete! Funds sent to {selectedChain.name}.{' '}
          <a
            href={`${selectedChain.explorerUrl}/tx/${bridgeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:underline font-medium"
          >
            View transaction
          </a>
        </div>
      )}
    </div>
  )
}
