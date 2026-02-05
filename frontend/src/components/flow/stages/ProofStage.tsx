import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, (progress - 0.6) / 0.2))
}

const GRID_SIZE = 8
const LINE_COUNT = 20

// Generate circuit-like line segments
function generateCircuitLines() {
  const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = []

  for (let i = 0; i < LINE_COUNT; i++) {
    const isHorizontal = i % 2 === 0
    const offset = (i / LINE_COUNT - 0.5) * GRID_SIZE

    if (isHorizontal) {
      const y = offset
      const x1 = -GRID_SIZE / 2 + Math.random() * 2
      const x2 = GRID_SIZE / 2 - Math.random() * 2
      lines.push({
        start: new THREE.Vector3(x1, y, 0),
        end: new THREE.Vector3(x2, y, 0),
      })
    } else {
      const x = offset
      const y1 = -GRID_SIZE / 2 + Math.random() * 2
      const y2 = GRID_SIZE / 2 - Math.random() * 2
      lines.push({
        start: new THREE.Vector3(x, y1, 0),
        end: new THREE.Vector3(x, y2, 0),
      })
    }
  }
  return lines
}

function CircuitLine({ start, end, color, opacity }: {
  start: THREE.Vector3
  end: THREE.Vector3
  color: string
  opacity: number
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end])
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    return new THREE.Line(geo, mat)
  }, [start, end, color, opacity])

  useFrame(() => {
    ;(lineObj.material as THREE.LineBasicMaterial).opacity = opacity
  })

  return <primitive object={lineObj} />
}

const FLOW_PARTICLE_COUNT = 80

export function ProofStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const shieldRef = useRef<THREE.Group>(null)
  const lp = localProgress(progress)

  const circuitLines = useMemo(() => generateCircuitLines(), [])

  const flowPositions = useMemo(() => new Float32Array(FLOW_PARTICLE_COUNT * 3), [])
  const flowSeeds = useMemo(() => {
    return Array.from({ length: FLOW_PARTICLE_COUNT }, () => ({
      lineIdx: Math.floor(Math.random() * LINE_COUNT),
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random(),
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.visible = progress >= 0.58 && progress < 0.82

    // Flow particles along circuit lines
    if (pointsRef.current && lp > 0) {
      const t = clock.getElapsedTime()
      for (let i = 0; i < FLOW_PARTICLE_COUNT; i++) {
        const seed = flowSeeds[i]
        const line = circuitLines[seed.lineIdx]
        const along = ((t * seed.speed + seed.phase) % 1)
        flowPositions[i * 3] = line.start.x + (line.end.x - line.start.x) * along
        flowPositions[i * 3 + 1] = line.start.y + (line.end.y - line.start.y) * along
        flowPositions[i * 3 + 2] = 0.1
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }

    // Shield materializes
    if (shieldRef.current) {
      const scale = lp > 0.5 ? (lp - 0.5) / 0.5 : 0
      shieldRef.current.scale.setScalar(scale)
      shieldRef.current.rotation.y = clock.getElapsedTime() * 0.5
    }
  })

  if (progress < 0.58 || progress > 0.82) return null

  const opacity = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.04) : 1
  const fadeIn = Math.min(1, (progress - 0.58) / 0.04)
  const effectiveOpacity = opacity * fadeIn

  return (
    <group ref={groupRef}>
      {/* Circuit grid lines */}
      {circuitLines.map((cl, i) => {
        const appear = lp > (i / LINE_COUNT) * 0.5 ? 1 : 0
        return (
          <CircuitLine
            key={`circuit-${i}`}
            start={cl.start}
            end={cl.end}
            color={i % 3 === 0 ? '#d4d4d8' : '#3f3f46'}
            opacity={effectiveOpacity * appear * 0.4}
          />
        )
      })}

      {/* Flowing particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[flowPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#e4e4e7"
          transparent
          opacity={effectiveOpacity * lp}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Shield / proof badge */}
      <group ref={shieldRef} position={[0, 0, 0.5]}>
        {/* Outer ring */}
        <mesh>
          <torusGeometry args={[0.8, 0.05, 16, 32]} />
          <meshStandardMaterial
            color="#e4e4e7"
            emissive="#e4e4e7"
            emissiveIntensity={0.8}
            transparent
            opacity={effectiveOpacity}
          />
        </mesh>
        {/* Inner icosahedron */}
        <mesh>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color="#d4d4d8"
            emissive="#d4d4d8"
            emissiveIntensity={0.6}
            transparent
            opacity={effectiveOpacity * 0.8}
            wireframe
          />
        </mesh>
        {/* Core glow */}
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#f4f4f5"
            emissive="#f4f4f5"
            emissiveIntensity={1}
            transparent
            opacity={effectiveOpacity * 0.6}
          />
        </mesh>
      </group>
    </group>
  )
}
