import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { FlowScene } from './FlowScene.tsx'
import { FlowOverlay } from './FlowOverlay.tsx'
import { CommitmentAnimation } from './CommitmentAnimation.tsx'
import { MerkleTreeAnimation } from './MerkleTreeAnimation.tsx'
import { ZKProofAnimation } from './ZKProofAnimation.tsx'

const STAGE_LABELS = ['Deposit', 'Commitment', 'Merkle Tree', 'ZK Proof', 'Withdraw']

export function FlowVisualization() {
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const targetProgress = useRef(0)

  // When activeStep changes, set target and animate
  useEffect(() => {
    // Target is the midpoint of the stage range (e.g. step 0 → 0.1, step 1 → 0.3, ...)
    targetProgress.current = activeStep * 0.2 + 0.1
  }, [activeStep])

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setProgress((prev) => {
        const diff = targetProgress.current - prev
        if (Math.abs(diff) < 0.001) return targetProgress.current
        return prev + diff * 0.06
      })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const goToStep = (step: number) => {
    setActiveStep(step)
  }

  const goNext = () => {
    if (activeStep < 4) setActiveStep(activeStep + 1)
  }

  const goPrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1)
  }

  const isCommitmentStage = activeStep === 1
  const isMerkleTreeStage = activeStep === 2
  const isZKProofStage = activeStep === 3
  const useCustomAnimation = isCommitmentStage || isMerkleTreeStage || isZKProofStage

  return (
    <div className="relative w-full h-[80vh] overflow-hidden">
      {/* Three.js canvas - hide during custom animation stages */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', display: useCustomAnimation ? 'none' : 'block' }}
      >
        <FlowScene progress={progress} />
      </Canvas>

      {/* Commitment Animation - show only during commitment stage */}
      <CommitmentAnimation visible={isCommitmentStage} />

      {/* Merkle Tree Animation - show only during merkle tree stage */}
      <MerkleTreeAnimation visible={isMerkleTreeStage} />

      {/* ZK Proof Animation - show only during ZK proof stage */}
      <ZKProofAnimation visible={isZKProofStage} />

      {/* HTML overlay */}
      <FlowOverlay activeStep={activeStep} />

      {/* Bottom controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4">
        {/* Step circles */}
        <div className="flex items-center gap-3">
          {STAGE_LABELS.map((label, i) => {
            const isActive = i === activeStep
            const isDone = i < activeStep
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-300 border-2
                    ${isActive
                      ? 'bg-white border-transparent text-zinc-950 shadow-lg shadow-white/20 scale-110'
                      : isDone
                        ? 'bg-white/10 border-white/25 text-zinc-300'
                        : 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-muted)] group-hover:border-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }
                  `}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-300 ${
                    isActive ? 'text-[var(--text-primary)]' : isDone ? 'text-zinc-400' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Prev / Next arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={activeStep === 0}
            className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-tertiary)] text-sm font-medium
              hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            disabled={activeStep === 4}
            className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-tertiary)] text-sm font-medium
              hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
