// frontend/src/zk/test-commitment.ts
import { generateCommitment } from './commitment.ts'

async function main() {
  try {
    const commitment = await generateCommitment()
    console.log('Inner commitment generated (contract wraps with yield index on-chain):')
    console.log('  Commitment:', commitment.commitmentHex)
    console.log('  Nullifier:', Array.from(commitment.nullifier).join(','))
    console.log('  Secret:', Array.from(commitment.secret).join(','))
  } catch (error) {
    console.error('Error:', error)
  }
}

main()