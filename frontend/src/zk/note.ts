import { bytesToHex, hexToBytes } from './utils.ts'

export interface Note {
  commitment: Uint8Array
  nullifier: Uint8Array
  secret: Uint8Array
}

/** Encode note as 96-byte hex: 0x + commitment(64) + nullifier(64) + secret(64) */
export function encodeNote(
  commitment: Uint8Array,
  nullifier: Uint8Array,
  secret: Uint8Array,
): string {
  const commitmentHex = bytesToHex(commitment).slice(2)
  const nullifierHex = bytesToHex(nullifier).slice(2)
  const secretHex = bytesToHex(secret).slice(2)
  return '0x' + commitmentHex + nullifierHex + secretHex
}

/** Decode 96-byte hex note → { commitment, nullifier, secret } */
export function decodeNote(hex: string): Note {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  if (h.length !== 192) {
    throw new Error(`Invalid note length: expected 192 hex chars, got ${h.length}`)
  }
  return {
    commitment: hexToBytes('0x' + h.slice(0, 64)),
    nullifier: hexToBytes('0x' + h.slice(64, 128)),
    secret: hexToBytes('0x' + h.slice(128, 192)),
  }
}
