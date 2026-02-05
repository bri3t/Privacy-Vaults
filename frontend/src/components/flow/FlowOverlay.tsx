import { motion, AnimatePresence } from 'framer-motion'

interface FlowOverlayProps {
  activeStep: number
}

const stages = [
  {
    title: 'Deposit',
    description: 'USDC flows from your wallet into the privacy vault, where it\'s deployed into yield strategies.',
  },
  {
    title: 'Commitment',
    description: 'Your deposit is hashed with Poseidon2 into a secret commitment. Only you hold the key.',
  },
  {
    title: 'Merkle Tree',
    description: 'Your commitment joins the Merkle tree — hidden among all other deposits. Indistinguishable.',
  },
  {
    title: 'ZK Proof',
    description: 'A zero-knowledge proof verifies your claim without revealing your identity or deposit.',
  },
  {
    title: 'Withdraw',
    description: 'Withdraw to any address — funds exit strategies, leave the vault, and reach the recipient with no on-chain link.',
  },
]

export function FlowOverlay({ activeStep }: FlowOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-start pt-8 px-8">
      {/* Stage title + description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center max-w-lg mx-auto"
        >
          <p className="text-xs font-medium tracking-widest uppercase text-[var(--text-tertiary)] mb-3">
            Step {activeStep + 1} of 5
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            {stages[activeStep].title}
          </h2>
          <p className="text-[var(--text-tertiary)] text-base sm:text-lg leading-relaxed">
            {stages[activeStep].description}
          </p>
        </motion.div>
      </AnimatePresence>

    </div>
  )
}
