import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NoteModalProps {
  note: string
  onClose: () => void
}

export function NoteModal({ note, onClose }: NoteModalProps) {
  const [copied, setCopied] = useState(false)

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative glass-card rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-violet-500/10"
        >
          <h3 className="text-xl font-bold text-white">Deposit Successful</h3>

          <p className="text-sm text-zinc-400">
            Your withdrawal note is below. This is the only way to recover your
            funds.
          </p>

          <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 font-mono text-xs text-violet-300 break-all select-all max-h-32 overflow-y-auto">
            {note}
          </div>

          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-300 text-sm">
            <strong>Save this note!</strong> It is the only way to withdraw your
            funds. If you lose it, your deposit is unrecoverable.
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 px-4 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-sm font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-sm font-medium transition-colors"
            >
              Download .txt
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
