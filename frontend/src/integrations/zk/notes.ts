// @ts-expect-error -- circomlibjs has no type declarations
import { buildPedersenHash, buildBabyjub } from 'circomlibjs'

// BN254 scalar field prime - commitments must be less than this value
const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
)

// Lazy-loaded circomlibjs instances (they boot a WASM module)
let pedersenHash: Awaited<ReturnType<typeof buildPedersenHash>> | null = null
let babyJub: Awaited<ReturnType<typeof buildBabyjub>> | null = null

async function getPedersen() {
  if (!pedersenHash || !babyJub) {
    pedersenHash = await buildPedersenHash()
    babyJub = await buildBabyjub()
  }
  return { pedersenHash, babyJub }
}

/**
 * Convert a bigint to a little-endian buffer of `byteLen` bytes
 */
function toBufferLE(value: bigint, byteLen: number): Uint8Array {
  const buf = new Uint8Array(byteLen)
  let v = value
  for (let i = 0; i < byteLen; i++) {
    buf[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return buf
}

/**
 * Pedersen hash over raw bytes, returning the x-coordinate on BabyJub (field element).
 * This matches circomlib's Pedersen(N) template output[0].
 */
async function pedersenHashBytes(data: Uint8Array): Promise<bigint> {
  const { pedersenHash: pedersen, babyJub: bj } = await getPedersen()
  const point = pedersen.hash(data)
  const unpackedPoint = bj.unpackPoint(point)
  // The circuit outputs the x-coordinate (index 0)
  return bj.F.toObject(unpackedPoint[0]) as bigint
}

/**
 * Generates a random note (secret)
 * A note is 248 bits of randomness used to create commitments
 */
export function generateNote(): bigint {
  const randomBytes = new Uint8Array(31) // 248 bits = 31 bytes
  crypto.getRandomValues(randomBytes)
  return BigInt(
    `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`,
  )
}

/**
 * Generates a random nullifier (to prevent double-spends)
 * A nullifier is 248 bits of randomness
 */
export function generateNullifier(): bigint {
  const randomBytes = new Uint8Array(31) // 248 bits
  crypto.getRandomValues(randomBytes)
  return BigInt(
    `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`,
  )
}

/**
 * Creates a commitment hash using Pedersen(496) from circomlibjs.
 * The input is 496 bits: nullifier (248 bits LE) || secret (248 bits LE).
 * This matches the CommitmentHasher template in withdraw.circom.
 */
export async function createCommitment(
  secret: bigint,
  nullifier: bigint,
): Promise<bigint> {
  const nullifierBuf = toBufferLE(nullifier, 31) // 248 bits = 31 bytes
  const secretBuf = toBufferLE(secret, 31)
  const preimage = new Uint8Array(62) // 496 bits = 62 bytes
  preimage.set(nullifierBuf, 0)
  preimage.set(secretBuf, 31)
  return pedersenHashBytes(preimage)
}

/**
 * Creates a nullifier hash using Pedersen(248) from circomlibjs.
 * This matches the nullifierHasher in withdraw.circom.
 */
export async function createNullifierHash(
  nullifier: bigint,
): Promise<bigint> {
  const nullifierBuf = toBufferLE(nullifier, 31) // 248 bits = 31 bytes
  return pedersenHashBytes(nullifierBuf)
}

/**
 * Represents a note object with secret data for later withdrawal
 */
export interface VaultNote {
  note: bigint
  nullifier: bigint
  commitment: string // bytes32 hex string
}

/**
 * Generates a complete note ready for vault deposit
 */
export async function generateVaultNote(): Promise<VaultNote> {
  const note = generateNote()
  const nullifier = generateNullifier()
  const commitmentBigInt = await createCommitment(note, nullifier)
  // Pad to 32 bytes hex
  const commitment = `0x${commitmentBigInt.toString(16).padStart(64, '0')}`

  return {
    note,
    nullifier,
    commitment,
  }
}

/**
 * Stores a vault note in local storage (encrypted by browser)
 * WARNING: This is not production-secure. In production, use:
 * - Encrypted storage with user-provided passphrase
 * - Hardware wallet support
 * - Recovery phrases
 */
export function saveVaultNoteLocally(note: VaultNote, depositId: string): void {
  const notes = getAllVaultNotesLocally()
  notes.push({
    ...note,
    depositId,
    timestamp: Date.now(),
  })
  localStorage.setItem('vaultNotes', JSON.stringify(notes))
}

export function getAllVaultNotesLocally(): Array<
  VaultNote & { depositId: string; timestamp: number }
> {
  const stored = localStorage.getItem('vaultNotes')
  return stored ? JSON.parse(stored) : []
}

export function getVaultNoteLocally(
  commitment: string,
): (VaultNote & { depositId: string; timestamp: number }) | null {
  const notes = getAllVaultNotesLocally()
  return notes.find((n) => n.commitment === commitment) || null
}

export function deleteVaultNoteLocally(commitment: string): void {
  const notes = getAllVaultNotesLocally().filter(
    (n) => n.commitment !== commitment,
  )
  localStorage.setItem('vaultNotes', JSON.stringify(notes))
}
