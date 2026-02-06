// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {BorrowHonkVerifier} from "../src/BorrowVerifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAavePool} from "../src/interfaces/IAavePool.sol";
import {IMorphoVault} from "../src/interfaces/IMorphoPool.sol";
import {AavePoolMock} from "../test/mocks/AavePoolMock.sol";
import {MorphoVaultMock} from "../test/mocks/MorphoVaultMock.sol";

/// @notice Deploys 4 multi-denomination PrivacyVaults with borrow support on Base Sepolia.
contract DeployTestnet is Script {
    function run() external {
        address usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC on Base Sepolia

        uint256[4] memory denominations = [uint256(1e6), 10e6, 20e6, 50e6];
        string[4] memory labels = ["1 USDC", "10 USDC", "20 USDC", "50 USDC"];

        vm.startBroadcast();

        // Deploy mock strategies (shared)
        AavePoolMock aaveMock = new AavePoolMock();
        MorphoVaultMock morphoMock = new MorphoVaultMock(IERC20(usdc));

        // Deploy core contracts (shared)
        Poseidon2 poseidon = new Poseidon2();

        HonkVerifier withdrawVerifier = new HonkVerifier();
        BorrowHonkVerifier borrowVerifier = new BorrowHonkVerifier();

        // Deploy one vault per denomination 
        for (uint256 i = 0; i < denominations.length; i++) {
            PrivacyVault vault = new PrivacyVault(
                IVerifier(withdrawVerifier),
                IVerifier(address(borrowVerifier)),
                poseidon,
                20, // merkle tree depth
                denominations[i],
                IERC20(usdc),
                IAavePool(address(aaveMock)),
                IMorphoVault(address(morphoMock))
            );
            console.log(labels[i], address(vault));
        }

        vm.stopBroadcast();

        console.log("=== Testnet Deployment (Base Sepolia) ===");
        console.log("AavePoolMock:      ", address(aaveMock));
        console.log("MorphoVaultMock:   ", address(morphoMock));
        console.log("Poseidon2:         ", address(poseidon));
        console.log("WithdrawVerifier:  ", address(withdrawVerifier));
        console.log("BorrowVerifier:    ", address(borrowVerifier));
    }
}
