import { getBarretenberg } from './barretenberg.ts'
import { bytesToHex } from './utils.ts'

/** Random 32-byte value within BN254 field (< 2^253) */
function randomFieldElement(): Uint8Array {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  bytes[0] &= 0x1f // Clear top 3 bits
  return bytes
}

export interface Commitment {
  /** inner_commitment = Poseidon2(nullifier, secret) — contract wraps with yield index on-chain */
  commitment: Uint8Array
  nullifier: Uint8Array
  secret: Uint8Array
  commitmentHex: string
}

export async function generateCommitment(): Promise<Commitment> {
  const bb = await getBarretenberg()
  const nullifier = randomFieldElement()
  const secret = randomFieldElement()
  const { hash: commitment } = await bb.poseidon2Hash({
    inputs: [nullifier, secret],
  })
  return {
    commitment,
    nullifier,
    secret,
    commitmentHex: bytesToHex(commitment),
  }
}
