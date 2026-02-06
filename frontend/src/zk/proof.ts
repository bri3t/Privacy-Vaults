import { Noir } from '@noir-lang/noir_js'
import { UltraHonkBackend } from '@aztec/bb.js'
import { getBarretenberg } from './barretenberg.ts'
import { bytesToHex } from './utils.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let circuitCache: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let borrowCircuitCache: any = null

async function loadCircuit() {
  if (circuitCache) return circuitCache
  const res = await fetch('/circuits.json')
  circuitCache = await res.json()
  return circuitCache
}

async function loadBorrowCircuit() {
  if (borrowCircuitCache) return borrowCircuitCache
  const res = await fetch('/borrow_circuits.json')
  borrowCircuitCache = await res.json()
  return borrowCircuitCache
}

export interface WithdrawProofResult {
  proof: Uint8Array
  root: string
  nullifierHash: string
  collateralNullifierHash: string
}

export interface BorrowProofResult {
  proof: Uint8Array
  root: string
  collateralNullifierHash: string
}

export async function generateWithdrawProof(
  root: string,
  nullifier: Uint8Array,
  secret: Uint8Array,
  nullifierHash: string,
  collateralNullifierHash: string,
  recipient: string,
  yieldIndex: string,
  pathElements: string[],
  pathIndices: number[],
): Promise<WithdrawProofResult> {
  const circuit = await loadCircuit()
  const bb = await getBarretenberg()

  const noir = new Noir(circuit)
  const honk = new UltraHonkBackend(circuit.bytecode, bb)

  const input = {
    root,
    nullifier_hash: nullifierHash,
    collateral_nullifier_hash: collateralNullifierHash,
    recipient,
    yield_index: yieldIndex,
    nullifier: bytesToHex(nullifier),
    secret: bytesToHex(secret),
    merkle_proof: pathElements.map((e: string) => e.toString()),
    is_even: pathIndices.map((i: number) => i % 2 === 0),
  }

  const { witness } = await noir.execute(input)
  const { proof } = await honk.generateProof(witness, {
    verifierTarget: 'evm',
  })

  return { proof, root, nullifierHash, collateralNullifierHash }
}

export async function generateBorrowProof(
  root: string,
  nullifier: Uint8Array,
  secret: Uint8Array,
  collateralNullifierHash: string,
  recipient: string,
  yieldIndex: string,
  pathElements: string[],
  pathIndices: number[],
): Promise<BorrowProofResult> {
  const circuit = await loadBorrowCircuit()
  const bb = await getBarretenberg()

  const noir = new Noir(circuit)
  const honk = new UltraHonkBackend(circuit.bytecode, bb)

  const input = {
    root,
    collateral_nullifier_hash: collateralNullifierHash,
    recipient,
    yield_index: yieldIndex,
    nullifier: bytesToHex(nullifier),
    secret: bytesToHex(secret),
    merkle_proof: pathElements.map((e: string) => e.toString()),
    is_even: pathIndices.map((i: number) => i % 2 === 0),
  }

  const { witness } = await noir.execute(input)
  const { proof } = await honk.generateProof(witness, {
    verifierTarget: 'evm',
  })

  return { proof, root, collateralNullifierHash }
}

export async function computeNullifierHash(
  nullifier: Uint8Array,
): Promise<string> {
  const bb = await getBarretenberg()
  const { hash } = await bb.poseidon2Hash({ inputs: [nullifier] })
  return bytesToHex(hash)
}

export async function computeCollateralNullifierHash(
  nullifier: Uint8Array,
): Promise<string> {
  const bb = await getBarretenberg()
  const one = new Uint8Array(32)
  one[31] = 1
  const { hash } = await bb.poseidon2Hash({ inputs: [nullifier, one] })
  return bytesToHex(hash)
}
