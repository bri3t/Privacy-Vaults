import { useState, useCallback } from 'react'
import { useWriteContract, usePublicClient } from 'wagmi'
import type { Hex, Address, Log } from 'viem'
import { decodeNote } from '../zk/note.ts'
import { bytesToHex } from '../zk/utils.ts'
import { buildMerkleTree } from '../zk/merkleTree.ts'
import { generateWithdrawProof, computeNullifierHash } from '../zk/proof.ts'
import { vaultAbi } from '../contracts/abis.ts'
import { VAULT_ADDRESS, DEPLOY_BLOCK } from '../contracts/addresses.ts'

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

  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const withdraw = useCallback(
    async (noteHex: string, recipient: string) => {
      if (!publicClient) {
        setState((s) => ({
          ...s,
          step: 'error',
          error: 'No public client',
        }))
        return
      }

      try {
        // Step 1: Decode note
        const { nullifier, secret, commitment } = decodeNote(noteHex)
        const commitmentHex = bytesToHex(commitment)

        // Step 2: Fetch DepositWithAuthorization events
        setState({ step: 'fetching-events', txHash: null, error: null })
        const currentBlock = await publicClient.getBlockNumber()
        const allLogs: Log[] = []
        const chunkSize = 10_000n

        for (
          let from = DEPLOY_BLOCK;
          from <= currentBlock;
          from += chunkSize
        ) {
          const to =
            from + chunkSize - 1n > currentBlock
              ? currentBlock
              : from + chunkSize - 1n
          const logs = await publicClient.getLogs({
            address: VAULT_ADDRESS,
            event: {
              type: 'event',
              name: 'DepositWithAuthorization',
              inputs: [
                { name: 'commitment', type: 'bytes32', indexed: true },
                { name: 'leafIndex', type: 'uint32', indexed: false },
                { name: 'timestamp', type: 'uint256', indexed: false },
              ],
            },
            fromBlock: from,
            toBlock: to,
          })
          allLogs.push(...logs)
        }

        // Sort by leafIndex to ensure correct ordering
        type DepositLog = Log & {
          args: { commitment: Hex; leafIndex: number; timestamp: bigint }
        }
        const sortedLogs = (allLogs as DepositLog[]).sort(
          (a, b) => a.args.leafIndex - b.args.leafIndex,
        )
        const leaves = sortedLogs.map((log) => log.args.commitment as string)

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
          merkleProof.pathElements,
          merkleProof.pathIndices,
        )

        // Step 5: Submit transaction
        setState((s) => ({ ...s, step: 'submitting' }))
        const proofHex = ('0x' +
          Array.from(proof)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')) as Hex

        const txHash = await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: vaultAbi,
          functionName: 'withdraw',
          args: [
            proofHex,
            root as Hex,
            nullifierHash as Hex,
            recipient as Address,
          ],
        })

        setState({ step: 'done', txHash, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState((s) => ({ ...s, step: 'error', error: message }))
      }
    },
    [publicClient, writeContractAsync],
  )

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, withdraw, reset }
}
