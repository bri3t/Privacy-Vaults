import { useState, useCallback } from 'react'
import { useSignTypedData } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters, type Hex, toHex, getAddress } from 'viem'
import { decodeNote } from '../zk/note.ts'
import { computeCollateralNullifierHash } from '../zk/proof.ts'
import { RECEIVE_WITH_AUTHORIZATION_TYPES } from '../contracts/abis.ts'
import type { NetworkConfig } from '../contracts/addresses.ts'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3007'

export type RepayStep =
  | 'idle'
  | 'fetching-debt'
  | 'signing'
  | 'submitting'
  | 'done'
  | 'error'

interface RepayState {
  step: RepayStep
  txHash: string | null
  error: string | null
}

export function useRepay(vaultAddress: string, networkConfig: NetworkConfig) {
  const [state, setState] = useState<RepayState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const { signTypedDataAsync } = useSignTypedData()

  const repay = useCallback(
    async (noteHex: string, fromAddress: string) => {
      try {
        // Step 1: Compute collateralNullifierHash and fetch current debt
        setState({ step: 'fetching-debt', txHash: null, error: null })
        const { nullifier } = decodeNote(noteHex)
        const collateralNullifierHash = await computeCollateralNullifierHash(nullifier)

        const loanRes = await fetch(
          `${RELAYER_URL}/api/vault/loan?vaultAddress=${encodeURIComponent(vaultAddress)}&collateralNullifierHash=${encodeURIComponent(collateralNullifierHash)}`,
        )
        if (!loanRes.ok) {
          throw new Error('Failed to fetch loan info')
        }
        const { debt, repaymentAmount, loan } = await loanRes.json()
        if (!loan) {
          throw new Error('No active loan found for this note')
        }

        const debtAmount = BigInt(repaymentAmount ?? debt)

        // Step 2: Sign EIP-3009 ReceiveWithAuthorization for the debt amount
        setState((s) => ({ ...s, step: 'signing' }))
        const from = getAddress(fromAddress as `0x${string}`)
        const to = getAddress(vaultAddress as `0x${string}`)
        const nowSeconds = Math.floor(Date.now() / 1000)
        const validAfter = 0n
        const validBefore = BigInt(nowSeconds + 3600)
        const nonceBytes = new Uint8Array(32)
        crypto.getRandomValues(nonceBytes)
        const nonce = toHex(nonceBytes)

        const signature: Hex = await signTypedDataAsync({
          domain: networkConfig.usdcDomain,
          types: RECEIVE_WITH_AUTHORIZATION_TYPES,
          primaryType: 'ReceiveWithAuthorization',
          message: {
            from,
            to,
            value: debtAmount,
            validAfter,
            validBefore,
            nonce,
          },
        })

        // Parse signature -> v, r, s
        const r = `0x${signature.slice(2, 66)}` as Hex
        const s = `0x${signature.slice(66, 130)}` as Hex
        const vRaw = parseInt(signature.slice(130, 132), 16)
        const v = vRaw < 27 ? vRaw + 27 : vRaw

        const encodedAuth = encodeAbiParameters(
          parseAbiParameters(
            'address, address, uint256, uint256, uint256, bytes32, uint8, bytes32, bytes32',
          ),
          [from, to, debtAmount, validAfter, validBefore, nonce, v, r, s],
        )

        // Step 3: Submit repay via relayer
        setState((s) => ({ ...s, step: 'submitting' }))
        const res = await fetch(`${RELAYER_URL}/api/vault/repay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collateralNullifierHash,
            encodedAuth,
            vaultAddress,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Relay failed' }))
          throw new Error(err.error || err.details || 'Repay relay request failed')
        }

        const { transactionHash } = await res.json()
        setState({ step: 'done', txHash: transactionHash, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState((s) => ({ ...s, step: 'error', error: message }))
      }
    },
    [vaultAddress, networkConfig, signTypedDataAsync],
  )

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, repay, reset }
}
