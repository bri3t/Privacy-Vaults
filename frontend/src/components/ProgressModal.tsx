import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner } from './Spinner.tsx'

interface Step {
  key: string
  label: string
}

interface SuccessDetails {
  amount: string
  network: string
  token: string
  recipient: string
  ensName?: string | null
}

interface ProgressModalProps {
  isOpen: boolean
  title: string
  steps: Step[]
  currentStep: string
  error: string | null
  txHash?: string | null
  explorerUrl?: string
  onRetry?: () => void
  onClose?: () => void
  // Success state props
  successTitle?: string
  successDetails?: SuccessDetails
  onDone?: () => void
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ProgressModal({
  isOpen,
  title,
  steps,
  currentStep,
  error,
  txHash,
  explorerUrl,
  onRetry,
  onClose,
  successTitle,
  successDetails,
  onDone,
}: ProgressModalProps) {
  if (!isOpen) return null

  const currentIndex = steps.findIndex((s) => s.key === currentStep)
  const isDone = currentStep === 'done'
  const isError = currentStep === 'error'
  const showSuccess = isDone && successDetails

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={showSuccess ? onDone : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-sm w-full p-6 space-y-5 backdrop-blur-xl ${showSuccess ? 'shadow-2xl shadow-cyan-500/10' : 'shadow-2xl shadow-black/20'}`}
        >
          {showSuccess ? (
            <>
              {/* Success Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {successTitle || 'Success'}
                </h3>
              </div>

              {/* Success Details */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-tertiary)]">Amount</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {successDetails.amount} {successDetails.token}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-tertiary)]">Network</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {successDetails.network}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-[var(--text-tertiary)]">Recipient</span>
                  <div className="text-right">
                    {successDetails.ensName ? (
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {successDetails.ensName}
                        </span>
                        <p className="text-xs font-mono text-[var(--text-tertiary)]">
                          {shortenAddress(successDetails.recipient)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-[var(--text-primary)]">
                        {shortenAddress(successDetails.recipient)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction link */}
              {txHash && explorerUrl && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  View transaction
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {/* Done button */}
              <button
                onClick={onDone}
                className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
              >
                Done
              </button>
            </>
          ) : (
            <>
              {/* Title */}
              <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center">
                {title}
              </h3>

              {/* Steps */}
              <div className="space-y-2">
                {steps.map((step, i) => {
                  let status: 'done' | 'active' | 'pending' | 'error'
                  if (isDone || i < currentIndex) {
                    status = 'done'
                  } else if (i === currentIndex && isError) {
                    status = 'error'
                  } else if (i === currentIndex) {
                    status = 'active'
                  } else {
                    status = 'pending'
                  }

                  return (
                    <div key={step.key} className="flex items-center gap-3 text-sm py-1">
                      {status === 'done' && (
                        <span className="text-cyan-400 w-5 text-center text-sm">&#10003;</span>
                      )}
                      {status === 'active' && (
                        <span className="w-5 flex justify-center">
                          <Spinner size="sm" />
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-red-400 w-5 text-center text-sm">&#10005;</span>
                      )}
                      {status === 'pending' && (
                        <span className="text-[var(--text-muted)] w-5 text-center text-[10px]">&#9679;</span>
                      )}
                      <span
                        className={
                          status === 'done'
                            ? 'text-[var(--text-tertiary)]'
                            : status === 'active'
                              ? 'text-[var(--text-primary)] font-medium'
                              : status === 'error'
                                ? 'text-red-400'
                                : 'text-[var(--text-muted)]'
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Transaction link (during progress) */}
              {txHash && explorerUrl && !showSuccess && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  View transaction
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {/* Error banner */}
              {isError && error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm break-all">
                  {error}
                </div>
              )}

              {/* Action buttons (only on error) */}
              {isError && (
                <div className="flex gap-3">
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium border border-[var(--border-primary)] transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
