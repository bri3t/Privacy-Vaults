import { motion } from 'framer-motion'
import { AnimatedBackground } from '../components/AnimatedBackground.tsx'
import { Spotlight } from '../components/Spotlight.tsx'
import { FlipWords } from '../components/FlipWords.tsx'

interface LandingPageProps {
  onLaunch: () => void
}

const features = [
  {
    title: 'Privacy First',
    description:
      'Deposit and withdraw USDC without linking sender and receiver addresses on-chain.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Zero-Knowledge Proofs',
    description:
      'Noir-powered ZK circuits with Poseidon2 hashing ensure mathematical privacy guarantees.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    title: 'Gasless Transactions',
    description:
      'EIP-3009 authorization enables deposits without needing ETH for gas fees.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
]

const steps = [
  { number: '01', title: 'Deposit', description: 'Deposit 1 USDC and receive a secret withdrawal note.' },
  { number: '02', title: 'Wait', description: 'Let your deposit mix with others in the vault for enhanced privacy.' },
  { number: '03', title: 'Withdraw', description: 'Use your note to withdraw to any address with zero-knowledge proof.' },
]

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
    <div className="relative min-h-screen bg-zinc-950 text-white overflow-hidden">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-zinc-950/60 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Privacy Vault
          </span>
          <button
            onClick={onLaunch}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-shadow"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <Spotlight className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-16" fill="rgba(139,92,246,0.3)">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
            <FlipWords words={['Private', 'Trustless', 'Gasless']} />
            <br />
            <span className="text-white">USDC Transfers</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto">
            Break the on-chain link between sender and receiver. Deposit and withdraw
            USDC with zero-knowledge proofs on Base.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={onLaunch}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold text-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all"
            >
              Launch App
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-lg hover:border-zinc-500 hover:text-white transition-colors"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      </Spotlight>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-3xl sm:text-4xl font-bold text-center mb-16"
        >
          Built for{' '}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Financial Privacy
          </span>
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
              className="glass-card rounded-2xl p-8 hover:border-violet-500/20 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-5">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-3xl sm:text-4xl font-bold text-center mb-16"
        >
          How It Works
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.number}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
              className="glass-card rounded-2xl p-8"
            >
              <span className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {s.number}
              </span>
              <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                {s.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="glass-card rounded-2xl p-10 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Cryptographic Security
          </h3>
          <p className="text-zinc-400 leading-relaxed max-w-lg mx-auto">
            Every withdrawal is verified by a zero-knowledge proof generated in your browser.
            Your secrets never leave your device. The smart contract only sees mathematical
            proof that you have the right to withdraw — not who deposited.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-zinc-500">
            Privacy Vault — Open Source
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
              Built on Base
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
