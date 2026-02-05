import { motion } from 'framer-motion'
import { Plasma } from '../components/Plasma.tsx'
import { Spotlight } from '../components/Spotlight.tsx'
import { FlipWords } from '../components/FlipWords.tsx'
import { FlowVisualization } from '../components/flow/FlowVisualization.tsx'
import { DecryptedText } from '../components/DecryptedText.tsx'

interface LandingPageProps {
  onLaunch: () => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      {/* Plasma WebGL background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Plasma color="#a1a1aa" speed={0.3} scale={1.2} opacity={0.08} mouseInteractive={false} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-[var(--border-subtle)]" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-page) 60%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-[var(--text-primary)]">
            <DecryptedText
              text="Privacy Vault"
              animateOn="view"
              sequential
              speed={40}
              className="text-[var(--text-primary)]"
              encryptedClassName="text-cyan-400"
            />
          </span>
          <button
            onClick={onLaunch}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <Spotlight className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-16" fill="rgba(161,161,170,0.12)">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
            <FlipWords words={['Private', 'Gasless', 'Anonymous', 'Untraceable']} />
            <br />
            <DecryptedText
              text="USDC Transfers"
              animateOn="view"
              sequential
              speed={35}
              className="text-[var(--text-primary)]"
              encryptedClassName="text-cyan-400"
            />
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[var(--text-tertiary)] max-w-xl mx-auto">
            Break the on-chain link between sender and receiver. Deposit and withdraw
            USDC with zero-knowledge proofs on Base.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={onLaunch}
              className="px-8 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-lg hover:bg-[var(--accent-hover)] hover:shadow-xl hover:shadow-cyan-500/20 transition-all"
            >
              Launch App
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] font-medium text-lg hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      </Spotlight>

      {/* How It Works — Interactive Flow */}
      <section className="relative z-10">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-3xl sm:text-4xl font-bold text-center mb-4 px-6"
        >
          <DecryptedText
            text="How It Works"
            animateOn="view"
            sequential
            speed={40}
            className="text-[var(--text-primary)]"
            encryptedClassName="text-cyan-400"
          />
        </motion.h2>
        <FlowVisualization onLaunch={onLaunch} />
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-subtle)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-muted)]">
            Privacy Vault — Open Source
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] px-3 py-1 rounded-full border border-[var(--border-primary)] bg-[var(--bg-surface)]">
              Built on Base
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
