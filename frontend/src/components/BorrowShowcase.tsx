import { motion } from 'framer-motion'
import { DecryptedText } from './DecryptedText.tsx'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

/* Glowing dots that travel along a horizontal track */
function FlowDots({ fadeOut = false }: { fadeOut?: boolean }) {
  return (
    <div className="flex-1 relative h-16 min-w-[40px]">
      {/* Dashed track */}
      <div className="absolute top-1/2 inset-x-0 border-t border-dashed border-[var(--border-primary)]/60" />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
          style={{ boxShadow: '0 0 6px var(--accent), 0 0 14px var(--primary-glow)' }}
          animate={{
            left: ['0%', '100%'],
            opacity: fadeOut ? [0.9, 0.7, 0.2, 0] : [0, 0.2, 0.7, 0.9],
          }}
          transition={{
            duration: 2.8,
            delay: i * 0.9,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

export function BorrowShowcase() {
  return (
    <section className="relative z-10 py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-3xl sm:text-4xl font-bold text-center mb-4"
        >
          <DecryptedText
            text="Borrow Without Identity"
            animateOn="view"
            sequential
            speed={40}
            className="text-[var(--text-primary)]"
            encryptedClassName="text-[var(--accent)]"
          />
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
          className="text-center text-[var(--text-tertiary)] mb-14 max-w-3xl mx-auto text-base sm:text-lg"
        >
          Your deposit sits in the privacy pool earning yield. Use it as collateral — anonymously.
          No one can connect your loan to your deposit.
        </motion.p>

        {/* ── Visual metaphor ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={2}
        >
          {/* Desktop: horizontal flow diagram */}
          <div className="hidden md:flex items-center">
            {/* Deposit */}
            <div className="shrink-0 text-right pr-8 w-[180px]">
              <span className="block text-lg lg:text-xl font-bold text-[var(--text-primary)]">
                Your Deposit
              </span>
              <span className="block mt-1.5 text-xs text-[var(--text-muted)]">
                Private collateral earning yield
              </span>
            </div>

            {/* Dots flowing in → fading out */}
            <FlowDots fadeOut />

            {/* Central shield */}
            <div
              className="shrink-0 w-28 h-28 lg:w-32 lg:h-32 rounded-full border border-[var(--accent)]/25 bg-[var(--bg-deep)] flex flex-col items-center justify-center relative z-10"
              style={{ boxShadow: '0 0 50px var(--primary-glow), 0 0 100px var(--primary-glow)' }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="mt-1.5 text-[8px] lg:text-[9px] font-bold tracking-[0.2em] uppercase text-[var(--accent)]">
                ZK Proof
              </span>
            </div>

            {/* Dots appearing → flowing out */}
            <FlowDots />

            {/* Borrow */}
            <div className="shrink-0 text-left pl-8 w-[180px]">
              <span className="block text-lg lg:text-xl font-bold text-[var(--accent)]">
                Your Borrow
              </span>
              <span className="block mt-1.5 text-xs text-[var(--text-muted)]">
                Up to 70% LTV — to any wallet
              </span>
            </div>
          </div>

          {/* Mobile: vertical flow */}
          <div className="flex md:hidden flex-col items-center">
            {/* Deposit */}
            <div className="text-center">
              <span className="block text-lg font-bold text-[var(--text-primary)]">
                Your Deposit
              </span>
              <span className="block mt-1 text-xs text-[var(--text-muted)]">
                Private collateral earning yield
              </span>
            </div>

            {/* Vertical connector → shield → connector */}
            <div className="flex flex-col items-center my-1">
              <div className="w-px h-10 bg-gradient-to-b from-[var(--border-primary)] to-[var(--accent)]/30" />
              <div
                className="w-20 h-20 rounded-full border border-[var(--accent)]/25 bg-[var(--bg-deep)] flex flex-col items-center justify-center"
                style={{ boxShadow: '0 0 40px var(--primary-glow)' }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="mt-1 text-[7px] font-bold tracking-[0.2em] uppercase text-[var(--accent)]">
                  ZK Proof
                </span>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-[var(--accent)]/30 to-[var(--border-primary)]" />
            </div>

            {/* Borrow */}
            <div className="text-center">
              <span className="block text-lg font-bold text-[var(--accent)]">
                Your Borrow
              </span>
              <span className="block mt-1 text-xs text-[var(--text-muted)]">
                Up to 70% LTV — to any wallet
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-md mx-auto">
          {[
            { value: '70%', label: 'Max LTV' },
            { value: '0', label: 'Identity Exposed' },
            { value: 'Gasless', label: 'Repayment' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={idx + 4}
              className="text-center"
            >
              <div className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
