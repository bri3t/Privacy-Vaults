import type { Address, PublicClient } from 'viem'
import { findLeafIndex, getMerkleProof } from './merkleTree'
import { createCommitment, createNullifierHash } from './notes'
import { generateProof, type FormattedProof } from './prover'

export type WithdrawStep =
  | 'parsing'
  | 'building-tree'
  | 'generating-proof'
  | 'submitting'
  | 'done'

export interface WithdrawResult {
  transactionHash: string
}

export interface ParsedNote {
  note: bigint
  nullifier: bigint
  commitment: string
}

/**
 * Parse a JSON note string into its components.
 * Expected format: { "note": "0x...", "nullifier": "0x...", "commitment": "0x..." }
 */
export function parseNote(noteString: string): ParsedNote {
  const parsed = JSON.parse(noteString)
  if (!parsed.note || !parsed.nullifier || !parsed.commitment) {
    throw new Error(
      'Invalid note format. Expected JSON with note, nullifier, and commitment fields.',
    )
  }
  return {
    note: BigInt(parsed.note),
    nullifier: BigInt(parsed.nullifier),
    commitment: parsed.commitment,
  }
}

/**
 * Full withdrawal orchestration:
 * 1. Parse the note
 * 2. Compute commitment, find it on-chain
 * 3. Build Merkle proof
 * 4. Generate ZK proof
 * 5. Submit to relayer
 */
export async function withdraw(
  noteString: string,
  recipient: Address,
  publicClient: PublicClient,
  vaultAddress: Address,
  relayerEndpoint: string,
  onStep?: (step: WithdrawStep) => void,
): Promise<WithdrawResult> {
  // 1. Parse the note
  onStep?.('parsing')
  const { note, nullifier, commitment } = parseNote(noteString)

  // Verify commitment matches
  const computedCommitment = await createCommitment(note, nullifier)
  const expectedCommitmentHex = `0x${computedCommitment.toString(16).padStart(64, '0')}`
  if (expectedCommitmentHex.toLowerCase() !== commitment.toLowerCase()) {
    throw new Error(
      'Commitment mismatch: the note data does not produce the expected commitment. ' +
        'This note may have been created with an incompatible hash function.',
    )
  }

  // 2. Find leaf index and build Merkle proof
  onStep?.('building-tree')
  const leafIndex = await findLeafIndex(
    publicClient,
    vaultAddress,
    computedCommitment,
  )
  const merkleProof = await getMerkleProof(publicClient, vaultAddress, leafIndex)

  // 3. Compute nullifier hash
  const nullifierHash = await createNullifierHash(nullifier)

  // 4. Generate ZK proof
  onStep?.('generating-proof')
  const proof: FormattedProof = await generateProof({
    root: merkleProof.root,
    nullifierHash,
    recipient: BigInt(recipient),
    relayer: 0n,
    fee: 0n,
    refund: 0n,
    nullifier,
    secret: note,
    pathElements: merkleProof.pathElements,
    pathIndices: merkleProof.pathIndices,
  })

  // 5. Submit to relayer
  onStep?.('submitting')
  const rootHex = `0x${merkleProof.root.toString(16).padStart(64, '0')}`
  const nullifierHashHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

  const response = await fetch(relayerEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pA: proof.pA,
      pB: proof.pB,
      pC: proof.pC,
      root: rootHex,
      nullifierHash: nullifierHashHex,
      recipient,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Withdrawal relay failed: ${errorText}`)
  }

  const result = (await response.json()) as {
    success?: boolean
    transactionHash?: string
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Withdrawal failed: unknown error')
  }

  onStep?.('done')

  return { transactionHash: result.transactionHash! }
}
