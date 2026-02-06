import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

// ==================== GEAR SHAPE ====================
function createGearShape(outerR: number, innerR: number, teeth: number): THREE.Shape {
  const shape = new THREE.Shape()
  const anglePerTooth = (Math.PI * 2) / teeth
  const halfTooth = anglePerTooth / 4

  const firstAngle = -halfTooth
  shape.moveTo(Math.cos(firstAngle) * innerR, Math.sin(firstAngle) * innerR)

  for (let i = 0; i < teeth; i++) {
    const a = i * anglePerTooth
    shape.lineTo(Math.cos(a - halfTooth * 0.4) * outerR, Math.sin(a - halfTooth * 0.4) * outerR)
    shape.lineTo(Math.cos(a + halfTooth * 0.4) * outerR, Math.sin(a + halfTooth * 0.4) * outerR)
    shape.lineTo(Math.cos(a + halfTooth) * innerR, Math.sin(a + halfTooth) * innerR)
    const nextStart = (i + 1) * anglePerTooth - halfTooth
    shape.lineTo(Math.cos(nextStart) * innerR, Math.sin(nextStart) * innerR)
  }
  shape.closePath()

  // Center hole
  const holePath = new THREE.Path()
  const holeR = innerR * 0.35
  holePath.absarc(0, 0, holeR, 0, Math.PI * 2, true)
  shape.holes.push(holePath)

  return shape
}

// ==================== GEAR COMPONENT ====================
function Gear({
  outerR,
  innerR,
  teeth,
  thickness,
  color: _color,
  glowColor,
  position,
  rotationOffset = 0,
  speed,
  opacity
}: {
  outerR: number
  innerR: number
  teeth: number
  thickness: number
  color: number
  glowColor: number
  position: [number, number, number]
  rotationOffset?: number
  speed: number
  opacity: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const shape = createGearShape(outerR, innerR, teeth)
    const extSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3
    }
    const geom = new THREE.ExtrudeGeometry(shape, extSettings)
    geom.center()
    return geom
  }, [outerR, innerR, teeth, thickness])

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = clock.getElapsedTime() * speed + rotationOffset
    }
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (0.4 + 0.3 * Math.sin(clock.getElapsedTime() * 2)) * opacity
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.6}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.85 * opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Core glow */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[innerR * 0.4, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.7 * opacity} />
      </mesh>
      {/* Core halo */}
      <mesh>
        <sphereGeometry args={[innerR * 0.7, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.3 * opacity} />
      </mesh>
      <pointLight position={[0, 0, 0.5]} intensity={0.8 * opacity} color={glowColor} distance={4} />
    </group>
  )
}

// ==================== DASHED PATH ====================
function DashedPath({
  start,
  end,
  arcHeight,
  dashCount,
  opacity
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  arcHeight: number
  dashCount: number
  opacity: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const dashes = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segs = 80
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const x = start.x + (end.x - start.x) * t
      const z = start.z + (end.z - start.z) * t
      const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * arcHeight
      points.push(new THREE.Vector3(x, y, z))
    }
    const curve = new THREE.CatmullRomCurve3(points)

    const result: { p1: THREE.Vector3; p2: THREE.Vector3 }[] = []
    for (let i = 0; i < dashCount; i++) {
      const t1 = i / dashCount
      const t2 = (i + 0.4) / dashCount
      result.push({
        p1: curve.getPoint(t1),
        p2: curve.getPoint(Math.min(t2, 1))
      })
    }
    return result
  }, [start, end, arcHeight, dashCount])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial
          mat.opacity = (0.15 + 0.15 * Math.sin(clock.getElapsedTime() * 2 + i * 0.3)) * opacity
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {dashes.map((dash, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([dash.p1.x, dash.p1.y, dash.p1.z, dash.p2.x, dash.p2.y, dash.p2.z]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={0x00e5cc} transparent opacity={0.5 * opacity} linewidth={2} />
        </line>
      ))}
    </group>
  )
}

// ==================== POOL PARTICLES ====================
const POOL_PARTICLE_COUNT = 60

function PoolParticles({ opacity }: { opacity: number }) {
  const groupRef = useRef<THREE.Group>(null)

  const particles = useMemo(() => {
    const cols = [0x00e5cc, 0x0affdb, 0x00b8a3, 0xffffff]
    return Array.from({ length: POOL_PARTICLE_COUNT }, () => {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * 1.3
      const x = r * Math.sin(ph) * Math.cos(th)
      const y = r * Math.sin(ph) * Math.sin(th)
      const z = r * Math.cos(ph)
      return {
        base: new THREE.Vector3(x, y, z),
        size: 0.015 + Math.random() * 0.04,
        color: cols[Math.floor(Math.random() * 4)],
        speed: 0.15 + Math.random() * 0.5,
        radius: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        drift: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 3,
        pulsePhase: Math.random() * Math.PI * 2,
        baseOp: 0.5 + Math.random() * 0.5
      }
    })
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const p = particles[i]
        const t2 = t * p.speed
        let nx = p.base.x + Math.sin(t2 + p.phase) * p.radius * p.axis.x + Math.cos(t2 * 0.7 + p.drift) * p.radius * 0.4
        let ny = p.base.y + Math.sin(t2 + p.phase + 1) * p.radius * p.axis.y
        let nz = p.base.z + Math.cos(t2 + p.phase) * p.radius * p.axis.z
        const d = Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (d > 1.35) {
          const s = 1.35 / d
          nx *= s
          ny *= s
          nz *= s
        }
        child.position.set(nx, ny, nz)
        const mat = child.material as THREE.MeshBasicMaterial
        mat.opacity = p.baseOp * (0.6 + 0.4 * Math.sin(t * p.pulseSpeed + p.pulsePhase)) * opacity
      }
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.base.x, p.base.y, p.base.z]} scale={p.size}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.baseOp * opacity} />
        </mesh>
      ))}
    </group>
  )
}

// ==================== USDC LOGO FACE ====================
function UsdcLogoFace({ zOffset, flipY, opacity }: { zOffset: number; flipY: boolean; opacity: number }) {
  const extrusion = 0.02

  // Left arc - curves from top-left to bottom-left like (
  const leftArcGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const radius = 0.18
    // Arc from ~120° to ~240° (left side parenthesis)
    for (let i = 0; i <= 24; i++) {
      const angle = (Math.PI * 0.65) + (i / 24) * (Math.PI * 0.7)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      points.push(new THREE.Vector3(x, y, 0))
    }
    const path = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(path, 24, 0.018, 8, false)
  }, [])

  // Right arc - curves from top-right to bottom-right like )
  const rightArcGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const radius = 0.18
    // Arc from ~-60° to ~60° (right side parenthesis)
    for (let i = 0; i <= 24; i++) {
      const angle = (-Math.PI * 0.35) + (i / 24) * (Math.PI * 0.7)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      points.push(new THREE.Vector3(x, y, 0))
    }
    const path = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(path, 24, 0.018, 8, false)
  }, [])

  return (
    <group position={[0, 0, zOffset]} rotation={flipY ? [0, Math.PI, 0] : [0, 0, 0]}>
      {/* $ symbol in center */}
      <Text
        position={[0, 0, extrusion]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        fillOpacity={opacity}
      >
        $
      </Text>
      {/* Left arc ( */}
      <mesh geometry={leftArcGeometry} position={[0, 0, extrusion]}>
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Right arc ) */}
      <mesh geometry={rightArcGeometry} position={[0, 0, extrusion]}>
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}

// ==================== USDC COIN ====================
function UsdcCoin({ position, opacity }: { position: [number, number, number]; opacity: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const shimmerRingsRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Slower rotation speed
      groupRef.current.rotation.y = clock.getElapsedTime() * 1.5
    }
    // Animate shimmer rings
    if (shimmerRingsRef.current) {
      const t = clock.getElapsedTime()
      shimmerRingsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial
          // Staggered pulsing opacity for shimmer effect
          mat.opacity = (0.15 + 0.25 * Math.sin(t * 4 + i * 1.2)) * opacity
          // Subtle scale breathing
          const scale = 1 + 0.08 * Math.sin(t * 3 + i * 0.8)
          child.scale.setScalar(scale)
        }
      })
    }
  })

  if (opacity <= 0.01) return null

  return (
    <group ref={groupRef} position={position}>
      {/* Coin body - vertical orientation */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 48]} />
        <meshStandardMaterial
          color={0x2775ca}
          emissive={0x2775ca}
          emissiveIntensity={1.0}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Coin rim - vertical */}
      <mesh>
        <torusGeometry args={[0.35, 0.03, 16, 48]} />
        <meshStandardMaterial
          color={0x4a9aea}
          emissive={0x4a9aea}
          emissiveIntensity={1.2}
          metalness={0.5}
          roughness={0.15}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* USDC logo on front face */}
      <UsdcLogoFace zOffset={0.045} flipY={false} opacity={opacity} />
      {/* USDC logo on back face */}
      <UsdcLogoFace zOffset={-0.045} flipY={true} opacity={opacity} />
      {/* Shimmer rings around the edge */}
      <group ref={shimmerRingsRef}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
            <torusGeometry args={[0.42 + i * 0.04, 0.008, 8, 64]} />
            <meshBasicMaterial color={0x4a9aea} transparent opacity={0.2 * opacity} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0, 0]} intensity={1.5 * opacity} color={0x2775ca} distance={5} />
    </group>
  )
}

// ==================== MAIN WITHDRAW STAGE ====================
export function WithdrawStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const haloRing1Ref = useRef<THREE.Mesh>(null)
  const haloRing2Ref = useRef<THREE.Mesh>(null)
  const userRef = useRef<THREE.Group>(null)

  const isVisible = progress >= 0.73 && progress <= 1.0
  const opacity = progress < 0.8 ? Math.max(0, (progress - 0.73) / 0.07) : 1

  // Positions: GEAR (left) → POOL (center) → USER (right)
  const GEAR_POS = useMemo(() => new THREE.Vector3(-6.5, 0.8, -2), [])
  const POOL_POS = useMemo(() => new THREE.Vector3(0, 0.6, 0), [])
  const USER_POS = useMemo(() => new THREE.Vector3(6, 0, 2), [])

  // Build full curve for coin path: GEAR → POOL → USER
  const fullCurve = useMemo(() => {
    const path1Start = GEAR_POS.clone()
    const path1End = POOL_POS.clone()
    const path2Start = POOL_POS.clone()
    const path2End = new THREE.Vector3(USER_POS.x, USER_POS.y + 0.8, USER_POS.z)

    const buildArcPoints = (start: THREE.Vector3, end: THREE.Vector3, arcHeight: number) => {
      const pts: THREE.Vector3[] = []
      const segs = 60
      for (let i = 0; i <= segs; i++) {
        const t = i / segs
        const x = start.x + (end.x - start.x) * t
        const z = start.z + (end.z - start.z) * t
        const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * arcHeight
        pts.push(new THREE.Vector3(x, y, z))
      }
      return pts
    }

    const pts1 = buildArcPoints(path1Start, path1End, 0.8)
    const pts2 = buildArcPoints(path2Start, path2End, 0.7)

    return new THREE.CatmullRomCurve3([...pts1, ...pts2.slice(1)])
  }, [USER_POS, POOL_POS, GEAR_POS])

  // Coin state - use useState for re-renders
  const [coinPos, setCoinPos] = useState<[number, number, number]>([GEAR_POS.x, GEAR_POS.y, GEAR_POS.z])
  const [coinOpacity, setCoinOpacity] = useState(1)
  const coinState = useRef({ t: 0, fading: false, opacity: 1, waiting: 0 })

  // Orbital ring rotations (stored in useMemo to be stable)
  const orbitalRotations = useMemo(() => [
    [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
  ] as [number, number, number][], [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.visible = isVisible

    if (!isVisible) return

    const t = clock.getElapsedTime()

    // User float
    if (userRef.current) {
      userRef.current.position.y = USER_POS.y + Math.sin(t * 0.8) * 0.06
    }

    // Wire rotation
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.05
      wireRef.current.rotation.x = t * 0.03
    }

    // Core pulse
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (0.3 + 0.2 * Math.sin(t * 2)) * opacity
      coreRef.current.scale.setScalar(1 + 0.15 * Math.sin(t * 1.5))
    }

    // Halo pulse
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (0.1 + 0.05 * Math.sin(t * 1.8)) * opacity
    }

    // Halo rings rotation
    if (haloRing1Ref.current) {
      haloRing1Ref.current.rotation.z = t * 0.1
    }
    if (haloRing2Ref.current) {
      haloRing2Ref.current.rotation.z = -t * 0.07
    }

    // Coin travel animation
    const cs = coinState.current
    if (cs.waiting > 0) {
      cs.waiting -= 0.016
      cs.opacity = Math.min(1, cs.opacity + 0.04)
    } else if (!cs.fading) {
      cs.t += 0.004
      if (cs.t >= 0.95) {
        cs.fading = true
      }
    }

    if (cs.fading) {
      cs.opacity -= 0.04
      if (cs.opacity <= 0) {
        cs.opacity = 0
        cs.t = 0
        cs.fading = false
        cs.waiting = 0.5
      }
    }

    // Position coin on curve
    const cp = fullCurve.getPoint(Math.min(cs.t, 1))
    setCoinPos([cp.x, cp.y, cp.z])
    setCoinOpacity(cs.opacity * opacity)
  })

  if (!isVisible) return null

  // Gear speeds (teeth must mesh)
  const gear1Speed = 0.4
  const gear2Speed = -gear1Speed * (16 / 12)
  const gear3Speed = -gear1Speed * (16 / 10)

  return (
    <group ref={groupRef}>
      {/* ── User Avatar ── */}
      <group ref={userRef} position={USER_POS.toArray()}>
        {/* Head */}
        <mesh position={[0, 1.45, 0]}>
          <sphereGeometry args={[0.5, 48, 48]} />
          <meshStandardMaterial
            color={0x00e5cc}
            emissive={0x00e5cc}
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        {/* Body (half sphere) */}
        <mesh scale={[1, 1.35, 1]}>
          <sphereGeometry args={[0.8, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            color={0x00e5cc}
            emissive={0x00e5cc}
            emissiveIntensity={0.7}
            metalness={0.1}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        {/* Body cap */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <circleGeometry args={[0.8, 48]} />
          <meshStandardMaterial
            color={0x00e5cc}
            emissive={0x00e5cc}
            emissiveIntensity={0.7}
            metalness={0.1}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        <pointLight position={[0, 1, 1]} intensity={1.2 * opacity} color={0x00e5cc} distance={5} />
      </group>

      {/* ── Privacy Pool ── */}
      <group position={POOL_POS.toArray()}>
        {/* Glass sphere - using standard material for better visibility */}
        <mesh>
          <sphereGeometry args={[1.6, 96, 96]} />
          <meshStandardMaterial
            color={0x00e5cc}
            emissive={0x00e5cc}
            emissiveIntensity={0.3}
            metalness={0.1}
            roughness={0.1}
            transparent
            opacity={0.35 * opacity}
          />
        </mesh>
        {/* Inner glow sphere */}
        <mesh>
          <sphereGeometry args={[1.5, 48, 48]} />
          <meshBasicMaterial color={0x00e5cc} transparent opacity={0.15 * opacity} side={THREE.BackSide} />
        </mesh>
        {/* Wireframe */}
        <mesh ref={wireRef}>
          <icosahedronGeometry args={[1.63, 3]} />
          <meshBasicMaterial color={0x00e5cc} wireframe transparent opacity={0.35 * opacity} />
        </mesh>
        {/* Core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshBasicMaterial color={0x00e5cc} transparent opacity={0.7 * opacity} />
        </mesh>
        {/* Halo */}
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={0x00e5cc} transparent opacity={0.25 * opacity} />
        </mesh>
        {/* Orbital rings */}
        {orbitalRotations.map((rot, i) => (
          <mesh key={i} rotation={rot}>
            <torusGeometry args={[0.6 + i * 0.35, 0.012, 8, 128]} />
            <meshBasicMaterial color={0x00e5cc} transparent opacity={(0.25 + i * 0.08) * opacity} />
          </mesh>
        ))}
        {/* Pool particles */}
        <PoolParticles opacity={opacity} />
        <pointLight position={[0, 0, 0]} intensity={2.0 * opacity} color={0x00e5cc} distance={8} />
      </group>

      {/* ── Gears Assembly ── */}
      <group position={GEAR_POS.toArray()}>
        {/* Gear 1 — Large */}
        <Gear
          outerR={1.2}
          innerR={0.9}
          teeth={16}
          thickness={0.25}
          color={0x0a3a5a}
          glowColor={0x00e5cc}
          position={[0, 0, 0]}
          speed={gear1Speed}
          opacity={opacity}
        />
        {/* Gear 2 — Medium */}
        <Gear
          outerR={0.8}
          innerR={0.6}
          teeth={12}
          thickness={0.22}
          color={0x1a3a5a}
          glowColor={0x00e5cc}
          position={[1.65, 0.6, 0.3]}
          speed={gear2Speed}
          rotationOffset={0.155}
          opacity={opacity}
        />
        {/* Gear 3 — Small */}
        <Gear
          outerR={0.55}
          innerR={0.4}
          teeth={10}
          thickness={0.18}
          color={0x1a2a4a}
          glowColor={0x00e5cc}
          position={[-1.3, 0.8, -0.2]}
          speed={gear3Speed}
          rotationOffset={0.1}
          opacity={opacity}
        />
        {/* Halo rings */}
        <mesh ref={haloRing1Ref} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.02, 8, 64]} />
          <meshBasicMaterial color={0x00e5cc} transparent opacity={0.25 * opacity} />
        </mesh>
        <mesh ref={haloRing2Ref} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.015, 8, 64]} />
          <meshBasicMaterial color={0x00e5cc} transparent opacity={0.18 * opacity} />
        </mesh>
        <pointLight position={[0, 0, 0]} intensity={1.8 * opacity} color={0x00e5cc} distance={8} />
      </group>

      {/* ── Dashed Paths ── */}
      <DashedPath
        start={GEAR_POS}
        end={POOL_POS}
        arcHeight={0.7}
        dashCount={25}
        opacity={opacity}
      />
      <DashedPath
        start={POOL_POS}
        end={new THREE.Vector3(USER_POS.x, USER_POS.y + 0.8, USER_POS.z)}
        arcHeight={0.8}
        dashCount={25}
        opacity={opacity}
      />

      {/* ── USDC Coin ── */}
      <UsdcCoin position={coinPos} opacity={coinOpacity} />

      {/* ── Labels ── */}
      <Text position={[USER_POS.x, -1.5, USER_POS.z]} fontSize={0.4} color="#00e5cc" anchorX="center" fillOpacity={0.8 * opacity}>
        USER
      </Text>
      <Text position={[POOL_POS.x, -1.8, POOL_POS.z]} fontSize={0.4} color="#00e5cc" anchorX="center" fillOpacity={0.8 * opacity}>
        PRIVACY VAULT
      </Text>
      <Text position={[GEAR_POS.x, -1.5, GEAR_POS.z]} fontSize={0.4} color="#00e5cc" anchorX="center" fillOpacity={0.8 * opacity}>
        YIELD ENGINE
      </Text>
    </group>
  )
}
