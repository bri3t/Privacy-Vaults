import type { VaultConfig, NetworkConfig } from '../contracts/addresses.ts'
import { useVaultStats, formatRelativeTime } from '../hooks/useVaultStats.ts'
import { DecryptedText } from './DecryptedText.tsx'

interface StatsPanelProps {
  selectedVault: VaultConfig
  networkConfig: NetworkConfig
}

export function StatsPanel({ selectedVault, networkConfig }: StatsPanelProps) {
  const { deposits, totalDeposits, isLoading, error } = useVaultStats(selectedVault.address, networkConfig.chainId)

  const latest10 = [...deposits].reverse().slice(0, 10)

  return (
    <div className="glass-card rounded-2xl shadow-xl shadow-black/10 p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          <DecryptedText
            text="Statistics"
            animateOn="view"
            sequential
            speed={40}
            className="text-[var(--text-primary)]"
            encryptedClassName="text-[var(--accent)]"
          />
        </h2>
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
          {selectedVault.label}
        </span>
      </div>

      {/* Anonymity set */}
      <div className="mb-4">
        <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Anonymity set</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
            <span className="text-xs text-[var(--text-tertiary)]">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <p className="text-[var(--text-primary)]">
            <span className="text-xl font-bold">{totalDeposits}</span>
            <span className="text-xs text-[var(--text-tertiary)] ml-2">equal user deposits</span>
          </p>
        )}
      </div>

      {/* Latest deposits — 2 columns x 5 rows */}
      <div className="mt-auto">
        <p className="text-xs text-[var(--text-tertiary)] mb-2">{deposits.length > 0 ? 'Latest deposits' : 'No deposits yet'}</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
            <span className="text-sm text-[var(--text-tertiary)]">Loading...</span>
          </div>
        ) : error ? null : (
          <div className="grid grid-cols-2 grid-rows-5 grid-flow-col gap-x-4">
            {Array.from({ length: 10 }, (_, i) => {
              const d = latest10[i]
              const row = i % 5
              const isEvenRow = row % 2 === 0
              return d ? (
                <div key={d.leafIndex} className={`py-0.5 px-1.5 ${isEvenRow ? 'bg-white/5' : ''}`}>
                  <span className="text-xs font-mono text-[var(--text-tertiary)]">{d.leafIndex}.</span>{' '}
                  <span className="text-xs text-[var(--accent)]">{formatRelativeTime(d.timestamp)}</span>
                </div>
              ) : (
                <div key={`empty-${i}`} className={`py-0.5 px-1.5 ${isEvenRow ? 'bg-white/5' : ''}`}>&nbsp;</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
