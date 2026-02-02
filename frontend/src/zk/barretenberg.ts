import { Barretenberg, BackendType } from '@aztec/bb.js'

let instance: Barretenberg | null = null
let pending: Promise<Barretenberg> | null = null

export async function getBarretenberg(): Promise<Barretenberg> {
  if (instance) return instance
  if (pending) return pending
  pending = Barretenberg.new({ threads: 1, backend: BackendType.Wasm }).then((bb) => {
    instance = bb
    pending = null
    return bb
  })
  return pending
}
