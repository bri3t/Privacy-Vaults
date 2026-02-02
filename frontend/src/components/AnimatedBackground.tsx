import { motion } from 'framer-motion'

const orbs = [
  {
    className: 'w-[600px] h-[600px] bg-violet-600/20',
    animate: { x: [0, 100, -50, 0], y: [0, -80, 60, 0], scale: [1, 1.2, 0.9, 1] },
    duration: 20,
    style: { top: '-10%', left: '-5%' },
  },
  {
    className: 'w-[500px] h-[500px] bg-cyan-500/15',
    animate: { x: [0, -70, 80, 0], y: [0, 100, -40, 0], scale: [1, 0.8, 1.1, 1] },
    duration: 25,
    style: { top: '30%', right: '-10%' },
  },
  {
    className: 'w-[400px] h-[400px] bg-violet-500/10',
    animate: { x: [0, 60, -90, 0], y: [0, -60, 80, 0], scale: [1, 1.15, 0.85, 1] },
    duration: 22,
    style: { bottom: '-5%', left: '20%' },
  },
  {
    className: 'w-[350px] h-[350px] bg-cyan-400/10',
    animate: { x: [0, -40, 60, 0], y: [0, 70, -50, 0], scale: [1, 0.9, 1.1, 1] },
    duration: 18,
    style: { top: '10%', left: '50%' },
  },
  {
    className: 'w-[300px] h-[300px] bg-violet-400/10',
    animate: { x: [0, 80, -60, 0], y: [0, -40, 90, 0], scale: [1, 1.1, 0.95, 1] },
    duration: 24,
    style: { bottom: '20%', right: '15%' },
  },
]

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          style={orb.style}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
