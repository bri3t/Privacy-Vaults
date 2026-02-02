// frontend/src/zk/test-commitment.ts
import { generateCommitment } from './commitment.ts'

async function main() {
  try {
    const commitment = await generateCommitment()
    console.log('✓ Commitment generado:')
    console.log('  Commitment:', commitment.commitmentHex)
    console.log('  Nullifier:', Array.from(commitment.nullifier).join(','))
    console.log('  Secret:', Array.from(commitment.secret).join(','))
  } catch (error) {
    console.error('✗ Error:', error)
  }
}

main()