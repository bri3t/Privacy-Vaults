import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DepositStage } from './stages/DepositStage.tsx'
import { CommitmentStage } from './stages/CommitmentStage.tsx'
import { MerkleTreeStage } from './stages/MerkleTreeStage.tsx'
import { WithdrawStage } from './stages/WithdrawStage.tsx'

interface FlowSceneProps {
  progress: number
}

// Camera positions for each stage
const cameraPositions: [number, number, number][] = [
  [3, 5, 16],    // deposit (wide scene with user, pool, gears)
  [0, 0, 7],     // commitment
  [0, 0.5, 10],  // merkle tree (pull back)
  [0, 0, 7],     // proof
  [-3, 1, 11.5],    // withdraw (left side closer, yield engine prominent)
]

const cameraTargets: [number, number, number][] = [
  [0, 0.5, 0],   // deposit (look at pool center)
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
  [0, 0.3, 0],   // withdraw (frontal)
]

function lerpVec3(a: number[], b: number[], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function CameraRig({ progress }: { progress: number }) {
  const lookAtTarget = useRef(new THREE.Vector3())
  const { size } = useThree()

  useFrame(({ camera }) => {
    const aspect = size.width / size.height
    const isMobile = aspect < 1

    // On narrow (portrait) viewports, widen FOV and pull camera back
    // so the full deposit/withdraw scenes remain visible
    const cam = camera as THREE.PerspectiveCamera
    const targetFov = isMobile ? 75 : 50
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 0.05)
    cam.updateProjectionMatrix()

    const zMultiplier = isMobile ? 1.2 : 1

    const stageIdx = Math.min(Math.floor(progress / 0.2), 4)
    const nextIdx = Math.min(stageIdx + 1, 4)
    const t = (progress - stageIdx * 0.2) / 0.2

    const pos = lerpVec3(cameraPositions[stageIdx], cameraPositions[nextIdx], t)
    pos[2] *= zMultiplier
    const target = lerpVec3(cameraTargets[stageIdx], cameraTargets[nextIdx], t)

    camera.position.lerp(new THREE.Vector3(...pos), 0.05)
    lookAtTarget.current.lerp(new THREE.Vector3(...target), 0.05)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

// Ambient floating particles in the background
function BackgroundParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 300

  const positions = useRef(
    Float32Array.from({ length: count * 3 }, () => (Math.random() - 0.5) * 20)
  ).current

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * 0.05
    ref.current.rotation.y = t
    ref.current.rotation.x = t * 0.3
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00e5cc"
        transparent
        opacity={0.25}
        sizeAttenuation
      />
    </points>
  )
}

export function FlowScene({ progress }: FlowSceneProps) {
  return (
    <>
      <CameraRig progress={progress} />

      {/* Lighting */}
      <ambientLight intensity={0.8} color="#ffffff" />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-8, 4, 5]} intensity={0.6} color="#3B82F6" />
      <pointLight position={[8, 3, -5]} intensity={0.6} color="#00e5cc" />
      <pointLight position={[0, 2, 8]} intensity={0.8} color="#ffffff" />
      <hemisphereLight color="#ffffff" groundColor="#00e5cc" intensity={0.3} />

      <BackgroundParticles />

      {/* Stages */}
      <DepositStage progress={progress} />
      <CommitmentStage progress={progress} />
      <MerkleTreeStage progress={progress} />
      <WithdrawStage progress={progress} />
    </>
  )
}
