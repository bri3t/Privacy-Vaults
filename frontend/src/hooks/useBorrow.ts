import { useState, useCallback } from 'react'
import type { Hex } from 'viem'
import { decodeNote } from '../zk/note.ts'
import { bytesToHex } from '../zk/utils.ts'
import { buildMerkleTree } from '../zk/merkleTree.ts'
import { generateBorrowProof, computeCollateralNullifierHash } from '../zk/proof.ts'
import { getBarretenberg } from '../zk/barretenberg.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

export type BorrowStep =
  | 'idle'
  | 'fetching-events'
  | 'building-tree'
  | 'generating-proof'
  | 'submitting'
  | 'done'
  | 'error'

interface BorrowState {
  step: BorrowStep
  txHash: string | null
  error: string | null
}

export function useBorrow(vaultAddress: string) {
  const [state, setState] = useState<BorrowState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const borrow = useCallback(
    async (noteHex: string, recipient: string, borrowAmount: string) => {
      try {
        // Step 1: Decode note and compute final commitment
        const { nullifier, secret, commitment, yieldIndex } = decodeNote(noteHex)
        const yieldIndexHex = bytesToHex(yieldIndex)

        const bb = await getBarretenberg()
        const { hash: finalCommitment } = await bb.poseidon2Hash({ inputs: [commitment, yieldIndex] })
        const commitmentHex = bytesToHex(finalCommitment)

        // Step 2: Fetch commitments from backend
        setState({ step: 'fetching-events', txHash: null, error: null })
        const commitmentsRes = await fetch(
          `${RELAYER_URL}/api/vault/commitments?vaultAddress=${encodeURIComponent(vaultAddress)}`,
        )
        if (!commitmentsRes.ok) {
          const err = await commitmentsRes
            .json()
            .catch(() => ({ error: 'Failed to fetch commitments' }))
          throw new Error(err.error || 'Failed to fetch commitments')
        }
        const { commitments: leaves } = (await commitmentsRes.json()) as {
          commitments: string[]
        }

        // Step 3: Build merkle tree
        setState((s) => ({ ...s, step: 'building-tree' }))
        const tree = await buildMerkleTree(leaves)

        const leafIndex = tree.getIndex(commitmentHex)
        if (leafIndex === -1) {
          throw new Error(
            'Commitment not found in the selected vault. Make sure you have selected the same vault denomination used during deposit.',
          )
        }

        const merkleProof = tree.proof(leafIndex)

        // Step 4: Generate borrow ZK proof (only collateralNullifierHash, NOT nullifierHash)
        setState((s) => ({ ...s, step: 'generating-proof' }))
        const collateralNullifierHash = await computeCollateralNullifierHash(nullifier)

        const { proof, root } = await generateBorrowProof(
          merkleProof.root,
          nullifier,
          secret,
          collateralNullifierHash,
          recipient,
          yieldIndexHex,
          merkleProof.pathElements,
          merkleProof.pathIndices,
        )

        // Step 5: Submit borrow transaction via relayer
        setState((s) => ({ ...s, step: 'submitting' }))
        const proofHex = ('0x' +
          Array.from(proof)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')) as Hex

        const yieldIndexDecimal = BigInt(yieldIndexHex).toString()

        const res = await fetch(`${RELAYER_URL}/api/vault/borrow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof: proofHex,
            root: root as Hex,
            collateralNullifierHash: collateralNullifierHash as Hex,
            recipient,
            yieldIndex: yieldIndexDecimal,
            borrowAmount,
            vaultAddress,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Relay failed' }))
          throw new Error(err.error || err.details || 'Borrow relay request failed')
        }

        const { transactionHash } = await res.json()
        setState({ step: 'done', txHash: transactionHash, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState((s) => ({ ...s, step: 'error', error: message }))
      }
    },
    [vaultAddress],
  )

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, borrow, reset }
}
