import * as snarkjs from 'snarkjs'

const WASM_PATH = '/zk/withdraw.wasm'
const ZKEY_PATH = '/zk/withdraw_final.zkey'

export interface ProofInput {
  root: bigint
  nullifierHash: bigint
  recipient: bigint
  relayer: bigint
  fee: bigint
  refund: bigint
  nullifier: bigint
  secret: bigint
  pathElements: bigint[]
  pathIndices: number[]
}

export interface FormattedProof {
  pA: [string, string]
  pB: [[string, string], [string, string]]
  pC: [string, string]
}

/**
 * Generate a Groth16 proof in-browser using snarkjs.
 * Returns the proof formatted for the contract's withdraw() function.
 */
export async function generateProof(
  input: ProofInput,
): Promise<FormattedProof> {
  // Convert all bigints to strings for snarkjs
  const circuitInput = {
    root: input.root.toString(),
    nullifierHash: input.nullifierHash.toString(),
    recipient: input.recipient.toString(),
    relayer: input.relayer.toString(),
    fee: input.fee.toString(),
    refund: input.refund.toString(),
    nullifier: input.nullifier.toString(),
    secret: input.secret.toString(),
    pathElements: input.pathElements.map((e) => e.toString()),
    pathIndices: input.pathIndices.map((i) => i.toString()),
  }

  const { proof } = await snarkjs.groth16.fullProve(
    circuitInput,
    WASM_PATH,
    ZKEY_PATH,
  )

  // Format proof for the Solidity verifier
  // snarkjs outputs proof.pi_a, proof.pi_b, proof.pi_c
  // pi_a: [x, y, 1] — we only need [x, y]
  // pi_b: [[x1, y1], [x2, y2], [1, 0]] — we only need [[x1, y1], [x2, y2]]
  // pi_c: [x, y, 1] — we only need [x, y]
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [
      [proof.pi_b[0][0], proof.pi_b[0][1]],
      [proof.pi_b[1][0], proof.pi_b[1][1]],
    ],
    pC: [proof.pi_c[0], proof.pi_c[1]],
  }
}
