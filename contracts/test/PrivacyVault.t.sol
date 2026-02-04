// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IncrementalMerkleTree} from "../src/IncrementalMerkleTree.sol";
import {MockUSDC} from "./mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AavePoolMock} from "../src/mocks/AavePoolMock.sol";
import {MorphoVaultMock} from "../src/mocks/MorphoVaultMock.sol";
import {IAavePool} from "../src/interfaces/IAavePool.sol";
import {IMorphoVault} from "../src/interfaces/IMorphoPool.sol";

contract PrivacyVaultTest is Test {
    IVerifier public verifier;
    PrivacyVault public privacyVault;
    Poseidon2 public poseidon;
    MockUSDC public usdc;
    AavePoolMock public aavePool;
    MorphoVaultMock public morphoVault;

    address public recipient;

    address public depositor;
    uint256 internal depositorKey;

    function setUp() public {
        recipient = makeAddr("recipient");

        (depositor, depositorKey) = makeAddrAndKey("depositor");

        // Deploy Mock USDC contract
        usdc = new MockUSDC(1_000_000e6);

        // Deploy Aave Pool Mock contract
        aavePool = new AavePoolMock();
        usdc.mint(address(aavePool), 10_000e6); // Fund Aave pool with some USDC to pay yield

        // Deploy Morpho Vault Mock
        morphoVault = new MorphoVaultMock(IERC20(usdc));
        usdc.mint(address(morphoVault), 10_000e6); // Fund Morpho vault to pay yield

        usdc.transfer(depositor, 1000e6); // Fund depositor with some USDC

        // Deploy Poseiden hasher contract
        poseidon = new Poseidon2();

        // Deploy Groth16 verifier contract.
        verifier = new HonkVerifier();

        privacyVault = new PrivacyVault(
            IVerifier(verifier),
            poseidon,
            20,
            100e6,
            IERC20(usdc),
            IAavePool(address(aavePool)),
            IMorphoVault(address(morphoVault))
        );
    }

    function _getProof(
        bytes32 _nullifier,
        bytes32 _secret,
        address _recipient,
        bytes32 _yieldIndex,
        bytes32[] memory leaves
    ) internal returns (bytes memory proof, bytes32[] memory publicInputs) {
        string[] memory inputs = new string[](7 + leaves.length);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateProof.ts";
        inputs[3] = vm.toString(_nullifier);
        inputs[4] = vm.toString(_secret);
        inputs[5] = vm.toString(bytes32(uint256(uint160(_recipient))));
        inputs[6] = vm.toString(_yieldIndex);

        for (uint256 i = 0; i < leaves.length; i++) {
            inputs[7 + i] = vm.toString(leaves[i]);
        }

        bytes memory result = vm.ffi(inputs);
        (proof, publicInputs) = abi.decode(result, (bytes, bytes32[]));
    }

    function _getCommitment() internal returns (bytes32 commitment, bytes32 nullifier, bytes32 secret) {
        string[] memory inputs = new string[](3);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateCommitment.ts";

        bytes memory result = vm.ffi(inputs);
        (commitment, nullifier, secret) = abi.decode(result, (bytes32, bytes32, bytes32));

        return (commitment, nullifier, secret);
    }

    function _getSignature(address from) internal returns (bytes memory signature) {
        bytes32 nonce = keccak256(abi.encodePacked("nonce", from, address(privacyVault), block.number));
        string[] memory inputs = new string[](12);

        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateSignature.ts";
        inputs[3] = vm.toString(depositorKey); // private key as uint string
        inputs[4] = vm.toString(address(privacyVault)); // to (payee / vault)
        inputs[5] = vm.toString(privacyVault.DENOMINATION()); // value
        inputs[6] = vm.toString(address(usdc)); // token verifyingContract
        inputs[7] = vm.toString(block.chainid); // chainId
        inputs[8] = vm.toString(nonce); // nonce (bytes32)
        inputs[9] = "USD"; // domain name
        inputs[10] = "2"; // domain version
        inputs[11] = vm.toString(block.timestamp); // current block timestamp

        signature = vm.ffi(inputs);
    }

    function testGetCommitment() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        assertTrue(commitment != 0);
        assertTrue(nullifier != 0);
        assertTrue(secret != 0);
    }

    function testGetProof() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();

        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(commitment, bytes32(yieldIndex));

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;

        (bytes memory proof, bytes32[] memory publicInputs) =
            _getProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);
    }

    function testMakeDeposit() public {
        // create a commitment
        // make a DepositWithAuthorization
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));
        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        vm.prank(depositor);
        privacyVault.depositWithAuthorization(_commitment, signature);
        // Each half goes to a different protocol
        assertEq(
            aavePool.getUserBalance(address(privacyVault), address(usdc)),
            privacyVault.DENOMINATION() / 2,
            "Aave should have half the deposit"
        );
    }

    function testMakeWithdrawal() public {
        // make a deposit
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));

        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        vm.prank(depositor);
        privacyVault.depositWithAuthorization(_commitment, signature);

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        // create a proof
        (bytes memory _proof, bytes32[] memory _publicInputs) =
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

        // make a withdrawal
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        privacyVault.withdraw(
            _proof,
            _publicInputs[0],
            _publicInputs[1],
            payable(address(uint160(uint256(_publicInputs[2])))),
            uint256(_publicInputs[3])
        );
        assertEq(
            usdc.balanceOf(recipient), privacyVault.DENOMINATION(), "Recipient should have received the withdrawn funds"
        );
    }

    function testAnotherAddressSendProof() public {
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));
        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        vm.prank(depositor);
        privacyVault.depositWithAuthorization(_commitment, signature);

        // create a proof
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory _proof, bytes32[] memory _publicInputs) =
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

        // make a withdrawal
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert();
        privacyVault.withdraw(_proof, _publicInputs[0], _publicInputs[1], payable(attacker), uint256(_publicInputs[3]));
    }

    function test_withdrawWithYieldBuckets() public {
        // make a deposit
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));

        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        vm.prank(depositor);
        privacyVault.depositWithAuthorization(_commitment, signature);

        // Simulate 10% yield on both protocols
        aavePool.setNormalizedIncome(address(usdc), 1e27 + 1e26);
        // Morpho: increase backing assets by 10% to simulate yield
        uint256 morphoAssets = morphoVault.totalAssetsBacking();
        morphoVault.setTotalAssets(morphoAssets + morphoAssets / 5); // 20% yield

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        // create a proof
        (bytes memory _proof, bytes32[] memory _publicInputs) =
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

        // make a withdrawal
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        privacyVault.withdraw(
            _proof,
            _publicInputs[0],
            _publicInputs[1],
            payable(address(uint160(uint256(_publicInputs[2])))),
            uint256(_publicInputs[3])
        );

        // With 10% yield on Aave and 20% on Morpho, blended yield is 15%
        uint256 expectedAmount = (privacyVault.DENOMINATION() * 115) / 100; // 1.15x
        assertApproxEqRel(
            usdc.balanceOf(recipient), expectedAmount, 0.01e18, "Recipient should have received funds with yield"
        );
    }
}
