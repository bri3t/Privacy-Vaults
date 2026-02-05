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

// ==================== USDC LOGO FACE ====================
function UsdcLogoFace({ zOffset, flipY, opacity }: { zOffset: number; flipY: boolean; opacity: number }) {
  const extrusion = 0.02

  // Left arc
  const leftArcGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const radius = 0.18
    for (let i = 0; i <= 24; i++) {
      const angle = (Math.PI * 0.65) + (i / 24) * (Math.PI * 0.7)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      points.push(new THREE.Vector3(x, y, 0))
    }
    const path = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(path, 24, 0.018, 8, false)
  }, [])

  // Right arc
  const rightArcGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const radius = 0.18
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
      <mesh geometry={leftArcGeometry} position={[0, 0, extrusion]}>
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
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
function UsdcCoin({ position, opacity, scale = 1 }: { position: [number, number, number]; opacity: number; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const shimmerRingsRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 1.5
    }
    if (shimmerRingsRef.current) {
      const t = clock.getElapsedTime()
      shimmerRingsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial
          mat.opacity = (0.15 + 0.25 * Math.sin(t * 4 + i * 1.2)) * opacity
          const s = 1 + 0.08 * Math.sin(t * 3 + i * 0.8)
          child.scale.setScalar(s)
        }
      })
    }
  })

  if (opacity <= 0.01) return null

  return (
    <group ref={groupRef} position={position} scale={scale}>
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
      <UsdcLogoFace zOffset={0.045} flipY={false} opacity={opacity} />
      <UsdcLogoFace zOffset={-0.045} flipY={true} opacity={opacity} />
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
  const haloRing1Ref = useRef<THREE.Mesh>(null)
  const haloRing2Ref = useRef<THREE.Mesh>(null)
  const userRef = useRef<THREE.Group>(null)

  // Visibility: show when progress is in 0.8-1.0 range (stage 5)
  const isVisible = progress >= 0.73 && progress <= 1.0
  const opacity = progress < 0.8 ? Math.max(0, (progress - 0.73) / 0.07) : 1

  // Positions - scaled down and centered
  const GEAR_POS = useMemo(() => new THREE.Vector3(-3.5, 0.3, 0), [])
  const USER_POS = useMemo(() => new THREE.Vector3(3.5, -0.2, 0), [])

  // Build curve for coin path (gears → user)
  const coinCurve = useMemo(() => {
    const start = GEAR_POS.clone()
    const end = new THREE.Vector3(USER_POS.x, USER_POS.y + 0.4, USER_POS.z)
    const arcHeight = 0.8

    const points: THREE.Vector3[] = []
    const segs = 80
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const x = start.x + (end.x - start.x) * t
      const z = start.z + (end.z - start.z) * t
      const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * arcHeight
      points.push(new THREE.Vector3(x, y, z))
    }
    return new THREE.CatmullRomCurve3(points)
  }, [GEAR_POS, USER_POS])

  // Multiple coins with staggered timing
  const [coin1Pos, setCoin1Pos] = useState<[number, number, number]>([GEAR_POS.x, GEAR_POS.y, GEAR_POS.z])
  const [coin1Opacity, setCoin1Opacity] = useState(1)
  const [coin2Pos, setCoin2Pos] = useState<[number, number, number]>([GEAR_POS.x, GEAR_POS.y, GEAR_POS.z])
  const [coin2Opacity, setCoin2Opacity] = useState(0)
  const [coin3Pos, setCoin3Pos] = useState<[number, number, number]>([GEAR_POS.x, GEAR_POS.y, GEAR_POS.z])
  const [coin3Opacity, setCoin3Opacity] = useState(0)

  const coinStates = useRef([
    { t: 0, fading: false, opacity: 1, waiting: 0 },
    { t: 0, fading: false, opacity: 0, waiting: 1.2 },
    { t: 0, fading: false, opacity: 0, waiting: 2.4 }
  ])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.visible = isVisible

    if (!isVisible) return

    const t = clock.getElapsedTime()

    // User float
    if (userRef.current) {
      userRef.current.position.y = USER_POS.y + Math.sin(t * 0.8) * 0.04
    }

    // Halo rings rotation
    if (haloRing1Ref.current) {
      haloRing1Ref.current.rotation.z = t * 0.1
    }
    if (haloRing2Ref.current) {
      haloRing2Ref.current.rotation.z = -t * 0.07
    }

    // Animate coins
    const setters = [
      { setPos: setCoin1Pos, setOp: setCoin1Opacity },
      { setPos: setCoin2Pos, setOp: setCoin2Opacity },
      { setPos: setCoin3Pos, setOp: setCoin3Opacity }
    ]

    coinStates.current.forEach((cs, i) => {
      if (cs.waiting > 0) {
        cs.waiting -= 0.016
        cs.opacity = Math.min(1, cs.opacity + 0.04)
      } else if (!cs.fading) {
        cs.t += 0.005
        if (cs.t >= 0.95) {
          cs.fading = true
        }
      }

      if (cs.fading) {
        cs.opacity -= 0.05
        if (cs.opacity <= 0) {
          cs.opacity = 0
          cs.t = 0
          cs.fading = false
          cs.waiting = 0.8
        }
      }

      const cp = coinCurve.getPoint(Math.min(cs.t, 1))
      setters[i].setPos([cp.x, cp.y, cp.z])
      setters[i].setOp(cs.opacity * opacity)
    })
  })

  if (!isVisible) return null

  // Gear speeds
  const gear1Speed = 0.4
  const gear2Speed = -gear1Speed * (16 / 12)
  const gear3Speed = -gear1Speed * (16 / 10)

  return (
    <group ref={groupRef}>
      {/* ── Gears Assembly (Yield Engine) ── */}
      <group position={GEAR_POS.toArray()} scale={0.55}>
        <Gear
          outerR={1.2}
          innerR={0.9}
          teeth={16}
          thickness={0.25}
          glowColor={0x00e5cc}
          position={[0, 0, 0]}
          speed={gear1Speed}
          opacity={opacity}
        />
        <Gear
          outerR={0.8}
          innerR={0.6}
          teeth={12}
          thickness={0.22}
          glowColor={0x00e5cc}
          position={[1.65, 0.6, 0.3]}
          speed={gear2Speed}
          rotationOffset={0.155}
          opacity={opacity}
        />
        <Gear
          outerR={0.55}
          innerR={0.4}
          teeth={10}
          thickness={0.18}
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

      {/* ── User Avatar ── */}
      <group ref={userRef} position={USER_POS.toArray()} scale={0.55}>
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

      {/* ── Dashed Path ── */}
      <DashedPath
        start={GEAR_POS}
        end={new THREE.Vector3(USER_POS.x, USER_POS.y + 0.4, USER_POS.z)}
        arcHeight={0.8}
        dashCount={20}
        opacity={opacity}
      />

      {/* ── USDC Coins (multiple, staggered) ── */}
      <UsdcCoin position={coin1Pos} opacity={coin1Opacity} scale={0.6} />
      <UsdcCoin position={coin2Pos} opacity={coin2Opacity} scale={0.5} />
      <UsdcCoin position={coin3Pos} opacity={coin3Opacity} scale={0.4} />

      {/* ── Labels ── */}
      <Text position={[GEAR_POS.x, -1.3, GEAR_POS.z]} fontSize={0.28} color="#00e5cc" anchorX="center" fillOpacity={0.8 * opacity}>
        YIELD ENGINE
      </Text>
      <Text position={[USER_POS.x, -1.3, USER_POS.z]} fontSize={0.28} color="#00e5cc" anchorX="center" fillOpacity={0.8 * opacity}>
        USER
      </Text>
    </group>
  )
}
