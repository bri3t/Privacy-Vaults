import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface MerkleTreeAnimationProps {
  visible: boolean
}

export function MerkleTreeAnimation({ visible }: MerkleTreeAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!visible || !containerRef.current) return

    const container = containerRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    const COL = {
      bgDeep: 0x050507,
      primary: 0x00e5cc,
      secondary: 0xd4a853,
      goldLight: 0xf0d78c,
      text: 0xe0e0e8,
    }

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.set(0, 1.5, 12)
    camera.lookAt(0, 1.5, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // ==================== BUILD MERKLE TREE ====================
    const LEVELS = 4
    const treeNodes: {
      pos: THREE.Vector3
      level: number
      index: number
      mesh: THREE.Mesh
      glowMesh: THREE.Mesh
      parentIdx: number
      lit: boolean
      litIntensity: number
      baseColor: number
      isRoot: boolean
      isLeaf: boolean
    }[] = []
    const treeEdges: {
      line: THREE.Line
      fromIdx: number
      toIdx: number
      lit: boolean
      litIntensity: number
    }[] = []

    const treeGroup = new THREE.Group()
    scene.add(treeGroup)

    const TREE_WIDTH = 7
    const TREE_HEIGHT = 4
    const ROOT_Y = TREE_HEIGHT / 2  // Center tree vertically at y=0

    const NODE_RADII = [0.38, 0.30, 0.24, 0.19]

    let nodeIdx = 0
    for (let level = 0; level < LEVELS; level++) {
      const count = Math.pow(2, level)
      const y = ROOT_Y - (level / (LEVELS - 1)) * TREE_HEIGHT
      const nodeR = NODE_RADII[level]

      // Calculate spacing for this level - each level has double the width of the one above
      const maxWidth = TREE_WIDTH
      const spacing = maxWidth / count

      for (let i = 0; i < count; i++) {
        // Center the nodes symmetrically: position from -(count-1)/2 to (count-1)/2
        const x = (i - (count - 1) / 2) * spacing
        const z = 0

        const isRoot = level === 0
        const isLeaf = level === LEVELS - 1

        const nodeGeo = isRoot
          ? new THREE.IcosahedronGeometry(nodeR, 1)
          : new THREE.SphereGeometry(nodeR, 32, 32)

        const baseColor = isRoot ? COL.secondary : COL.primary
        const nodeMat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          metalness: 0.1,
          roughness: 0.15,
          emissive: baseColor,
          emissiveIntensity: isRoot ? 0.4 : 0.2,
          clearcoat: 0.7,
          transparent: true,
          opacity: isLeaf ? 0.7 : 0.85,
        })

        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
        nodeMesh.position.set(x, y, z)
        treeGroup.add(nodeMesh)

        const glowGeo = new THREE.SphereGeometry(nodeR * 1.8, 16, 16)
        const glowMat = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0,
        })
        const glowMesh = new THREE.Mesh(glowGeo, glowMat)
        glowMesh.position.set(x, y, z)
        treeGroup.add(glowMesh)

        let parentIdx = -1
        if (level > 0) {
          const parentLevel = level - 1
          let pIdx = 0
          for (let l = 0; l < parentLevel; l++) pIdx += Math.pow(2, l)
          pIdx += Math.floor(i / 2)
          parentIdx = pIdx
        }

        treeNodes.push({
          pos: new THREE.Vector3(x, y, z),
          level,
          index: i,
          mesh: nodeMesh,
          glowMesh,
          parentIdx,
          lit: false,
          litIntensity: 0,
          baseColor,
          isRoot,
          isLeaf,
        })

        nodeIdx++
      }
    }

    // Create edges
    treeNodes.forEach((node, idx) => {
      if (node.parentIdx < 0) return
      const parent = treeNodes[node.parentIdx]

      const points = [node.pos.clone(), parent.pos.clone()]
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: COL.primary,
        transparent: true,
        opacity: 0.15,
      })
      const line = new THREE.Line(geo, mat)
      treeGroup.add(line)

      treeEdges.push({
        line,
        fromIdx: idx,
        toIdx: node.parentIdx,
        lit: false,
        litIntensity: 0,
      })
    })

    // ==================== COMMITMENT ORB ====================
    const commGroup = new THREE.Group()
    commGroup.visible = false

    const commCoreMat = new THREE.MeshPhysicalMaterial({
      color: COL.goldLight,
      metalness: 0.2,
      roughness: 0.05,
      clearcoat: 1.0,
      emissive: COL.goldLight,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1,
    })
    const commCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), commCoreMat)
    commGroup.add(commCore)

    const commGlowMat = new THREE.MeshBasicMaterial({ color: COL.goldLight, transparent: true, opacity: 0.15 })
    const commGlow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), commGlowMat)
    commGroup.add(commGlow)

    const commGlow2Mat = new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.06 })
    const commGlow2 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), commGlow2Mat)
    commGroup.add(commGlow2)

    const commLight = new THREE.PointLight(COL.goldLight, 0, 6)
    commGroup.add(commLight)
    scene.add(commGroup)

    // ==================== ENERGY PULSE ====================
    const pulseGroup = new THREE.Group()
    pulseGroup.visible = false

    const pulseCoreMat = new THREE.MeshBasicMaterial({ color: COL.goldLight, transparent: true, opacity: 0.9 })
    const pulseCore = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), pulseCoreMat)
    pulseGroup.add(pulseCore)

    const pulseGlowMat = new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.2 })
    const pulseGlow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), pulseGlowMat)
    pulseGroup.add(pulseGlow)

    const pulseGlow2Mat = new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.08 })
    const pulseGlow2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), pulseGlow2Mat)
    pulseGroup.add(pulseGlow2)

    const pulseLight = new THREE.PointLight(COL.goldLight, 0, 7)
    pulseGroup.add(pulseLight)
    scene.add(pulseGroup)

    // ==================== ROOT FLASH ====================
    const rootFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const rootFlash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), rootFlashMat)
    rootFlash.position.copy(treeNodes[0].pos)
    scene.add(rootFlash)

    // ==================== WAVE RINGS ====================
    const waveRings: { mesh: THREE.Mesh; active: boolean; scale: number; opacity: number; pos: THREE.Vector3 }[] = []
    const waveGeo = new THREE.TorusGeometry(0.1, 0.008, 8, 32)
    for (let i = 0; i < 8; i++) {
      const wMat = new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0 })
      const w = new THREE.Mesh(waveGeo, wMat)
      scene.add(w)
      waveRings.push({ mesh: w, active: false, scale: 1, opacity: 0, pos: new THREE.Vector3() })
    }
    let waveIdx = 0

    function spawnWave(pos: THREE.Vector3) {
      const w = waveRings[waveIdx % waveRings.length]
      w.active = true
      w.scale = 1
      w.opacity = 0.3
      w.pos.copy(pos)
      w.mesh.position.copy(pos)
      w.mesh.rotation.set(Math.random() * 0.5, Math.random() * 0.5, 0)
      waveIdx++
    }

    // ==================== LIGHTING ====================
    scene.add(new THREE.AmbientLight(0x1a1a2a, 0.6))
    scene.add(new THREE.HemisphereLight(0x050507, COL.primary, 0.15))

    const keyL = new THREE.DirectionalLight(0xffffff, 0.4)
    keyL.position.set(3, 6, 4)
    scene.add(keyL)

    const fillL = new THREE.PointLight(COL.secondary, 0.25, 20)
    fillL.position.set(-5, 3, -3)
    scene.add(fillL)

    const fillL2 = new THREE.PointLight(COL.primary, 0.25, 20)
    fillL2.position.set(5, -2, 3)
    scene.add(fillL2)

    // ==================== ANIMATION STATE ====================
    let targetLeafIdx = 0
    function pickRandomLeaf() {
      const leaves = treeNodes.filter(n => n.isLeaf)
      const leaf = leaves[Math.floor(Math.random() * leaves.length)]
      targetLeafIdx = treeNodes.indexOf(leaf)
    }

    function buildPath(leafIdx: number) {
      const path = [leafIdx]
      let current = leafIdx
      while (treeNodes[current].parentIdx >= 0) {
        current = treeNodes[current].parentIdx
        path.push(current)
      }
      return path
    }

    const PH_IDLE = 0
    const PH_DESCEND = 1
    const PH_INSERT = 2
    const PH_CLIMB = 3
    const PH_ROOT_FLASH = 4
    const PH_GLOW = 5
    const PH_RESET = 6

    let phase = PH_IDLE
    let phaseTime = 0
    let path: number[] = []
    let climbStep = 0
    let climbProgress = 0

    const IDLE_DUR = 60
    const DESCEND_DUR = 100
    const INSERT_DUR = 30
    const CLIMB_STEP_DUR = 28
    const ROOT_FLASH_DUR = 40
    const GLOW_DUR = 120
    const RESET_DUR = 50

    let time = 0

    pickRandomLeaf()
    path = buildPath(targetLeafIdx)

    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      time += 0.01
      phaseTime++

      // ==================== PHASE: IDLE ====================
      if (phase === PH_IDLE) {
        commGroup.visible = false
        pulseGroup.visible = false

        if (phaseTime >= IDLE_DUR) {
          phase = PH_DESCEND
          phaseTime = 0
          commGroup.visible = true
          commGroup.position.set(treeNodes[targetLeafIdx].pos.x * 0.3, ROOT_Y + 2, 0)
        }
      }

      // ==================== PHASE: DESCEND ====================
      else if (phase === PH_DESCEND) {
        const prog = Math.min(phaseTime / DESCEND_DUR, 1)
        const ease = 1 - Math.pow(1 - prog, 3)

        const leafPos = treeNodes[targetLeafIdx].pos
        const startY = ROOT_Y + 2
        const startX = leafPos.x * 0.3

        commGroup.position.x = startX + (leafPos.x - startX) * ease
        commGroup.position.y = startY + (leafPos.y - startY) * ease
        commGroup.position.z = leafPos.z * ease

        commCore.rotation.y = time * 2
        commCore.rotation.x = time * 1.2
        commLight.intensity = 0.8 + 0.3 * Math.sin(time * 3)

        commCoreMat.emissiveIntensity = 0.5 + ease * 0.5
        commGlowMat.opacity = 0.12 + ease * 0.1

        if (phaseTime >= DESCEND_DUR) {
          phase = PH_INSERT
          phaseTime = 0
        }
      }

      // ==================== PHASE: INSERT ====================
      else if (phase === PH_INSERT) {
        const prog = Math.min(phaseTime / INSERT_DUR, 1)

        const shrink = 1 - prog
        commCore.scale.setScalar(shrink)
        commGlow.scale.setScalar(shrink)
        commGlow2.scale.setScalar(shrink)
        commCoreMat.opacity = shrink
        commGlowMat.opacity = 0.2 * shrink
        commLight.intensity = 1.5 * shrink

        const leaf = treeNodes[targetLeafIdx]
        const leafMat = leaf.mesh.material as THREE.MeshPhysicalMaterial
        leafMat.emissiveIntensity = 0.2 + prog * 0.8
        leafMat.opacity = 0.7 + prog * 0.3
        const leafGlowMat = leaf.glowMesh.material as THREE.MeshBasicMaterial
        leafGlowMat.opacity = prog * 0.08
        leafGlowMat.color.set(COL.goldLight)
        leafMat.emissive.set(COL.goldLight)
        leaf.litIntensity = prog

        if (prog >= 1) {
          spawnWave(leaf.pos)
          phase = PH_CLIMB
          phaseTime = 0
          climbStep = 0
          climbProgress = 0
          commGroup.visible = false

          commCore.scale.setScalar(1)
          commGlow.scale.setScalar(1)
          commGlow2.scale.setScalar(1)
          commCoreMat.opacity = 1

          pulseGroup.visible = true
          pulseGroup.position.copy(leaf.pos)
        }
      }

      // ==================== PHASE: CLIMB ====================
      else if (phase === PH_CLIMB) {
        if (climbStep < path.length - 1) {
          climbProgress += 1 / CLIMB_STEP_DUR

          const fromNode = treeNodes[path[climbStep]]
          const toNode = treeNodes[path[climbStep + 1]]

          const ease = climbProgress * climbProgress * (3 - 2 * climbProgress)

          pulseGroup.position.lerpVectors(fromNode.pos, toNode.pos, ease)
          pulseLight.intensity = 2.0 + Math.sin(time * 5) * 0.5

          const edge = treeEdges.find(e =>
            (e.fromIdx === path[climbStep] && e.toIdx === path[climbStep + 1]) ||
            (e.fromIdx === path[climbStep + 1] && e.toIdx === path[climbStep])
          )
          if (edge) {
            edge.litIntensity = Math.max(edge.litIntensity, ease)
            const edgeMat = edge.line.material as THREE.LineBasicMaterial
            edgeMat.opacity = 0.15 + ease * 0.5
            edgeMat.color.set(COL.goldLight)
          }

          if (climbProgress >= 1) {
            const arrivedNode = toNode
            const arrivedMat = arrivedNode.mesh.material as THREE.MeshPhysicalMaterial
            arrivedMat.emissiveIntensity = 1.0
            arrivedMat.emissive.set(COL.goldLight)
            arrivedMat.opacity = 1
            const arrivedGlowMat = arrivedNode.glowMesh.material as THREE.MeshBasicMaterial
            arrivedGlowMat.opacity = 0.08
            arrivedGlowMat.color.set(COL.goldLight)
            arrivedNode.litIntensity = 1

            spawnWave(arrivedNode.pos)

            climbStep++
            climbProgress = 0
          }
        } else {
          phase = PH_ROOT_FLASH
          phaseTime = 0
          pulseGroup.visible = false
        }
      }

      // ==================== PHASE: ROOT FLASH ====================
      else if (phase === PH_ROOT_FLASH) {
        const prog = phaseTime / ROOT_FLASH_DUR

        rootFlash.visible = true
        const flashScale = 0.3 + prog * 5
        rootFlash.scale.setScalar(flashScale)
        rootFlashMat.opacity = (1 - prog) * 0.7

        const root = treeNodes[0]
        const rootMat = root.mesh.material as THREE.MeshPhysicalMaterial
        rootMat.emissiveIntensity = 2.0 * (1 - prog * 0.5)
        rootMat.emissive.set(COL.goldLight)
        const rootGlowMat = root.glowMesh.material as THREE.MeshBasicMaterial
        rootGlowMat.opacity = 0.12 * (1 - prog * 0.5)

        if (phaseTime >= ROOT_FLASH_DUR) {
          phase = PH_GLOW
          phaseTime = 0
          rootFlash.visible = false
          rootFlashMat.opacity = 0
        }
      }

      // ==================== PHASE: GLOW ====================
      else if (phase === PH_GLOW) {
        path.forEach(nIdx => {
          const n = treeNodes[nIdx]
          n.litIntensity *= 0.97
          const nMat = n.mesh.material as THREE.MeshPhysicalMaterial
          nMat.emissiveIntensity = 0.2 + n.litIntensity * 0.7
          nMat.opacity = (n.isLeaf ? 0.7 : 0.85) + n.litIntensity * 0.15
          const nGlowMat = n.glowMesh.material as THREE.MeshBasicMaterial
          nGlowMat.opacity = n.litIntensity * 0.06
        })

        treeEdges.forEach(e => {
          if (e.litIntensity > 0) {
            e.litIntensity *= 0.97
            const eMat = e.line.material as THREE.LineBasicMaterial
            eMat.opacity = 0.15 + e.litIntensity * 0.3
          }
        })

        if (phaseTime >= GLOW_DUR) {
          phase = PH_RESET
          phaseTime = 0
        }
      }

      // ==================== PHASE: RESET ====================
      else if (phase === PH_RESET) {
        treeNodes.forEach(n => {
          n.litIntensity *= 0.9
          const nMat = n.mesh.material as THREE.MeshPhysicalMaterial
          nMat.emissiveIntensity = (n.isRoot ? 0.4 : 0.2) + n.litIntensity * 0.3
          nMat.emissive.set(n.baseColor)
          nMat.opacity = n.isLeaf ? 0.7 : 0.85
          const nGlowMat = n.glowMesh.material as THREE.MeshBasicMaterial
          nGlowMat.opacity = 0
          nGlowMat.color.set(n.baseColor)
        })

        treeEdges.forEach(e => {
          e.litIntensity = 0
          const eMat = e.line.material as THREE.LineBasicMaterial
          eMat.opacity = 0.15
          eMat.color.set(COL.primary)
        })

        if (phaseTime >= RESET_DUR) {
          phase = PH_IDLE
          phaseTime = 0
          pickRandomLeaf()
          path = buildPath(targetLeafIdx)
        }
      }

      // ==================== ALWAYS-ON ====================
      treeNodes.forEach((n, i) => {
        if (!n.lit) {
          const nMat = n.mesh.material as THREE.MeshPhysicalMaterial
          const pulse = Math.sin(time * 1.5 + i * 0.4) * 0.02
          nMat.emissiveIntensity = Math.max(0, nMat.emissiveIntensity + pulse * 0.1)
        }
        if (n.isRoot) {
          n.mesh.rotation.y = time * 0.3
          n.mesh.rotation.x = time * 0.2
        }
      })

      // Wave rings
      waveRings.forEach(w => {
        if (!w.active) return
        w.scale += 0.08
        w.opacity *= 0.92
        w.mesh.scale.setScalar(w.scale)
        const wMat = w.mesh.material as THREE.MeshBasicMaterial
        wMat.opacity = w.opacity
        if (w.opacity < 0.005) {
          w.active = false
          wMat.opacity = 0
        }
      })

      // Subtle tree sway
      treeGroup.rotation.y = Math.sin(time * 0.2) * 0.02

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup function
    cleanupRef.current = () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 bottom-32"
      style={{ background: 'transparent' }}
    />
  )
}
