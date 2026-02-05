import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, (progress - 0.4) / 0.2))
}

interface TreeNode {
  x: number
  y: number
  level: number
  index: number
  isHighlighted: boolean
}

// Build a 4-level binary tree layout
function buildTree(): { nodes: TreeNode[]; edges: [number, number][] } {
  const nodes: TreeNode[] = []
  const edges: [number, number][] = []
  const levels = 4
  const highlightPath = [0, 0, 1, 1] // path from root to our leaf

  let nodeId = 0

  for (let level = 0; level < levels; level++) {
    const count = Math.pow(2, level)
    const spacing = 8 / count
    const y = (levels - 1 - level) * 1.5 - 1

    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * spacing

      // Determine if this node is on the highlight path
      let isHighlighted = true
      let checkI = i
      for (let l = level; l > 0; l--) {
        if (highlightPath[l] !== checkI % 2) {
          isHighlighted = false
          break
        }
        checkI = Math.floor(checkI / 2)
      }

      nodes.push({ x, y, level, index: i, isHighlighted })

      // Edge to parent
      if (level > 0) {
        const parentIndex = Math.floor(i / 2)
        const parentNodeId = nodes.findIndex(
          (n) => n.level === level - 1 && n.index === parentIndex
        )
        if (parentNodeId >= 0) {
          edges.push([nodeId, parentNodeId])
        }
      }
      nodeId++
    }
  }

  return { nodes, edges }
}

// Edge rendered as a primitive THREE.Line to avoid JSX <line> / SVG conflict
function EdgeLine({ from, to, color, opacity }: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  opacity: number
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from),
      new THREE.Vector3(...to),
    ])
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    return new THREE.Line(geo, mat)
  }, [from, to, color, opacity])

  // Update opacity each frame
  useFrame(() => {
    ;(lineObj.material as THREE.LineBasicMaterial).opacity = opacity
  })

  return <primitive object={lineObj} />
}

export function MerkleTreeStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lp = localProgress(progress)

  const { nodes, edges } = useMemo(() => buildTree(), [])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.visible = progress >= 0.38 && progress < 0.62
  })

  if (progress < 0.38 || progress > 0.62) return null

  const opacity = progress > 0.58 ? Math.max(0, 1 - (progress - 0.58) / 0.04) : 1
  const fadeIn = Math.min(1, (progress - 0.38) / 0.04)
  const effectiveOpacity = opacity * fadeIn

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map(([a, b], i) => {
        const nodeA = nodes[a]
        const nodeB = nodes[b]
        const highlighted = nodeA.isHighlighted && nodeB.isHighlighted
        const edgeLevel = nodeA.level
        const appear = lp > edgeLevel * 0.15 ? 1 : 0
        return (
          <EdgeLine
            key={`edge-${i}`}
            from={[nodeA.x, nodeA.y, 0]}
            to={[nodeB.x, nodeB.y, 0]}
            color={highlighted ? '#d4d4d8' : '#3f3f46'}
            opacity={effectiveOpacity * appear * (highlighted ? 0.8 : 0.3)}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const appear = lp > node.level * 0.15 ? 1 : 0
        const nodeScale = appear * (node.isHighlighted ? 0.2 : 0.12)

        const isNewCommitment = node.isHighlighted && node.level === 3
        const pulseScale = isNewCommitment
          ? 1 + Math.sin(progress * 30) * 0.15
          : 1

        return (
          <mesh
            key={`node-${i}`}
            position={[node.x, node.y, 0]}
            scale={nodeScale * pulseScale}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={node.isHighlighted ? '#d4d4d8' : '#52525b'}
              emissive={node.isHighlighted ? '#d4d4d8' : '#27272a'}
              emissiveIntensity={node.isHighlighted ? 0.6 : 0.1}
              transparent
              opacity={effectiveOpacity * appear}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        )
      })}

      {/* Root node glow — lights up last */}
      {lp > 0.7 && (
        <mesh position={[nodes[0].x, nodes[0].y, 0]} scale={0.35}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="#e4e4e7"
            emissive="#e4e4e7"
            emissiveIntensity={1}
            transparent
            opacity={effectiveOpacity * Math.min(1, (lp - 0.7) / 0.2)}
          />
        </mesh>
      )}
    </group>
  )
}
