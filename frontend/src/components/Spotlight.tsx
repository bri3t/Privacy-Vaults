import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils.ts'

interface SpotlightProps {
  className?: string
  fill?: string
  children?: React.ReactNode
}

export function Spotlight({
  className,
  fill = 'white',
  children,
}: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!divRef.current) return
      const rect = divRef.current.getBoundingClientRect()
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    },
    [],
  )

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden',
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px z-0"
        animate={{ opacity }}
        transition={{ duration: 0.5 }}
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${fill}06, transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}
