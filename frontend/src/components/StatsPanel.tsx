import type { VaultConfig, NetworkConfig } from '../contracts/addresses.ts'
import { useVaultStats, formatRelativeTime } from '../hooks/useVaultStats.ts'

interface StatsPanelProps {
  selectedVault: VaultConfig
  networkConfig: NetworkConfig
}

export function StatsPanel({ selectedVault, networkConfig }: StatsPanelProps) {
  const { deposits, totalDeposits, isLoading, error } = useVaultStats(selectedVault.address)

  const latest10 = [...deposits].reverse().slice(0, 10)

  return (
    <div className="glass-card rounded-2xl shadow-xl shadow-violet-500/5 p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Statistics</h2>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
          {selectedVault.label}
        </span>
      </div>

      {/* Anonymity set */}
      <div className="mb-4">
        <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Anonymity set</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
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
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">Latest deposits</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            <span className="text-sm text-[var(--text-tertiary)]">Loading...</span>
          </div>
        ) : error ? null : deposits.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No deposits yet</p>
        ) : (
          <div className="grid grid-cols-2 grid-rows-5 gap-x-4 gap-y-1">
            {Array.from({ length: 10 }, (_, i) => {
              const d = latest10[i]
              return d ? (
                <div key={d.leafIndex} className="py-1 px-2 rounded bg-[var(--bg-surface)]">
                  <span className="text-xs font-mono text-[var(--text-tertiary)]">{d.leafIndex}.</span>{' '}
                  <span className="text-xs text-green-400">{formatRelativeTime(d.timestamp)}</span>
                </div>
              ) : (
                <div key={`empty-${i}`} className="py-1 px-2" />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
