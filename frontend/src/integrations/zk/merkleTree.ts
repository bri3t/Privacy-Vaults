// @ts-expect-error -- circomlibjs has no type declarations
import { buildMimcSponge } from 'circomlibjs'
import { type Address, type PublicClient, parseAbiItem } from 'viem'

const LEVELS = 20
const ZERO_VALUE = BigInt(
  '0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c',
)
const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
)

let mimcSponge: Awaited<ReturnType<typeof buildMimcSponge>> | null = null

async function getMimc() {
  if (!mimcSponge) {
    mimcSponge = await buildMimcSponge()
  }
  return mimcSponge
}

/**
 * MiMCSponge hash of two field elements, matching MerkleTreeWithHistory.sol's hashLeftRight.
 * hashLeftRight does: R = left, C = 0, (R,C) = MiMCSponge(R,C,0), R += right mod p, (R,C) = MiMCSponge(R,C,0), return R
 */
async function mimcHash(left: bigint, right: bigint): Promise<bigint> {
  const mimc = await getMimc()
  const result = mimc.multiHash([left, right])
  return mimc.F.toObject(result) as bigint
}

/**
 * Precompute the zero values for each level of the tree (matching the contract's zeros() function).
 */
async function computeZeros(): Promise<bigint[]> {
  const zeros: bigint[] = [ZERO_VALUE]
  for (let i = 1; i <= LEVELS; i++) {
    zeros[i] = await mimcHash(zeros[i - 1], zeros[i - 1])
  }
  return zeros
}

export interface MerkleProof {
  root: bigint
  pathElements: bigint[]
  pathIndices: number[]
}

/**
 * Fetch all LeafInserted events from the vault contract and reconstruct the Merkle tree.
 * Then compute a proof for the given leaf index.
 */
export async function getMerkleProof(
  publicClient: PublicClient,
  vaultAddress: Address,
  leafIndex: number,
): Promise<MerkleProof> {
  const zeros = await computeZeros()

  // Fetch all LeafInserted events
  const logs = await publicClient.getLogs({
    address: vaultAddress,
    event: parseAbiItem(
      'event LeafInserted(uint32 indexed index, bytes32 indexed leaf, bytes32 newRoot)',
    ),
    fromBlock: 0n,
    toBlock: 'latest',
  })

  // Sort by index
  const sortedLogs = [...logs].sort((a, b) => {
    const idxA = Number(a.args.index ?? 0)
    const idxB = Number(b.args.index ?? 0)
    return idxA - idxB
  })

  // Build layers: layer 0 = leaves
  const numLeaves = sortedLogs.length
  if (leafIndex >= numLeaves) {
    throw new Error(
      `Leaf index ${leafIndex} out of range (${numLeaves} leaves)`,
    )
  }

  // Build the full tree layer by layer
  const capacity = 2 ** LEVELS
  const layers: bigint[][] = []

  // Layer 0: leaves
  const leaves = new Array<bigint>(capacity)
  for (let i = 0; i < capacity; i++) {
    if (i < numLeaves) {
      leaves[i] = BigInt(sortedLogs[i].args.leaf as `0x${string}`)
    } else {
      leaves[i] = zeros[0]
    }
  }
  layers.push(leaves)

  // Build each subsequent layer
  for (let level = 1; level <= LEVELS; level++) {
    const prevLayer = layers[level - 1]
    const layerSize = prevLayer.length / 2
    const layer = new Array<bigint>(layerSize)
    for (let i = 0; i < layerSize; i++) {
      layer[i] = await mimcHash(prevLayer[2 * i], prevLayer[2 * i + 1])
    }
    layers.push(layer)
  }

  // Extract the proof
  const pathElements: bigint[] = []
  const pathIndices: number[] = []
  let idx = leafIndex

  for (let level = 0; level < LEVELS; level++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1
    pathElements.push(layers[level][siblingIdx])
    pathIndices.push(idx % 2)
    idx = Math.floor(idx / 2)
  }

  const root = layers[LEVELS][0]

  return { root, pathElements, pathIndices }
}

/**
 * Find the leaf index for a given commitment in the on-chain events.
 */
export async function findLeafIndex(
  publicClient: PublicClient,
  vaultAddress: Address,
  commitment: bigint,
): Promise<number> {
  const commitmentHex = `0x${commitment.toString(16).padStart(64, '0')}` as `0x${string}`

  const logs = await publicClient.getLogs({
    address: vaultAddress,
    event: parseAbiItem(
      'event LeafInserted(uint32 indexed index, bytes32 indexed leaf, bytes32 newRoot)',
    ),
    args: {
      leaf: commitmentHex,
    },
    fromBlock: 0n,
    toBlock: 'latest',
  })

  if (logs.length === 0) {
    throw new Error(
      'Commitment not found on-chain. Was this deposit made with a Pedersen commitment?',
    )
  }

  return Number(logs[0].args.index)
}
