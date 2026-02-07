import { useState, useCallback } from 'react'
import { encodeFunctionData, type Hex } from 'viem'
import { decodeNote } from '../zk/note.ts'
import { bytesToHex } from '../zk/utils.ts'
import { buildMerkleTree } from '../zk/merkleTree.ts'
import { generateWithdrawProof, computeNullifierHash, computeCollateralNullifierHash } from '../zk/proof.ts'
import { getBarretenberg } from '../zk/barretenberg.ts'
import { vaultAbi } from '../contracts/abis.ts'
import { useSponsoredTransaction } from './useSponsoredTransaction.ts'
import { sanitizeError } from '../lib/utils.ts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3007'

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

export function useWithdraw(vaultAddress: string) {
  const [state, setState] = useState<WithdrawState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const { sendSponsoredTransaction } = useSponsoredTransaction()

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
          `${BACKEND_URL}/api/vault/commitments?vaultAddress=${encodeURIComponent(vaultAddress)}`,
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

        // Step 4: Generate ZK proof
        setState((s) => ({ ...s, step: 'generating-proof' }))
        const nullifierHash = await computeNullifierHash(nullifier)
        const collateralNullifierHash = await computeCollateralNullifierHash(nullifier)

        const { proof, root } = await generateWithdrawProof(
          merkleProof.root,
          nullifier,
          secret,
          nullifierHash,
          collateralNullifierHash,
          recipient,
          yieldIndexHex,
          merkleProof.pathElements,
          merkleProof.pathIndices,
        )

        // Step 5: Submit via Pimlico-sponsored 7702 transaction
        setState((s) => ({ ...s, step: 'submitting' }))
        const proofHex = ('0x' +
          Array.from(proof)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')) as Hex

        // Convert yield index bytes to decimal string for the contract
        const yieldIndexDecimal = BigInt(yieldIndexHex).toString()

        const callData = encodeFunctionData({
          abi: vaultAbi,
          functionName: 'withdraw',
          args: [
            proofHex,
            root as `0x${string}`,
            nullifierHash as `0x${string}`,
            collateralNullifierHash as `0x${string}`,
            recipient as `0x${string}`,
            BigInt(yieldIndexDecimal),
          ],
        })

        const txHash = await sendSponsoredTransaction([
          { to: vaultAddress as `0x${string}`, data: callData },
        ])

        setState({ step: 'done', txHash, error: null })
      } catch (err) {
        console.error('[useWithdraw] raw error:', err)
        setState((s) => ({ ...s, step: 'error', error: sanitizeError(err) }))
      }
    },
    [vaultAddress, sendSponsoredTransaction],
  )

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, withdraw, reset }
}
