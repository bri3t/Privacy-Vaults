// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TestBase} from "./TestBase.t.sol";
import {PrivacyVault} from "../src/PrivacyVault.sol";

contract PrivacyVaultTest is TestBase {
    function setUp() public override {
        super.setUp();
    }

    function testGetCommitment() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        assertTrue(commitment != 0);
        assertTrue(nullifier != 0);
        assertTrue(secret != 0);
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
        // create a proof (now returns 5 public inputs)
        (bytes memory _proof, bytes32[] memory _publicInputs) =
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves, false);

        // make a withdrawal (now includes collateralNullifierHash at index 2)
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        privacyVault.withdraw(
            _proof,
            _publicInputs[0],
            _publicInputs[1],
            _publicInputs[2], // collateralNullifierHash
            payable(address(uint160(uint256(_publicInputs[3])))),
            uint256(_publicInputs[4])
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
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves, false);

        // make a withdrawal with wrong recipient
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert();
        privacyVault.withdraw(
            _proof, _publicInputs[0], _publicInputs[1], _publicInputs[2], payable(attacker), uint256(_publicInputs[4])
        );
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
            _getProof(_nullifier, _secret, recipient, bytes32(yieldIndex), leaves, false);

        // make a withdrawal
        assertEq(usdc.balanceOf(recipient), 0, "Recipient should have 0 balance before withdrawal");
        privacyVault.withdraw(
            _proof,
            _publicInputs[0],
            _publicInputs[1],
            _publicInputs[2],
            payable(address(uint160(uint256(_publicInputs[3])))),
            uint256(_publicInputs[4])
        );

        // With 10% yield on Aave and 20% on Morpho, blended yield is 15%
        uint256 expectedAmount = (privacyVault.DENOMINATION() * 115) / 100; // 1.15x
        assertApproxEqRel(
            usdc.balanceOf(recipient), expectedAmount, 0.01e18, "Recipient should have received funds with yield"
        );
    }
}
