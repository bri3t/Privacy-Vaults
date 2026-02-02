import { useState } from 'react'
import { useAccount } from 'wagmi'
import { OpenfortButton } from '@openfort/react'
import { useWithdraw } from '../hooks/useWithdraw.ts'
import { StatusIndicator } from './StatusIndicator.tsx'

const WITHDRAW_STEPS = [
  { key: 'fetching-events', label: 'Fetching deposit events' },
  { key: 'building-tree', label: 'Building Merkle tree' },
  { key: 'generating-proof', label: 'Generating ZK proof' },
  { key: 'submitting', label: 'Submitting transaction' },
]

export function WithdrawTab() {
  const [noteInput, setNoteInput] = useState('')
  const [recipient, setRecipient] = useState('')
  const { address, isConnected } = useAccount()
  const { step, txHash, error, withdraw, reset } = useWithdraw()

  const isActive =
    step !== 'idle' && step !== 'done' && step !== 'error'

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
    if (!noteInput.trim() || !recipient.trim()) return
    withdraw(noteInput.trim(), recipient.trim())
  }

  return (
    <div className="space-y-5">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Paste your withdrawal note and specify the recipient address to withdraw
        1 USDC from the vault.
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
            placeholder="0x..."
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
      </div>

      {/* Action button */}
      {isConnected ? (
        <button
          onClick={handleWithdraw}
          disabled={isActive || !noteInput.trim() || !recipient.trim()}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isActive ? 'Processing...' : 'Withdraw 1 USDC'}
        </button>
      ) : (
        <div className="space-y-2">
          <OpenfortButton label="Log In to Withdraw" />
        </div>
      )}

      {/* Progress */}
      {step !== 'idle' && (
        <StatusIndicator
          steps={WITHDRAW_STEPS}
          currentStep={step}
          error={error}
        />
      )}

      {/* Error retry */}
      {step === 'error' && (
        <button
          onClick={reset}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
        >
          Try again
        </button>
      )}

      {/* Success */}
      {step === 'done' && txHash && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-green-300 text-sm">
          Withdrawal successful!{' '}
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
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
