// @ts-expect-error -- circomlibjs has no type declarations
import { buildMimcSponge } from 'circomlibjs'
import { type Address, type PublicClient, parseAbiItem } from 'viem'

const LEVELS = 20
const ZERO_VALUE = BigInt(
  '0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c',
)

const LEAF_INSERTED_EVENT = parseAbiItem(
  'event LeafInserted(uint32 indexed index, bytes32 indexed leaf, bytes32 newRoot)',
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
 */
async function mimcHash(left: bigint, right: bigint): Promise<bigint> {
  const mimc = await getMimc()
  const result = mimc.multiHash([left, right])
  return mimc.F.toObject(result) as bigint
}

/**
 * Precompute the zero values for each level of the tree (matching the contract's zeros() function).
 * zeros[i] = hash of a completely empty subtree of height i.
 */
let cachedZeros: bigint[] | null = null

async function getZeros(): Promise<bigint[]> {
  if (!cachedZeros) {
    const zeros: bigint[] = [ZERO_VALUE]
    for (let i = 1; i <= LEVELS; i++) {
      zeros[i] = await mimcHash(zeros[i - 1], zeros[i - 1])
    }
    cachedZeros = zeros
  }
  return cachedZeros
}

/**
 * Fetch logs in chunks to stay within public RPC block-range limits.
 */
async function fetchLogsInChunks(
  publicClient: PublicClient,
  vaultAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
  args?: { leaf?: `0x${string}` },
) {
  const CHUNK = 10_000n

  const firstEnd = fromBlock + CHUNK - 1n > toBlock ? toBlock : fromBlock + CHUNK - 1n
  const allLogs = await publicClient.getLogs({
    address: vaultAddress,
    event: LEAF_INSERTED_EVENT,
    args,
    fromBlock,
    toBlock: firstEnd,
  })

  let start = firstEnd + 1n
  while (start <= toBlock) {
    const end = start + CHUNK - 1n > toBlock ? toBlock : start + CHUNK - 1n
    const logs = await publicClient.getLogs({
      address: vaultAddress,
      event: LEAF_INSERTED_EVENT,
      args,
      fromBlock: start,
      toBlock: end,
    })
    allLogs.push(...logs)
    start = end + 1n
  }

  return allLogs
}

export interface MerkleProof {
  root: bigint
  pathElements: bigint[]
  pathIndices: number[]
}

/**
 * Sparse Merkle tree: only stores nodes that differ from the "all-zeros" default.
 * For N deposits we compute ~N * 20 hashes instead of 2^20 ≈ 1M hashes.
 *
 * Each level is a Map<index, value>. A missing key means the node equals zeros[level].
 */
export async function getMerkleProof(
  publicClient: PublicClient,
  vaultAddress: Address,
  leafIndex: number,
  deployBlock: bigint,
): Promise<MerkleProof> {
  const zeros = await getZeros()
  const latestBlock = await publicClient.getBlockNumber()

  const logs = await fetchLogsInChunks(
    publicClient,
    vaultAddress,
    deployBlock,
    latestBlock,
  )

  const sortedLogs = [...logs].sort((a, b) => {
    const idxA = Number(a.args.index ?? 0)
    const idxB = Number(b.args.index ?? 0)
    return idxA - idxB
  })

  const numLeaves = sortedLogs.length
  if (leafIndex >= numLeaves) {
    throw new Error(
      `Leaf index ${leafIndex} out of range (${numLeaves} leaves)`,
    )
  }

  // Build sparse layers: layer[level] = Map<nodeIndex, value>
  const layers: Map<number, bigint>[] = []

  // Layer 0: only store actual deposits (everything else is zeros[0])
  const layer0 = new Map<number, bigint>()
  for (const log of sortedLogs) {
    const idx = Number(log.args.index)
    layer0.set(idx, BigInt(log.args.leaf as `0x${string}`))
  }
  layers.push(layer0)

  // Collect which parent indices need computing at each level.
  // Start from all deposited leaf indices, propagate upward.
  let dirtyIndices = new Set<number>()
  for (const log of sortedLogs) {
    dirtyIndices.add(Math.floor(Number(log.args.index) / 2))
  }

  for (let level = 1; level <= LEVELS; level++) {
    const layerMap = new Map<number, bigint>()
    const prevLayer = layers[level - 1]

    for (const parentIdx of dirtyIndices) {
      const leftIdx = parentIdx * 2
      const rightIdx = parentIdx * 2 + 1
      const left = prevLayer.get(leftIdx) ?? zeros[level - 1]
      const right = prevLayer.get(rightIdx) ?? zeros[level - 1]
      layerMap.set(parentIdx, await mimcHash(left, right))
    }

    layers.push(layerMap)

    // Propagate: parent indices for next level
    const nextDirty = new Set<number>()
    for (const idx of dirtyIndices) {
      nextDirty.add(Math.floor(idx / 2))
    }
    dirtyIndices = nextDirty
  }

  // Extract the proof path
  const pathElements: bigint[] = []
  const pathIndices: number[] = []
  let idx = leafIndex

  for (let level = 0; level < LEVELS; level++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1
    pathElements.push(layers[level].get(siblingIdx) ?? zeros[level])
    pathIndices.push(idx % 2)
    idx = Math.floor(idx / 2)
  }

  const root = layers[LEVELS].get(0) ?? zeros[LEVELS]

  return { root, pathElements, pathIndices }
}

/**
 * Find the leaf index for a given commitment in the on-chain events.
 */
export async function findLeafIndex(
  publicClient: PublicClient,
  vaultAddress: Address,
  commitment: bigint,
  deployBlock: bigint,
): Promise<number> {
  const commitmentHex = `0x${commitment.toString(16).padStart(64, '0')}` as `0x${string}`

  const latestBlock = await publicClient.getBlockNumber()

  const logs = await fetchLogsInChunks(
    publicClient,
    vaultAddress,
    deployBlock,
    latestBlock,
    { leaf: commitmentHex },
  )

  if (logs.length === 0) {
    throw new Error(
      'Commitment not found on-chain. Was this deposit made with a Pedersen commitment?',
    )
  }

  return Number(logs[0].args.index)
}
