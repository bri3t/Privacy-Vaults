import { useState, useCallback } from 'react'
import { useSignTypedData } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters, type Hex, toHex, getAddress } from 'viem'
import { generateCommitment } from '../zk/commitment.ts'
import { encodeNote } from '../zk/note.ts'
import {
  RECEIVE_WITH_AUTHORIZATION_TYPES,
  USDC_DOMAIN,
} from '../contracts/abis.ts'
import { VAULT_ADDRESS, DENOMINATION } from '../contracts/addresses.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

export type DepositStep =
  | 'idle'
  | 'generating'
  | 'signing'
  | 'submitting'
  | 'done'
  | 'error'

interface DepositState {
  step: DepositStep
  note: string | null
  txHash: string | null
  error: string | null
}

interface useDepositProps {
  address?: `0x${string}`,
  isConnected?: boolean
}

export function useDeposit({ address, isConnected }: useDepositProps) {
  const [state, setState] = useState<DepositState>({
    step: 'idle',
    note: null,
    txHash: null,
    error: null,
  })

  const { signTypedDataAsync } = useSignTypedData()

  const deposit = useCallback(async () => {
    if (!isConnected) {
      setState((s) => ({ ...s, step: 'error', error: 'No wallet connected' }))
      return
    }

    try {
      // Step 1: Generate commitment
      setState({ step: 'generating', note: null, txHash: null, error: null })
      const commitment = await generateCommitment()

      // Step 2: Sign EIP-3009 ReceiveWithAuthorization (off-chain, gasless)
      setState((s) => ({ ...s, step: 'signing' }))
      const from = address as `0x${string}`
      const to = VAULT_ADDRESS
      const nowSeconds = Math.floor(Date.now() / 1000)
      const validAfter = 0n
      const validBefore = BigInt(nowSeconds + 3600)
      const nonceBytes = new Uint8Array(32)
      crypto.getRandomValues(nonceBytes)
      const nonce = toHex(nonceBytes)

      const signature: Hex = await signTypedDataAsync({
        domain: USDC_DOMAIN,
        types: RECEIVE_WITH_AUTHORIZATION_TYPES,
        primaryType: 'ReceiveWithAuthorization',
        message: {
          from: getAddress(from),
          to: getAddress(to),
          value: DENOMINATION,
          validAfter,
          validBefore,
          nonce,
        },
      })

      // Parse signature → v, r, s
      const r = `0x${signature.slice(2, 66)}` as Hex
      const s = `0x${signature.slice(66, 130)}` as Hex
      const vRaw = parseInt(signature.slice(130, 132), 16)
      const v = vRaw < 27 ? vRaw + 27 : vRaw

      // ABI-encode the authorization (9 params)
      const encodedAuth = encodeAbiParameters(
        parseAbiParameters(
          'address, address, uint256, uint256, uint256, bytes32, uint8, bytes32, bytes32',
        ),
        [
          getAddress(from),
          getAddress(to),
          DENOMINATION,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        ],
      )

      // Step 3: Submit via backend relayer (relayer pays gas)
      setState((s) => ({ ...s, step: 'submitting' }))
      const res = await fetch(`${RELAYER_URL}/api/vault/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitment: commitment.commitmentHex,
          encodedAuth,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Relayer request failed')
      }

      // Step 4: Done
      const note = encodeNote(commitment.commitment, commitment.nullifier, commitment.secret)
      setState({ step: 'done', note, txHash: data.transactionHash, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState((s) => ({ ...s, step: 'error', error: message }))
    }
  }, [signTypedDataAsync, isConnected, address])

  const reset = useCallback(() => {
    setState({ step: 'idle', note: null, txHash: null, error: null })
  }, [])

  return { ...state, deposit, reset }
}
