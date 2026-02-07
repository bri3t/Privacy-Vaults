import { bytesToHex, hexToBytes } from './utils.ts'

export interface Note {
  commitment: Uint8Array
  nullifier: Uint8Array
  secret: Uint8Array
  yieldIndex: Uint8Array
}

export interface NotePrefix {
  currency: string
  amount: number
  network: string
}

/** Encode note as: privacyvaults-{currency}-{amount}-{network}-{hexData} */
export function encodeNote(
  commitment: Uint8Array,
  nullifier: Uint8Array,
  secret: Uint8Array,
  yieldIndex: Uint8Array,
  currency: string,
  amount: number,
  network: string,
): string {
  const commitmentHex = bytesToHex(commitment).slice(2)
  const nullifierHex = bytesToHex(nullifier).slice(2)
  const secretHex = bytesToHex(secret).slice(2)
  const yieldIndexHex = bytesToHex(yieldIndex).slice(2)
  const hexData = commitmentHex + nullifierHex + secretHex + yieldIndexHex
  return `privacyvaults-${currency}-${amount}-${network}-${hexData}`
}

/** Parse prefix metadata from a note string. Returns null for legacy (0x) format. */
export function parseNotePrefix(note: string): NotePrefix | null {
  const cleaned = note.replace(/[^\x20-\x7E]/g, '').trim()
  if (cleaned.startsWith('0x')) return null
  if (!cleaned.startsWith('privacyvaults-')) return null
  const parts = cleaned.split('-')
  // privacyvaults-currency-amount-network_part-hex...
  // The network can contain underscores (e.g. base_sepolia) but not dashes,
  // so parts[1]=currency, parts[2]=amount, parts[3]=network, parts[4+]=hex
  if (parts.length < 5) return null
  return {
    currency: parts[1],
    amount: Number(parts[2]),
    network: parts[3],
  }
}

/** Strip all non-printable / invisible characters (BOM, zero-width, control chars, etc.) */
function sanitizeNote(raw: string): string {
  return raw.replace(/[^\x20-\x7E]/g, '').trim()
}

/** Extract raw hex data (256 chars) from a note string (supports both formats). */
function extractHexData(note: string): string {
  const cleaned = sanitizeNote(note)
  if (cleaned.startsWith('0x')) {
    return cleaned.slice(2)
  }
  // New format: everything after the 4th dash is hex data
  const idx = nthIndexOf(cleaned, '-', 4)
  if (idx === -1) throw new Error('Invalid note format')
  return cleaned.slice(idx + 1)
}

function nthIndexOf(str: string, char: string, n: number): number {
  let count = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) {
      count++
      if (count === n) return i
    }
  }
  return -1
}

/** Decode note → { commitment, nullifier, secret, yieldIndex }. Supports both legacy (0x...) and new (privacyvaults-...) formats. */
export function decodeNote(note: string): Note {
  const h = extractHexData(note)
  if (h.length !== 256) {
    throw new Error(`Invalid note length: expected 256 hex chars, got ${h.length}`)
  }
  return {
    commitment: hexToBytes('0x' + h.slice(0, 64)),
    nullifier: hexToBytes('0x' + h.slice(64, 128)),
    secret: hexToBytes('0x' + h.slice(128, 192)),
    yieldIndex: hexToBytes('0x' + h.slice(192, 256)),
  }
}
