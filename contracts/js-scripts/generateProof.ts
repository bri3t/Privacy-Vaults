import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
// import { merkleTree } from "./utils/merkleTree.js";
import { merkleTree } from "./merkleTree.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";

// @ts-ignore
import path from 'path';
import fs from 'fs';

const circuit = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../circuits/target/circuits.json'), 'utf8'));

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(32);
  const offset = 32 - h.length / 2;
  for (let i = 0; i < h.length; i += 2) {
    bytes[offset + i / 2] = parseInt(h.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function generateProof() {
  // Initialize Barretenberg
  const bb = await Barretenberg.new();

  // Get the commitment leaves, nullifier and secret from process args
  const inputs = process.argv.slice(2);

  // 1. Get nullifier and secret
  const nullifier = hexToBytes(inputs[0]);
  const secret = hexToBytes(inputs[1]);

  // 2. Create the nullifier hash
  const { hash: nullifierHash } = await bb.poseidon2Hash({ inputs: [nullifier] });

  // 3. Create merkle tree, insert leaves and get merkle proof for commitment
  const leaves = inputs.slice(3);

  const tree = await merkleTree(leaves);
  // Create the commitment
  const { hash: commitment } = await bb.poseidon2Hash({ inputs: [nullifier, secret] });
  const merkleProof = tree.proof(tree.getIndex(bytesToHex(commitment)));

  try {
    const noir = new Noir(circuit);
    const honk = new UltraHonkBackend(circuit.bytecode, bb);
    const input = {
      // Public inputs
      root: merkleProof.root,
      nullifier_hash: bytesToHex(nullifierHash),
      recipient: inputs[2],

      // Private inputs
      nullifier: bytesToHex(nullifier),
      secret: bytesToHex(secret),
      merkle_proof: merkleProof.pathElements.map((i: string) => i.toString()), // Convert to string
      is_even: merkleProof.pathIndices.map((i: number) => i % 2 == 0), // if the proof indicie is even, set to false as the hash will be odd
    };
    const { witness } = await noir.execute(input);

    const originalLog = console.log; // Save original
    // Override to silence all logs
    console.log = () => {};

    const { proof, publicInputs } = await honk.generateProof(witness, { verifierTarget: 'evm' });
    // Restore original console.log
    console.log = originalLog;

    const result = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes32[]"],
        [proof, publicInputs]
      );
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

(async () => {
    generateProof()
    .then((result) => {
      process.stdout.write(result);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
})();
