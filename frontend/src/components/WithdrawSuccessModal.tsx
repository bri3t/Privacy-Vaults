import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface WithdrawSuccessModalProps {
  amount: string
  network: string
  token: string
  recipient: string
  ensName: string | null
  txHash: string
  explorerUrl: string
  onClose: () => void
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WithdrawSuccessModal({
  amount,
  network,
  token,
  recipient,
  ensName,
  txHash,
  explorerUrl,
  onClose,
}: WithdrawSuccessModalProps) {
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-green-500/10 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Withdrawal Successful</h3>
          </div>

          {/* Details */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-tertiary)]">Amount</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{amount} {token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-tertiary)]">Network</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{network}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-[var(--text-tertiary)]">Recipient</span>
              <div className="text-right">
                {ensName ? (
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-violet-400">{ensName}</span>
                    <p className="text-xs font-mono text-[var(--text-tertiary)]">{shortenAddress(recipient)}</p>
                  </div>
                ) : (
                  <span className="text-sm font-mono text-[var(--text-primary)]">{shortenAddress(recipient)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Tx link */}
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            View transaction
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
