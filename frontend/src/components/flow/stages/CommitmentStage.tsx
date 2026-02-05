import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, (progress - 0.2) / 0.2))
}

// Colors
const COL = {
  primary: 0x00e5cc,    // cyan - nullifier
  secondary: 0xd4a853,  // gold - secret
  goldLight: 0xf0d78c,
}

// ==================== ORB COMPONENT ====================
function Orb({
  color,
  position,
  visible,
  emissiveIntensity,
  scale,
  time,
  particleData,
}: {
  color: number
  position: THREE.Vector3
  visible: boolean
  emissiveIntensity: number
  scale: number
  time: number
  particleData: { angle: number; radius: number; speed: number; yOff: number; phase: number }[]
}) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.x = time * 0.8
      ringRef.current.rotation.z = time * 0.4
    }
  })

  if (!visible) return null

  return (
    <group position={position.toArray()}>
      {/* Core */}
      <mesh scale={scale}>
        <sphereGeometry args={[0.35, 48, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.1}
          roughness={0.15}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} />
      </mesh>
      {/* Orbiting ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.55, 0.012, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      {/* Mini particles orbiting */}
      {particleData.map((p, i) => {
        const a = p.angle + time * p.speed
        const px = Math.cos(a) * p.radius
        const py = p.yOff + Math.sin(time * 0.8 + p.phase) * 0.1
        const pz = Math.sin(a) * p.radius
        return (
          <mesh key={i} position={[px, py, pz]} scale={0.02 + Math.random() * 0.01}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        )
      })}
      {/* Point light */}
      <pointLight color={color} intensity={0.8 + emissiveIntensity} distance={5} />
    </group>
  )
}

// ==================== COMMITMENT ORB ====================
function CommitmentOrb({
  visible,
  scale,
  time,
  glowOpacity,
}: {
  visible: boolean
  scale: number
  time: number
  glowOpacity: number
}) {
  if (!visible || scale < 0.01) return null

  return (
    <group>
      {/* Diamond-ish icosahedron core */}
      <mesh scale={scale} rotation={[time * 0.3, time * 0.5, 0]}>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial
          color={COL.goldLight}
          emissive={COL.goldLight}
          emissiveIntensity={0.4}
          metalness={0.2}
          roughness={0.05}
        />
      </mesh>
      {/* Wireframe */}
      <mesh scale={scale} rotation={[time * 0.3, time * 0.5, 0]}>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshBasicMaterial color={COL.primary} wireframe transparent opacity={0.2 * glowOpacity} />
      </mesh>
      {/* Glow layers */}
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color={COL.goldLight} transparent opacity={(0.06 + 0.04 * Math.sin(time * 2)) * glowOpacity} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial color={COL.primary} transparent opacity={(0.03 + 0.02 * Math.sin(time * 2.5)) * glowOpacity} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={COL.secondary} transparent opacity={(0.01 + 0.01 * Math.sin(time * 1.8)) * glowOpacity} />
      </mesh>
      {/* Orbiting commitment rings */}
      <mesh rotation={[time * 0.4, 0, time * 0.2]}>
        <torusGeometry args={[0.7, 0.01, 8, 64]} />
        <meshBasicMaterial color={COL.goldLight} transparent opacity={0.15 * glowOpacity} />
      </mesh>
      <mesh rotation={[time * 0.5, time * 0.3, 0]}>
        <torusGeometry args={[0.9, 0.006, 8, 64]} />
        <meshBasicMaterial color={COL.primary} transparent opacity={0.08 * glowOpacity} />
      </mesh>
      <pointLight color={COL.goldLight} intensity={1.5 * glowOpacity} distance={8} />
    </group>
  )
}

// ==================== MAIN COMMITMENT STAGE ====================
export function CommitmentStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const flashRef = useRef<THREE.Mesh>(null)

  const lp = localProgress(progress)

  // Animation state refs
  const stateRef = useRef({
    phase: 0, // 0=orbit, 1=approach, 2=flash, 3=commit, 4=reset
    phaseTime: 0,
    orbitAngle: 0,
    time: 0,
  })

  // Particle data for orbs
  const nullParticleData = useMemo(() =>
    Array.from({ length: 20 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.4,
      speed: 0.5 + Math.random() * 1.5,
      yOff: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
    })), []
  )

  const secParticleData = useMemo(() =>
    Array.from({ length: 20 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.4,
      speed: 0.5 + Math.random() * 1.5,
      yOff: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
    })), []
  )

  // Stream particles
  const streamData = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      isCyan: i < 20,
      t: Math.random(),
      speed: 0.008 + Math.random() * 0.012,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ),
    })), []
  )

  // Explosion particles
  const explosionData = useMemo(() =>
    Array.from({ length: 100 }, () => ({
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.14,
        (Math.random() - 0.5) * 0.14,
        (Math.random() - 0.5) * 0.14
      ),
      pos: new THREE.Vector3(0, 0, 0),
      life: 0,
      isCyan: Math.random() > 0.5,
    })), []
  )

  // Animation state
  const nullPos = useRef(new THREE.Vector3(-2.8, 0, 0))
  const secPos = useRef(new THREE.Vector3(2.8, 0, 0))
  const animState = useRef({
    nullVisible: true,
    secVisible: true,
    commVisible: false,
    commScale: 0,
    nullEmissive: 0.3,
    secEmissive: 0.3,
    nullScale: 1,
    secScale: 1,
    flashOpacity: 0,
    flashScale: 0.1,
    streamOpacity: 0,
    explosionOpacity: 0,
    glowOpacity: 1,
  })

  // Phase durations (in frames at 60fps)
  const ORBIT_DURATION = 40
  const APPROACH_DURATION = 160
  const FLASH_DURATION = 25
  const COMMIT_DURATION = 200
  const RESET_DURATION = 40
  const ORBIT_DIST = 2.5

  useFrame(({ clock }) => {
    if (progress < 0.18 || progress > 0.42) {
      if (groupRef.current) groupRef.current.visible = false
      return
    }
    if (groupRef.current) groupRef.current.visible = true

    const state = stateRef.current
    const anim = animState.current
    state.time = clock.getElapsedTime()
    state.phaseTime++

    const t = state.time

    // ==================== PHASE LOGIC ====================
    if (state.phase === 0) { // ORBIT
      state.orbitAngle += 0.012
      const bobY = Math.sin(t * 1.2) * 0.15

      nullPos.current.set(
        Math.cos(state.orbitAngle) * ORBIT_DIST,
        bobY + 0.1,
        Math.sin(state.orbitAngle) * ORBIT_DIST * 0.4
      )
      secPos.current.set(
        Math.cos(state.orbitAngle + Math.PI) * ORBIT_DIST,
        -bobY - 0.1,
        Math.sin(state.orbitAngle + Math.PI) * ORBIT_DIST * 0.4
      )

      anim.nullVisible = true
      anim.secVisible = true
      anim.commVisible = false
      anim.streamOpacity = 0

      if (state.phaseTime > ORBIT_DURATION) {
        state.phase = 1
        state.phaseTime = 0
      }
    }

    else if (state.phase === 1) { // APPROACH
      const prog = Math.min(state.phaseTime / APPROACH_DURATION, 1)
      const ease = Math.pow(prog, 2)
      const dist = ORBIT_DIST * Math.max(0.08, 1 - ease)
      const angularSpeed = 0.012 + Math.pow(prog, 3.5) * 0.35
      state.orbitAngle += angularSpeed
      const bobY = Math.sin(t * 1.5) * 0.1 * (1 - ease)

      nullPos.current.set(
        Math.cos(state.orbitAngle) * dist,
        bobY * (1 - ease),
        Math.sin(state.orbitAngle) * dist * 0.5
      )
      secPos.current.set(
        Math.cos(state.orbitAngle + Math.PI) * dist,
        -bobY * (1 - ease),
        Math.sin(state.orbitAngle + Math.PI) * dist * 0.5
      )

      anim.nullEmissive = 0.3 + ease * 0.7
      anim.secEmissive = 0.3 + ease * 0.7
      anim.nullScale = 1 + ease * 0.3
      anim.secScale = 1 + ease * 0.3
      anim.streamOpacity = ease * 0.5

      // Update stream particle positions
      streamData.forEach(sp => {
        sp.t += sp.speed
        if (sp.t > 1) sp.t -= 1
      })

      if (state.phaseTime >= APPROACH_DURATION) {
        state.phase = 2
        state.phaseTime = 0
        // Reset explosion particles
        explosionData.forEach(ep => {
          ep.pos.set(0, 0, 0)
          ep.vel.set(
            (Math.random() - 0.5) * 0.14,
            (Math.random() - 0.5) * 0.14,
            (Math.random() - 0.5) * 0.14
          )
          ep.life = 0
        })
      }
    }

    else if (state.phase === 2) { // FLASH
      const prog = state.phaseTime / FLASH_DURATION

      anim.nullVisible = false
      anim.secVisible = false
      anim.streamOpacity = 0
      anim.flashOpacity = (1 - prog) * 0.8
      anim.flashScale = 0.1 + prog * 4
      anim.explosionOpacity = Math.max(0, (1 - prog) * 0.6)

      // Update explosion particles
      explosionData.forEach(ep => {
        ep.life++
        ep.pos.add(ep.vel)
        ep.vel.multiplyScalar(0.94)
      })

      if (state.phaseTime >= FLASH_DURATION) {
        state.phase = 3
        state.phaseTime = 0
        anim.flashOpacity = 0
        anim.commVisible = true
        anim.commScale = 0.01
      }
    }

    else if (state.phase === 3) { // COMMIT
      const prog = Math.min(state.phaseTime / 40, 1)
      const easeOut = 1 - Math.pow(1 - prog, 3)
      anim.commScale = easeOut
      anim.glowOpacity = 1

      // Continue explosion fade
      explosionData.forEach(ep => {
        ep.pos.add(ep.vel)
        ep.vel.multiplyScalar(0.985)
      })
      anim.explosionOpacity *= 0.994

      if (state.phaseTime >= COMMIT_DURATION) {
        state.phase = 4
        state.phaseTime = 0
      }
    }

    else if (state.phase === 4) { // RESET
      const prog = state.phaseTime / RESET_DURATION
      const fadeOut = 1 - prog
      anim.glowOpacity = fadeOut

      if (state.phaseTime >= RESET_DURATION) {
        state.phase = 0
        state.phaseTime = 0
        anim.commVisible = false
        anim.nullVisible = true
        anim.secVisible = true
        anim.nullEmissive = 0.3
        anim.secEmissive = 0.3
        anim.nullScale = 1
        anim.secScale = 1
        anim.glowOpacity = 1
      }
    }

    // Update flash mesh
    if (flashRef.current) {
      flashRef.current.scale.setScalar(anim.flashScale)
      const mat = flashRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = anim.flashOpacity
    }
  })

  if (progress < 0.18 || progress > 0.42) return null

  const opacity = progress > 0.38 ? Math.max(0, 1 - (progress - 0.38) / 0.04) : 1
  const state = stateRef.current
  const anim = animState.current

  return (
    <group ref={groupRef}>
      {/* Nullifier Orb (cyan) */}
      <Orb
        color={COL.primary}
        position={nullPos.current}
        visible={anim.nullVisible}
        emissiveIntensity={anim.nullEmissive}
        scale={anim.nullScale}
        time={state.time}
        particleData={nullParticleData}
      />

      {/* Secret Orb (gold) */}
      <Orb
        color={COL.secondary}
        position={secPos.current}
        visible={anim.secVisible}
        emissiveIntensity={anim.secEmissive}
        scale={anim.secScale}
        time={state.time}
        particleData={secParticleData}
      />

      {/* Energy streams between orbs */}
      {anim.streamOpacity > 0.01 && streamData.map((sp, i) => {
        const from = sp.isCyan ? nullPos.current : secPos.current
        const to = sp.isCyan ? secPos.current : nullPos.current
        const ease = 1 - anim.streamOpacity / 0.5
        const px = from.x + (to.x - from.x) * sp.t + sp.offset.x * ease * Math.sin(state.time * 3 + sp.t * 5)
        const py = from.y + (to.y - from.y) * sp.t + sp.offset.y * ease * Math.cos(state.time * 2 + sp.t * 4)
        const pz = from.z + (to.z - from.z) * sp.t + sp.offset.z * ease
        return (
          <mesh key={i} position={[px, py, pz]} scale={0.015}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
              color={sp.isCyan ? COL.primary : COL.secondary}
              transparent
              opacity={anim.streamOpacity * Math.sin(sp.t * Math.PI) * opacity}
            />
          </mesh>
        )
      })}

      {/* Flash */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0} />
      </mesh>

      {/* Explosion particles */}
      {anim.explosionOpacity > 0.01 && explosionData.map((ep, i) => (
        <mesh key={i} position={ep.pos.toArray()} scale={0.012}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color={ep.isCyan ? COL.primary : COL.secondary}
            transparent
            opacity={Math.max(0, (1 - ep.life / 60) * 0.6) * opacity}
          />
        </mesh>
      ))}

      {/* Commitment Orb */}
      <CommitmentOrb
        visible={anim.commVisible}
        scale={anim.commScale}
        time={state.time}
        glowOpacity={anim.glowOpacity * opacity}
      />

      {/* Labels */}
      {anim.nullVisible && (
        <Text
          position={[nullPos.current.x, nullPos.current.y - 1.2, nullPos.current.z]}
          fontSize={0.25}
          color="#00e5cc"
          anchorX="center"
          fillOpacity={0.7 * opacity}
        >
          NULLIFIER
        </Text>
      )}
      {anim.secVisible && (
        <Text
          position={[secPos.current.x, secPos.current.y - 1.2, secPos.current.z]}
          fontSize={0.25}
          color="#d4a853"
          anchorX="center"
          fillOpacity={0.7 * opacity}
        >
          SECRET
        </Text>
      )}
      {anim.commVisible && anim.commScale > 0.5 && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.3}
          color="#f0d78c"
          anchorX="center"
          fillOpacity={0.8 * anim.glowOpacity * opacity}
        >
          COMMITMENT
        </Text>
      )}
    </group>
  )
}
