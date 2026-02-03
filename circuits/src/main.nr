use poseidon::poseidon2;

mod merkle_tree;
fn main(
    // Public inputs
    root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    yield_index: pub Field,

    // Private inputs
    nullifier: Field,
    secret: Field,
    merkle_proof: [Field; 20],
    is_even: [bool; 20],
) {
    // compute the commitment as nested hash: Poseidon2(Poseidon2(nullifier, secret), yield_index)
    let inner: Field = poseidon2::Poseidon2::hash([nullifier, secret], 2);
    let commitment: Field = poseidon2::Poseidon2::hash([inner, yield_index], 2);

    // check that the nullifier matches the nullifier hash
    let computed_nullifier_hash: Field = poseidon2::Poseidon2::hash([nullifier], 1);
    assert(computed_nullifier_hash == nullifier_hash);
    
    // check that the commitment is in the Merkle tree
    let computed_root: Field = merkle_tree::compute_merkle_root(commitment, merkle_proof, is_even);
    assert(computed_root == root);

    // let recipient_binding = recipient * recipient;
    // assert(recipient_binding == recipient * recipient);
}