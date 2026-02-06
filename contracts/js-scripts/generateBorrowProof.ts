import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
import { merkleTree } from "./merkleTree.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";

// @ts-ignore
import path from 'path';
import fs from 'fs';

const circuit = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../circuits_borrow/target/circuits_borrow.json'), 'utf8'));

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

export default async function generateBorrowProof() {
  const bb = await Barretenberg.new();

  // Args: nullifier, secret, recipient, yieldIndex, ...leaves
  const inputs = process.argv.slice(2);

  const nullifier = hexToBytes(inputs[0]);
  const secret = hexToBytes(inputs[1]);
  // inputs[2] = recipient
  const yieldIndex = hexToBytes(inputs[3]);

  // Compute collateral nullifier hash = Poseidon2(nullifier, 1)
  const one = new Uint8Array(32);
  one[31] = 1;
  const { hash: collateralNullifierHash } = await bb.poseidon2Hash({ inputs: [nullifier, one] });

  // Build merkle tree and get proof
  const leaves = inputs.slice(4);
  const tree = await merkleTree(leaves);

  const { hash: innerCommitment } = await bb.poseidon2Hash({ inputs: [nullifier, secret] });
  const { hash: commitment } = await bb.poseidon2Hash({ inputs: [innerCommitment, yieldIndex] });
  const merkleProof = tree.proof(tree.getIndex(bytesToHex(commitment)));

  try {
    const noir = new Noir(circuit);
    const honk = new UltraHonkBackend(circuit.bytecode, bb);
    const input = {
      // Public inputs (4): root, collateral_nullifier_hash, recipient, yield_index
      root: merkleProof.root,
      collateral_nullifier_hash: bytesToHex(collateralNullifierHash),
      recipient: inputs[2],
      yield_index: bytesToHex(yieldIndex),

      // Private inputs
      nullifier: bytesToHex(nullifier),
      secret: bytesToHex(secret),
      merkle_proof: merkleProof.pathElements.map((i: string) => i.toString()),
      is_even: merkleProof.pathIndices.map((i: number) => i % 2 == 0),
    };
    const { witness } = await noir.execute(input);

    const originalLog = console.log;
    console.log = () => {};

    const { proof, publicInputs } = await honk.generateProof(witness, { verifierTarget: 'evm' });
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
    generateBorrowProof()
    .then((result) => {
      process.stdout.write(result);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
})();
