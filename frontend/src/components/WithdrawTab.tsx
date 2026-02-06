import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { OpenfortButton } from '@openfort/react'
import { useWithdraw } from '../hooks/useWithdraw.ts'
import { useNoteMetadata } from '../hooks/useNoteMetadata.ts'
import { useWithdrawPreview } from '../hooks/useWithdrawPreview.ts'
import { ProgressModal } from './ProgressModal.tsx'
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
  const noteMetadata = useNoteMetadata(noteInput, selectedVault.address, Number(selectedVault.denomination), selectedVault.displayAmount)
  const preview = useWithdrawPreview(selectedVault.address, selectedVault.denomination, noteMetadata.yieldIndex, noteMetadata.isValid)

  // Snapshot recipient/ensName when withdraw starts (for success display)
  const successSnapshot = useRef<{ recipient: string; ensName: string | null }>({ recipient: '', ensName: null })

  // ENS resolution
  const { resolvedAddress, ensName, isResolving, ensNotFound } = useEnsResolution(recipient)
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
  // Recipient is valid only if resolvedAddress is set (valid 0x address or resolved ENS)
  const isRecipientValid = !!resolvedAddress

  const effectiveCrossChain = crossChainEnabled && !isTestnet

  // Clear form when non-cross-chain withdraw completes
  useEffect(() => {
    if (step === 'done' && txHash && !effectiveCrossChain) {
      setNoteInput('')
      setRecipient('')
    }
  }, [step, txHash])

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
    if (!noteInput.trim() || !isRecipientValid) return
    // Snapshot recipient/ensName for success display
    successSnapshot.current = { recipient: effectiveRecipient, ensName: ensName }
    withdraw(noteInput.trim(), effectiveRecipient.trim())
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Form fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-medium">Note</label>
            <div className="relative group">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-help"
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
              </svg>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-20 shadow-lg">
                Paste your withdrawal note and specify the recipient address to withdraw {selectedVault.label} from the vault.
              </div>
            </div>
          </div>
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="0x..."
            disabled={isActive}
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-400/60 transition-colors"
          />
          {/* Note metadata display */}
          {noteMetadata.isLoading && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                Verifying note...
              </p>
            </div>
          )}
          {noteMetadata.error && !noteMetadata.isLoading && (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{noteMetadata.error}</p>
            </div>
          )}
          {noteMetadata.isValid && !noteMetadata.isLoading && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Amount</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{noteMetadata.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Deposited</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{noteMetadata.timePassed}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Deposits After</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{noteMetadata.depositsAfter}</p>
                </div>
              </div>
              {preview.isLoading && (
                <div className="mt-2 pt-2 border-t border-[var(--border-primary)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-muted)]">Calculating payout...</span>
                </div>
              )}
              {!preview.isLoading && preview.received && (
                <div className="mt-2 pt-2 border-t border-[var(--border-primary)] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">You receive</p>
                    <p className="text-sm font-semibold text-[var(--accent)]">{preview.received}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">Fee ({(preview.feeBps / 100).toFixed(1)}%)</p>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{preview.fee}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <label className="block">
            <span className="text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors">
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

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)] font-medium">Recipient</label>
          <div className="flex gap-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x... or name.eth"
              disabled={isActive}
              className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-400/60 transition-colors"
            />
            {address && (
              <button
                onClick={() => setRecipient(address)}
                disabled={isActive}
                className="px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[var(--text-secondary)] rounded-lg text-xs font-medium whitespace-nowrap border border-[var(--border-primary)] transition-colors"
              >
                Me
              </button>
            )}
          </div>
          {/* ENS resolution feedback */}
          {isResolving && (
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
              Resolving ENS name...
            </p>
          )}
          {ensNotFound && (
            <p className="text-xs text-red-400">
              ENS name not found — no address is linked to this name.
            </p>
          )}
          {ensName && resolvedAddress && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-secondary)]">
                {ensName} &rarr; <span className="font-mono text-[var(--text-secondary)]">{resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}</span>
              </p>
              {isLoadingPrefs && (
                <p className="text-xs text-[var(--text-muted)]">Loading withdrawal preferences...</p>
              )}
              {preferences.chain && (
                <p className="text-xs text-[var(--text-tertiary)]">
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
      </div>

      {/* Action button — pushed to bottom */}
      <div className="mt-auto pt-5 space-y-5">
        {isConnected ? (
          <button
            onClick={handleWithdraw}
            disabled={isActive || isBridging || !noteInput.trim() || !isRecipientValid}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Withdraw {selectedVault.label}
          </button>
        ) : (
          <div className="space-y-2">
            <OpenfortButton label="Log In to Withdraw" />
          </div>
        )}

      </div>

      {/* Withdraw progress modal (stays open on success for non-cross-chain) */}
      <ProgressModal
        isOpen={step !== 'idle' && (effectiveCrossChain ? step !== 'done' : true)}
        title={`Withdrawing ${selectedVault.label}`}
        steps={WITHDRAW_STEPS}
        currentStep={step}
        error={error}
        txHash={txHash}
        explorerUrl={networkConfig.explorerBaseUrl}
        onRetry={reset}
        onClose={reset}
        successTitle="Withdrawal Successful"
        successDetails={!effectiveCrossChain ? {
          amount: selectedVault.displayAmount.toString(),
          network: isTestnet ? 'Base Sepolia' : 'Base',
          token: 'USDC',
          recipient: successSnapshot.current.recipient,
          ensName: successSnapshot.current.ensName,
        } : undefined}
        onDone={reset}
      />

      {/* Bridge progress modal */}
      <ProgressModal
        isOpen={bridgeStep !== 'idle' && bridgeStep !== 'complete'}
        title={`Bridging to ${selectedChain.name}`}
        steps={BRIDGE_STEPS}
        currentStep={bridgeStep}
        error={bridgeError}
        onRetry={bridgeReset}
        onClose={bridgeReset}
      />

      {/* Success — withdraw done, trigger bridge */}
      {step === 'done' && txHash && effectiveCrossChain && bridgeStep === 'idle' && quote && (
        <div className="space-y-3">
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-cyan-300 text-sm">
            Step 1 complete — USDC withdrawn to your wallet on Base.
          </div>
          <button
            onClick={() => bridge(quote)}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            Bridge to {selectedChain.name}
          </button>
        </div>
      )}

      {/* Bridge complete */}
      {bridgeStep === 'complete' && bridgeTxHash && (
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-cyan-300 text-sm">
          Bridge complete! Funds sent to {selectedChain.name}.{' '}
          <a
            href={`${selectedChain.explorerUrl}/tx/${bridgeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline font-medium"
          >
            View transaction
          </a>
        </div>
      )}
    </div>
  )
}
