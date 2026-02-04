import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface InsufficientBalanceModalProps {
  requiredAmount: string
  currentBalance: string
  onClose: () => void
}

export function InsufficientBalanceModal({ requiredAmount, currentBalance, onClose }: InsufficientBalanceModalProps) {
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl shadow-violet-500/10 backdrop-blur-xl"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">Insufficient Balance</h3>

          <p className="text-sm text-[var(--text-tertiary)] text-center">
            You need <span className="text-[var(--text-primary)] font-medium">{requiredAmount}</span> to deposit,
            but your current balance is <span className="text-[var(--text-primary)] font-medium">{currentBalance} USDC</span>.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium border border-[var(--border-primary)] transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
