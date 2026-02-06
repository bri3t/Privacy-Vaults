// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {BorrowHonkVerifier} from "../src/BorrowVerifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAavePool} from "../src/interfaces/IAavePool.sol";
import {IMorphoVault} from "../src/interfaces/IMorphoPool.sol";

/// @notice Deploys 4 multi-denomination PrivacyVaults on Base mainnet with real Aave + Morpho strategies.
contract Deploy is Script {
    function run() external {
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base
        address aavePool = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5; // Aave V3 Pool on Base
        address morphoVault = 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61; // Morpho USDC vault on Base

        uint256[4] memory denominations = [uint256(1e6), 10e6, 20e6, 50e6];
        string[4] memory labels = ["1 USDC", "10 USDC", "20 USDC", "50 USDC"];

        vm.startBroadcast();

        // Deploy core contracts (shared)
        Poseidon2 poseidon = new Poseidon2();
        HonkVerifier withdrawVerifier = new HonkVerifier();
        BorrowHonkVerifier borrowVerifier = new BorrowHonkVerifier();

        // Deploy one vault per denomination
        for (uint256 i = 0; i < 4; i++) {
            PrivacyVault vault = new PrivacyVault(
                IVerifier(withdrawVerifier),
                IVerifier(address(borrowVerifier)),
                poseidon,
                20, // merkle tree depth
                denominations[i],
                IERC20(usdc),
                IAavePool(aavePool),
                IMorphoVault(morphoVault)
            );
            console.log(labels[i], address(vault));
        }

        vm.stopBroadcast();

        console.log("=== Mainnet Deployment (Base) ===");
        console.log("Poseidon2:          ", address(poseidon));
        console.log("WithdrawVerifier:   ", address(withdrawVerifier));
        console.log("BorrowVerifier:     ", address(borrowVerifier));
    }
}
