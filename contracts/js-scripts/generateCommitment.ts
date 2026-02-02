import { Barretenberg } from "@aztec/bb.js";
import { ethers } from "ethers";
import { randomBytes } from "crypto";

// Generate a random 32-byte value within the BN254 field
function randomFieldElement(): Uint8Array {
  const bytes = randomBytes(32);
  bytes[0] &= 0x1f; // Clear top 3 bits to ensure value < 2^253 < field modulus
  return bytes;
}

// generateCommitment
export default async function generateCommitment(): Promise<string> {
  // Initialize Barretenberg
  const bb = await Barretenberg.new();

  // 1. generate nullifier
  const nullifier = randomFieldElement();

  // 2. generate secret
  const secret = randomFieldElement();

  // 3. create commitment
  const { hash: commitment } = await bb.poseidon2Hash({ inputs: [nullifier, secret] });

  const result = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "bytes32", "bytes32"],
    [commitment, nullifier, secret]
  );

  return result;
}

(async () => {
  generateCommitment()
  .then((result) => {
    process.stdout.write(result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
})();
