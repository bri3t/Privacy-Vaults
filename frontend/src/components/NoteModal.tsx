import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DecryptedText } from './DecryptedText.tsx'

interface NoteModalProps {
  note: string
  onClose: () => void
}

export function NoteModal({ note, onClose }: NoteModalProps) {
  const [copied, setCopied] = useState(false)
  const [backedUp, setBackedUp] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(note)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([note], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `privacy-vault-note-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            <DecryptedText
              text="Deposit Successful"
              animateOn="view"
              sequential
              speed={30}
              className="text-[var(--text-primary)]"
              encryptedClassName="text-cyan-400"
            />
          </h3>

          <p className="text-sm text-[var(--text-tertiary)]">
            Your withdrawal note is below. This is the only way to recover your
            funds.
          </p>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl p-4 font-mono text-xs text-[var(--text-secondary)] break-all select-all max-h-32 overflow-y-auto">
            {note}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--text-secondary)] text-sm font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-medium transition-colors"
            >
              Download .txt
            </button>
          </div>

          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-300 text-base font-bold uppercase tracking-wide leading-relaxed">
            Save this note! It is the only way to withdraw your funds. If you lose it, your deposit is unrecoverable.
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={backedUp}
              onChange={(e) => setBackedUp(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-primary)] bg-[var(--bg-input)] text-zinc-400 focus:ring-zinc-400/50 accent-zinc-400"
            />
            <span className="text-sm text-[var(--text-secondary)]">I have backed up my withdrawal note</span>
          </label>

          <button
            onClick={onClose}
            disabled={!backedUp}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
