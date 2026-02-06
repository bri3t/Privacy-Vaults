// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../../src/Verifier.sol";

/// @dev Mock verifier that always returns true (for unit testing without real proofs)
contract MockVerifier is IVerifier {
    function verify(bytes calldata, bytes32[] calldata) external returns (bool) {
        return true;
    }
}
