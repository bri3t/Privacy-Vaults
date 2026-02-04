import { AnimatePresence, motion } from 'framer-motion'
import { useNetworkMode } from '../contexts/NetworkModeContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'

interface SidebarMenuProps {
  open: boolean
  onClose: () => void
}

export function SidebarMenu({ open, onClose }: SidebarMenuProps) {
  const { mode, isMainnet, toggleMode } = useNetworkMode()
  const { isDark, toggleTheme } = useTheme()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[var(--backdrop)] backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-[var(--bg-page)] border-l border-[var(--border-primary)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-primary)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Settings</h2>
              <button
                onClick={onClose}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Settings rows */}
            <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
              {/* Network mode */}
              <ToggleRow
                label="Network Mode"
                description={isMainnet ? 'Mainnet (Base)' : 'Testnet (Base Sepolia)'}
                checked={isMainnet}
                onChange={toggleMode}
              />

              {/* Dark mode */}
              <ToggleRow
                label="Dark Mode"
                description={isDark ? 'On' : 'Off'}
                checked={isDark}
                onChange={toggleTheme}
              />

              {/* Sound effects (placeholder) */}
              <ToggleRow
                label="Sound Effects"
                description="Coming soon"
                checked={false}
                onChange={() => {}}
                disabled
              />
            </div>

            {/* Network indicator pill */}
            <div className="px-5 pb-5">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                isMainnet
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
                {mode === 'mainnet' ? 'Base Mainnet' : 'Base Sepolia Testnet'}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${
          checked ? 'bg-violet-500' : 'bg-[var(--bg-hover)]'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ height: '22px' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
