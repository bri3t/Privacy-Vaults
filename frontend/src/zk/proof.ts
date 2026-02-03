import { Noir } from '@noir-lang/noir_js'
import { UltraHonkBackend } from '@aztec/bb.js'
import { getBarretenberg } from './barretenberg.ts'
import { bytesToHex } from './utils.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let circuitCache: any = null

async function loadCircuit() {
  if (circuitCache) return circuitCache
  const res = await fetch('/circuits.json')
  circuitCache = await res.json()
  return circuitCache
}

export interface WithdrawProofResult {
  proof: Uint8Array
  root: string
  nullifierHash: string
}

export async function generateWithdrawProof(
  root: string,
  nullifier: Uint8Array,
  secret: Uint8Array,
  nullifierHash: string,
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

  return { proof, root, nullifierHash }
}

export async function computeNullifierHash(
  nullifier: Uint8Array,
): Promise<string> {
  const bb = await getBarretenberg()
  const { hash } = await bb.poseidon2Hash({ inputs: [nullifier] })
  return bytesToHex(hash)
}
