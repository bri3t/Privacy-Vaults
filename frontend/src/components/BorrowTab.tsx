import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { OpenfortButton } from '@openfort/react'
import { useBorrow } from '../hooks/useBorrow.ts'
import { useRepay } from '../hooks/useRepay.ts'
import { useLoanInfo } from '../hooks/useLoanInfo.ts'
import { useNoteMetadata } from '../hooks/useNoteMetadata.ts'
import { useYieldApy } from '../hooks/useYieldApy.ts'
import { decodeNote } from '../zk/note.ts'
import { ProgressModal } from './ProgressModal.tsx'
import { useEnsResolution } from '../hooks/useEnsResolution.ts'
import type { VaultConfig, NetworkConfig } from '../contracts/addresses.ts'

const BORROW_STEPS = [
  { key: 'fetching-events', label: 'Fetching deposit events' },
  { key: 'building-tree', label: 'Building Merkle tree' },
  { key: 'generating-proof', label: 'Generating ZK proof' },
  { key: 'submitting', label: 'Submitting borrow transaction' },
]

const REPAY_STEPS = [
  { key: 'fetching-debt', label: 'Fetching current debt' },
  { key: 'signing', label: 'Signing repayment authorization' },
  { key: 'submitting', label: 'Submitting repayment' },
]

const LTV_BPS = 7000
const BPS = 10000

export function BorrowTab({ selectedVault, networkConfig }: { selectedVault: VaultConfig; networkConfig: NetworkConfig }) {
  const [noteInput, setNoteInput] = useState('')
  const [recipient, setRecipient] = useState('')
  const [borrowPercent, setBorrowPercent] = useState(70)
  const [submittedBorrowAmount, setSubmittedBorrowAmount] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { address, isConnected } = useAccount()
  const { step: borrowStep, txHash: borrowTxHash, error: borrowError, borrow, reset: borrowReset } = useBorrow(selectedVault.address)
  const { step: repayStep, txHash: repayTxHash, error: repayError, repay, reset: repayReset } = useRepay(selectedVault.address, networkConfig)
  const loanInfo = useLoanInfo(noteInput, selectedVault.address, refreshKey)
  const noteMetadata = useNoteMetadata(noteInput, selectedVault.address, Number(selectedVault.denomination), selectedVault.displayAmount)
  const { blendedApy } = useYieldApy(networkConfig.yieldPools)
  const maxBorrow = (selectedVault.displayAmount * LTV_BPS) / BPS
  const borrowAmount = (maxBorrow * borrowPercent) / 100
  const borrowAmountRaw = BigInt(Math.floor((Number(selectedVault.denomination) * LTV_BPS * borrowPercent) / (BPS * 100)))

  // ENS resolution
  const { resolvedAddress, ensName, avatar, isResolving, ensNotFound } = useEnsResolution(recipient)
  const effectiveRecipient = resolvedAddress || recipient
  const isRecipientValid = !!resolvedAddress

  const isBorrowActive = borrowStep !== 'idle' && borrowStep !== 'done' && borrowStep !== 'error'
  const isRepayActive = repayStep !== 'idle' && repayStep !== 'done' && repayStep !== 'error'
  const hasActiveLoan = loanInfo.loan?.active === true

  let isNoteValid = false
  try { decodeNote(noteInput.trim()); isNoteValid = true } catch { /* invalid */ }

  // Clear form on successful borrow
  useEffect(() => {
    if (borrowStep === 'done') {
      setRecipient('')
      setBorrowPercent(70)
    }
  }, [borrowStep])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = (reader.result as string).replace(/[^\x20-\x7E]/g, '').trim()
      setNoteInput(text)
    }
    reader.readAsText(file)
  }

  const handleBorrow = () => {
    if (!noteInput.trim() || !isRecipientValid) return
    setSubmittedBorrowAmount(borrowAmount)
    borrow(noteInput.trim(), effectiveRecipient.trim(), borrowAmountRaw.toString())
  }

  const handleRepay = () => {
    if (!noteInput.trim() || !address) return
    repay(noteInput.trim(), address)
  }

  const principal = loanInfo.loan ? Number(loanInfo.loan.principalAmount) : 0
  const debt = Number(loanInfo.debt)
  const interestAmount = debt > principal ? debt - principal : 0
  const interestPercent = principal > 0 ? ((debt / principal) - 1) * 100 : 0

  const debtDisplay = loanInfo.debt !== '0'
    ? (debt / 1e6).toFixed(2)
    : '0.00'
  const feeDisplay = loanInfo.fee !== '0'
    ? (Number(loanInfo.fee) / 1e6).toFixed(2)
    : '0.00'
  const repaymentDisplay = loanInfo.repaymentAmount !== '0'
    ? (Number(loanInfo.repaymentAmount) / 1e6).toFixed(2)
    : '0.00'

  return (
    <div className="flex flex-col flex-1">
      <div className="space-y-3">
        {/* Note input */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-medium">Note</label>
            <div className="relative group">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-help">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
              </svg>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-20 shadow-lg">
                Paste your deposit note to borrow USDC against it (up to 70% LTV). Interest rate equals the vault yield rate.
              </div>
            </div>
          </div>
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="0x..."
            disabled={isBorrowActive || isRepayActive}
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-400/60 transition-colors"
          />
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
          <label className="block">
            <span className="text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors">
              Or upload a .txt file
            </span>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" disabled={isBorrowActive || isRepayActive} />
          </label>
        </div>

        {/* Active loan display */}
        {hasActiveLoan && (
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-cyan-400">Active Loan</span>
              <span className="text-xs text-[var(--text-muted)]">Interest: {interestPercent.toFixed(2)}%</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Principal</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{(principal / 1e6).toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Interest ({interestPercent.toFixed(2)}%)</span>
                <span className={`text-xs font-medium ${interestAmount > 0 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                  {interestAmount > 0 ? '+' : ''}{(interestAmount / 1e6).toFixed(2)} USDC
                </span>
              </div>
              {Number(loanInfo.fee) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Fee</span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">+{feeDisplay} USDC</span>
                </div>
              )}
              <div className="border-t border-cyan-500/10 pt-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)]">To repay</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{repaymentDisplay} USDC</span>
              </div>
            </div>
          </div>
        )}

        {/* Borrow controls (only if no active loan) */}
        {!hasActiveLoan && isNoteValid && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)] font-medium">Recipient</label>
              <div className="flex gap-2">
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x... or name.eth"
                  disabled={isBorrowActive}
                  className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-400/60 transition-colors"
                />
                {address && (
                  <button
                    onClick={() => setRecipient(address)}
                    disabled={isBorrowActive}
                    className="px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[var(--text-secondary)] rounded-lg text-xs font-medium whitespace-nowrap border border-[var(--border-primary)] transition-colors"
                  >
                    Me
                  </button>
                )}
              </div>
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
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                  {avatar ? (
                    <img src={avatar} alt={ensName} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30" />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{ensName}</span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Borrow Amount</label>
                <span className="text-xs text-[var(--text-muted)]">Max: {maxBorrow.toFixed(2)} USDC (70% LTV)</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={borrowPercent}
                onChange={(e) => setBorrowPercent(Number(e.target.value))}
                disabled={isBorrowActive}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{borrowAmount.toFixed(2)} USDC</span>
                <span className="text-xs text-[var(--text-muted)]">{borrowPercent}% of max</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Collateral</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{selectedVault.displayAmount} USDC</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Borrow</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{borrowAmount.toFixed(2)} USDC</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Interest</p>
                  <p className="text-sm font-medium text-amber-400">{blendedApy != null ? `${blendedApy.toFixed(2)}%` : '—'}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-auto pt-5 space-y-3">
        {isConnected ? (
          <>
            {hasActiveLoan ? (
              <button
                onClick={handleRepay}
                disabled={isRepayActive || !noteInput.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Repay {repaymentDisplay} USDC
              </button>
            ) : (
              <button
                onClick={handleBorrow}
                disabled={isBorrowActive || !noteInput.trim() || !isRecipientValid}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Borrow {borrowAmount.toFixed(2)} USDC
              </button>
            )}
          </>
        ) : (
          <OpenfortButton label="Log In to Borrow" />
        )}
      </div>

      {/* Borrow progress modal */}
      <ProgressModal
        isOpen={borrowStep !== 'idle'}
        title={`Borrowing ${(submittedBorrowAmount ?? borrowAmount).toFixed(2)} USDC`}
        steps={BORROW_STEPS}
        currentStep={borrowStep}
        error={borrowError}
        txHash={borrowTxHash}
        explorerUrl={networkConfig.explorerBaseUrl}
        onRetry={borrowReset}
        onClose={() => { setSubmittedBorrowAmount(null); borrowReset() }}
        successTitle="Borrow Successful"
        successMessage={`You borrowed ${(submittedBorrowAmount ?? borrowAmount).toFixed(2)} USDC`}
        onDone={() => { setSubmittedBorrowAmount(null); setRefreshKey((k) => k + 1); borrowReset() }}
      />

      {/* Repay progress modal */}
      <ProgressModal
        isOpen={repayStep !== 'idle'}
        title={`Repaying ${debtDisplay} USDC`}
        steps={REPAY_STEPS}
        currentStep={repayStep}
        error={repayError}
        txHash={repayTxHash}
        explorerUrl={networkConfig.explorerBaseUrl}
        onRetry={repayReset}
        onClose={repayReset}
        successTitle="Repayment Successful"
        successMessage={`You repaid ${repaymentDisplay} USDC`}
        onDone={() => { setRefreshKey((k) => k + 1); repayReset() }}
      />
    </div>
  )
}
