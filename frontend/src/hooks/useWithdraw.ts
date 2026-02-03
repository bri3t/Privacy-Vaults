import { useState, useCallback } from 'react'
import type { Hex } from 'viem'
import { decodeNote } from '../zk/note.ts'
import { bytesToHex } from '../zk/utils.ts'
import { buildMerkleTree } from '../zk/merkleTree.ts'
import { generateWithdrawProof, computeNullifierHash } from '../zk/proof.ts'
import { getBarretenberg } from '../zk/barretenberg.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

export type WithdrawStep =
  | 'idle'
  | 'fetching-events'
  | 'building-tree'
  | 'generating-proof'
  | 'submitting'
  | 'done'
  | 'error'

interface WithdrawState {
  step: WithdrawStep
  txHash: string | null
  error: string | null
}

export function useWithdraw() {
  const [state, setState] = useState<WithdrawState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const withdraw = useCallback(
    async (noteHex: string, recipient: string) => {
      try {
        // Step 1: Decode note and compute final commitment (inner + yieldIndex)
        const { nullifier, secret, commitment, yieldIndex } = decodeNote(noteHex)
        const yieldIndexHex = bytesToHex(yieldIndex)

        // The tree stores finalCommitment = Poseidon2(innerCommitment, yieldIndex)
        const bb = await getBarretenberg()
        const { hash: finalCommitment } = await bb.poseidon2Hash({ inputs: [commitment, yieldIndex] })
        const commitmentHex = bytesToHex(finalCommitment)

        // Step 2: Fetch commitments from backend
        setState({ step: 'fetching-events', txHash: null, error: null })
        const commitmentsRes = await fetch(
          `${RELAYER_URL}/api/vault/commitments`,
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
            'Commitment not found in on-chain deposits. Is the note correct?',
          )
        }

        const merkleProof = tree.proof(leafIndex)

        // Step 4: Generate ZK proof
        setState((s) => ({ ...s, step: 'generating-proof' }))
        const nullifierHash = await computeNullifierHash(nullifier)

        const { proof, root } = await generateWithdrawProof(
          merkleProof.root,
          nullifier,
          secret,
          nullifierHash,
          recipient,
          yieldIndexHex,
          merkleProof.pathElements,
          merkleProof.pathIndices,
        )

        // Step 5: Submit transaction via relayer
        setState((s) => ({ ...s, step: 'submitting' }))
        const proofHex = ('0x' +
          Array.from(proof)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')) as Hex

        // Convert yield index bytes to decimal string for the contract
        const yieldIndexDecimal = BigInt(yieldIndexHex).toString()

        const res = await fetch(`${RELAYER_URL}/api/vault/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof: proofHex,
            root: root as Hex,
            nullifierHash: nullifierHash as Hex,
            recipient,
            yieldIndex: yieldIndexDecimal,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Relay failed' }))
          throw new Error(err.error || err.details || 'Relay request failed')
        }

        const { transactionHash } = await res.json()
        setState({ step: 'done', txHash: transactionHash, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState((s) => ({ ...s, step: 'error', error: message }))
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, withdraw, reset }
}
