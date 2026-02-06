import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { OpenfortButton } from '@openfort/react'
import { useBorrow } from '../hooks/useBorrow.ts'
import { useRepay } from '../hooks/useRepay.ts'
import { useLoanInfo } from '../hooks/useLoanInfo.ts'
import { useNoteMetadata } from '../hooks/useNoteMetadata.ts'
import { ProgressModal } from './ProgressModal.tsx'
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
  const { address, isConnected } = useAccount()
  const { step: borrowStep, txHash: borrowTxHash, error: borrowError, borrow, reset: borrowReset } = useBorrow(selectedVault.address)
  const { step: repayStep, txHash: repayTxHash, error: repayError, repay, reset: repayReset } = useRepay(selectedVault.address, networkConfig)
  const loanInfo = useLoanInfo(noteInput, selectedVault.address)
  const noteMetadata = useNoteMetadata(noteInput, selectedVault.address, Number(selectedVault.denomination), selectedVault.displayAmount)
  const maxBorrow = (selectedVault.displayAmount * LTV_BPS) / BPS
  const borrowAmount = (maxBorrow * borrowPercent) / 100
  const borrowAmountRaw = BigInt(Math.floor((Number(selectedVault.denomination) * LTV_BPS * borrowPercent) / (BPS * 100)))

  const isBorrowActive = borrowStep !== 'idle' && borrowStep !== 'done' && borrowStep !== 'error'
  const isRepayActive = repayStep !== 'idle' && repayStep !== 'done' && repayStep !== 'error'
  const hasActiveLoan = loanInfo.loan?.active === true

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
      const text = (reader.result as string).trim()
      setNoteInput(text)
    }
    reader.readAsText(file)
  }

  const handleBorrow = () => {
    if (!noteInput.trim() || !recipient.trim()) return
    borrow(noteInput.trim(), recipient.trim(), borrowAmountRaw.toString())
  }

  const handleRepay = () => {
    if (!noteInput.trim() || !address) return
    repay(noteInput.trim(), address)
  }

  const debtDisplay = loanInfo.debt !== '0'
    ? (Number(loanInfo.debt) / 1e6).toFixed(2)
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
              <span className="text-xs text-[var(--text-muted)]">Interest = vault yield rate</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Principal</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {(Number(loanInfo.loan!.principalAmount) / 1e6).toFixed(2)} USDC
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Current Debt</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{debtDisplay} USDC</p>
              </div>
            </div>
            {Number(loanInfo.fee) > 0 && (
              <div className="mt-2 pt-2 border-t border-cyan-500/10 flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Fee (0.5%): {feeDisplay} USDC</span>
                <span className="text-[var(--text-secondary)]">Total: {repaymentDisplay} USDC</span>
              </div>
            )}
          </div>
        )}

        {/* Borrow controls (only if no active loan) */}
        {!hasActiveLoan && noteInput.trim().length === 258 && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)] font-medium">Recipient</label>
              <div className="flex gap-2">
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
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
                  <p className="text-xs text-[var(--text-muted)]">LTV</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{((borrowPercent * 70) / 100).toFixed(0)}%</p>
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
                disabled={isBorrowActive || !noteInput.trim() || !recipient.trim()}
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
        title={`Borrowing ${borrowAmount.toFixed(2)} USDC`}
        steps={BORROW_STEPS}
        currentStep={borrowStep}
        error={borrowError}
        txHash={borrowTxHash}
        explorerUrl={networkConfig.explorerBaseUrl}
        onRetry={borrowReset}
        onClose={borrowReset}
        successTitle="Borrow Successful"
        successMessage={`You borrowed ${borrowAmount.toFixed(2)} USDC`}
        onDone={borrowReset}
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
        onDone={repayReset}
      />
    </div>
  )
}
