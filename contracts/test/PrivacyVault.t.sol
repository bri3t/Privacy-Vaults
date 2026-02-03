// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IncrementalMerkleTree} from "../src/IncrementalMerkleTree.sol";
import {MockUSDC} from "./mocks/TestERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AavePoolMock} from "./mocks/AavePoolMock.sol";
import {IPool} from "../src/interfaces/IPool.sol";

contract PrivacyVaultTest is Test {
    IVerifier public verifier;
    PrivacyVault public privacyVault;
    Poseidon2 public poseidon;
    MockUSDC public usdc;
    AavePoolMock public aavePool;

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

        usdc.transfer(depositor, 1000e6); // Fund depositor with some USDC

        // Deploy Poseiden hasher contract
        poseidon = new Poseidon2();

        // Deploy Groth16 verifier contract.
        verifier = new HonkVerifier();

        privacyVault = new PrivacyVault(IVerifier(verifier), poseidon, 20, 1e6, IERC20(usdc), IPool(aavePool));
    }

    function _getProof(bytes32 _nullifier, bytes32 _secret, address _recipient, bytes32 _yieldIndex, bytes32[] memory leaves)
        internal
        returns (bytes memory proof, bytes32[] memory publicInputs)
    {
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
        inputs[9] = "USD Coin"; // domain name (adjust for your mock if needed)
        inputs[10] = "2"; // domain version (adjust for your mock if needed)
        inputs[11] = vm.toString(block.timestamp); // current block timestamp

        signature = vm.ffi(inputs);
    }

    function testGetCommitment() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        console.log("Commitment: ");
        console.logBytes32(commitment);
        console.log("Nullifier: ");
        console.logBytes32(nullifier);
        console.log("Secret: ");
        console.logBytes32(secret);
        console.log("Recipient: ");
        console.log(recipient);
        assertTrue(commitment != 0);
        assertTrue(nullifier != 0);
        assertTrue(secret != 0);
    }

    function testGetProof() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        console.log("Commitment: ");
        console.logBytes32(commitment);
        console.log("Nullifier: ");
        console.logBytes32(nullifier);
        console.log("Secret: ");
        console.logBytes32(secret);

        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(commitment, bytes32(yieldIndex));

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;

        (bytes memory proof, bytes32[] memory publicInputs) = _getProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);
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
        privacyVault.depositWithAuthorization(_commitment, signature);
        assertEq(aavePool.getUserBalance(address(privacyVault), address(usdc)), privacyVault.DENOMINATION(), "Vault should have the deposited amount after deposit");
    }

    function testMakeWithdrawal() public {
        // make a deposit
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));

        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        privacyVault.depositWithAuthorization(_commitment, signature);

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        // create a proof
        (bytes memory _proof, bytes32[] memory _publicInputs) = _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

        // make a withdrawal
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        assertEq(aavePool.getUserBalance(address(privacyVault), address(usdc)), privacyVault.DENOMINATION(), "Vault should have the deposited amount before withdrawal");
        privacyVault.withdraw(
            _proof, _publicInputs[0], _publicInputs[1], payable(address(uint160(uint256(_publicInputs[2])))), uint256(_publicInputs[3])
        );
        assertEq(usdc.balanceOf(recipient), privacyVault.DENOMINATION(), "Recipient should have received the withdrawn funds");
        assertEq(usdc.balanceOf(address(privacyVault)), 0, "Vault balance should be 0 after withdrawal");
    }

    function testAnotherAddressSendProof() public {
        (bytes32 _commitment, bytes32 _nullifier, bytes32 _secret) = _getCommitment();
        bytes memory signature = _getSignature(depositor);
        uint256 yieldIndex = privacyVault.getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = privacyVault.hashLeftRight(_commitment, bytes32(yieldIndex));
        vm.expectEmit(true, false, false, true);
        emit PrivacyVault.DepositWithAuthorization(finalCommitment, 0, block.timestamp, yieldIndex);
        privacyVault.depositWithAuthorization(_commitment, signature);

        // create a proof
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory _proof, bytes32[] memory _publicInputs) = _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

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
        privacyVault.depositWithAuthorization(_commitment, signature);

        // Simulate yield accrual by increasing normalized income
        aavePool.setNormalizedIncome(address(usdc), 1e27 + 1e26); // Simulate 10% yield

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        // create a proof
        (bytes memory _proof, bytes32[] memory _publicInputs) = _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves);

        // make a withdrawal
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        assertEq(aavePool.getUserBalance(address(privacyVault), address(usdc)), privacyVault.DENOMINATION(), "Vault should have the deposited amount before withdrawal");
        privacyVault.withdraw(
            _proof, _publicInputs[0], _publicInputs[1], payable(address(uint160(uint256(_publicInputs[2])))), uint256(_publicInputs[3])
        );
        uint256 expectedAmount = (privacyVault.DENOMINATION() * aavePool.getReserveNormalizedIncome(address(usdc))) / 1e27;
        console.log("Expected amount with yield: ", expectedAmount);
        assertEq(usdc.balanceOf(recipient), expectedAmount, "Recipient should have received the withdrawn funds with yield");
        assertEq(usdc.balanceOf(address(privacyVault)), 0, "Vault balance should be 0 after withdrawal");
    }
}
