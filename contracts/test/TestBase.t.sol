// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {BorrowHonkVerifier} from "../src/BorrowVerifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IncrementalMerkleTree} from "../src/IncrementalMerkleTree.sol";
import {MockUSDC} from "./mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AavePoolMock} from "./mocks/AavePoolMock.sol";
import {MorphoVaultMock} from "./mocks/MorphoVaultMock.sol";
import {IAavePool} from "../src/interfaces/IAavePool.sol";
import {IMorphoVault} from "../src/interfaces/IMorphoPool.sol";



contract TestBase is Test {

    PrivacyVault public privacyVault;
    
    IVerifier public verifier;
    IVerifier public borrowVerifier;

    Poseidon2 public poseidon;
    AavePoolMock public aavePool;
    MorphoVaultMock public morphoVault;
    MockUSDC public usdc;

     address public depositor;
    uint256 internal depositorKey;
    address public borrower;
    address public recipient;

    uint256 constant DENOMINATION = 100e6; // 100 USDC
    uint256 constant LTV_BPS = 7000;
    uint256 constant BPS = 10000;

    // Counter to ensure unique EIP-3009 nonces across deposits in the same block
    uint256 private _depositNonce;


    function setUp() public {
        (depositor, depositorKey) = makeAddrAndKey("depositor");
        borrower = makeAddr("borrower");
        recipient = makeAddr("recipient");

        usdc = new MockUSDC(10_000_000e6);
        aavePool = new AavePoolMock();
        morphoVault = new MorphoVaultMock(IERC20(usdc));
        

        // Fund pools for withdrawals
        usdc.mint(address(aavePool), 100_000e6);
        usdc.mint(address(morphoVault), 100_000e6);
        usdc.transfer(depositor, 10_000e6);


        poseidon = new Poseidon2();
        withdrawVerifier = new HonkVerifier();
        borrowVerifier = IVerifier(address(new BorrowHonkVerifier()));

         vault = new PrivacyVault(
            withdrawVerifier,
            borrowVerifier,
            poseidon,
            20,
            DENOMINATION,
            IERC20(usdc),
            IAavePool(address(aavePool)),
            IMorphoVault(address(morphoVault))
        );

    }

    // Helpers

    function _getCommitment() internal returns (bytes32 commitment, bytes32 nullifier, bytes32 secret) {
        string[] memory inputs = new string[](3);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateCommitment.ts";
        bytes memory result = vm.ffi(inputs);
        (commitment, nullifier, secret) = abi.decode(result, (bytes32, bytes32, bytes32));
    }
    
}