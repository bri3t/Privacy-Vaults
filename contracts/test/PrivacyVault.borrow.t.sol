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

contract PrivacyVaultBorrowTest is Test {
    PrivacyVault public vault;
    Poseidon2 public poseidon;
    MockUSDC public usdc;
    IVerifier public withdrawVerifier;
    IVerifier public borrowVerifier;
    AavePoolMock public aavePool;
    MorphoVaultMock public morphoVault;

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

    // ---- Helpers ----

    function _getCommitment() internal returns (bytes32 commitment, bytes32 nullifier, bytes32 secret) {
        string[] memory inputs = new string[](3);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateCommitment.ts";
        bytes memory result = vm.ffi(inputs);
        (commitment, nullifier, secret) = abi.decode(result, (bytes32, bytes32, bytes32));
    }

    function _deposit(bytes32 nullifier, bytes32 secret) internal returns (bytes32 finalCommitment, bytes32 collateralNullifierHash) {
        bytes32 inner = vault.hashLeftRight(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        finalCommitment = vault.hashLeftRight(inner, bytes32(yieldIndex));

        bytes memory sig = _getSignature(depositor, DENOMINATION);
        vm.prank(depositor);
        vault.depositWithAuthorization(inner, sig);

        // Compute collateral nullifier hash = Poseidon2(nullifier, 1)
        collateralNullifierHash = vault.hashLeftRight(nullifier, bytes32(uint256(1)));
    }

    function _getWithdrawProof(
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

    function _getBorrowProof(
        bytes32 _nullifier,
        bytes32 _secret,
        address _recipient,
        bytes32 _yieldIndex,
        bytes32[] memory leaves
    ) internal returns (bytes memory proof, bytes32[] memory publicInputs) {
        string memory fileName = "generateBorrowProof";
        string[] memory inputs = new string[](7 + leaves.length);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = string(abi.encodePacked("js-scripts/", fileName, ".ts"));
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

    function _getSignature(address from, uint256 amount) internal returns (bytes memory) {
        bytes32 nonce = keccak256(abi.encodePacked("nonce", from, address(vault), block.number, block.timestamp, _depositNonce));
        _depositNonce++;
        string[] memory inputs = new string[](12);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateSignature.ts";
        inputs[3] = vm.toString(depositorKey);
        inputs[4] = vm.toString(address(vault));
        inputs[5] = vm.toString(amount);
        inputs[6] = vm.toString(address(usdc));
        inputs[7] = vm.toString(block.chainid);
        inputs[8] = vm.toString(nonce);
        inputs[9] = "USD";
        inputs[10] = "2";
        inputs[11] = vm.toString(block.timestamp);
        return vm.ffi(inputs);
    }

    function _getRepaySignature(address from, uint256 amount) internal returns (bytes memory) {
        bytes32 nonce = keccak256(abi.encodePacked("repay-nonce", from, address(vault), block.number, block.timestamp));
        string[] memory inputs = new string[](12);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateSignature.ts";
        inputs[3] = vm.toString(depositorKey);
        inputs[4] = vm.toString(address(vault));
        inputs[5] = vm.toString(amount);
        inputs[6] = vm.toString(address(usdc));
        inputs[7] = vm.toString(block.chainid);
        inputs[8] = vm.toString(nonce);
        inputs[9] = "USD";
        inputs[10] = "2";
        inputs[11] = vm.toString(block.timestamp);
        return vm.ffi(inputs);
    }

    function _computeMaxBorrow() internal view returns (uint256) {
        uint256 currentBlended = (aavePool.getReserveNormalizedIncome(address(usdc)) + vault.getMorphoNormalizedIncome()) / 2;
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 collateralValue = (DENOMINATION * currentBlended) / yieldIndex;
        return (collateralValue * LTV_BPS) / BPS;
    }

    // ---- Tests ----

    function test_borrow_success() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 maxBorrow = _computeMaxBorrow();
        uint256 borrowAmount = maxBorrow / 2;

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory proof, bytes32[] memory publicInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);

        uint256 recipientBefore = usdc.balanceOf(recipient);

        vault.borrow(
            proof,
            publicInputs[0], // root
            publicInputs[1], // collateralNullifierHash
            payable(address(uint160(uint256(publicInputs[2])))), // recipient
            uint256(publicInputs[3]), // yieldIndex
            borrowAmount
        );

        assertEq(usdc.balanceOf(recipient) - recipientBefore, borrowAmount, "Recipient should receive borrowed USDC");

        (uint256 principal,,, bool active) = vault.s_loans(collateralHash);
        assertTrue(active, "Loan should be active");
        assertEq(principal, borrowAmount, "Principal should match borrow amount");
        assertEq(vault.totalBorrowed(), borrowAmount, "totalBorrowed should be updated");
    }

    function test_borrow_exceeds_ltv() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment,) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 maxBorrow = _computeMaxBorrow();

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory proof, bytes32[] memory publicInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);

        vm.expectRevert();
        vault.borrow(
            proof,
            publicInputs[0],
            publicInputs[1],
            payable(address(uint160(uint256(publicInputs[2])))),
            uint256(publicInputs[3]),
            maxBorrow + 1
        );
    }

    function test_borrow_after_withdrawal() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;

        // Withdraw first with real proof
        (bytes memory withdrawProof, bytes32[] memory withdrawInputs) = _getWithdrawProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);
        vault.withdraw(
            withdrawProof,
            withdrawInputs[0],
            withdrawInputs[1], // nullifierHash
            withdrawInputs[2], // collateralNullifierHash
            payable(address(uint160(uint256(withdrawInputs[3])))),
            uint256(withdrawInputs[4])
        );

        // Generate borrow proof
        (bytes memory borrowProof, bytes32[] memory borrowInputs) = _getBorrowProof(nullifier, secret, borrower, bytes32(yieldIndex), leaves);

        // Now try to borrow — should revert because collateral is spent
        vm.expectRevert(
            abi.encodeWithSelector(PrivacyVault.PrivacyVault__DepositAlreadyWithdrawn.selector, collateralHash)
        );
        vault.borrow(
            borrowProof,
            borrowInputs[0],
            borrowInputs[1],
            payable(address(uint160(uint256(borrowInputs[2])))),
            uint256(borrowInputs[3]),
            10e6
        );
    }

    function test_borrow_double_collateral() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 borrowAmount = 10e6;

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory proof, bytes32[] memory publicInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);

        // First borrow succeeds
        vault.borrow(proof, publicInputs[0], publicInputs[1], payable(address(uint160(uint256(publicInputs[2])))), uint256(publicInputs[3]), borrowAmount);

        // Second borrow with same collateral should revert (proof is valid but loan already active)
        vm.expectRevert(
            abi.encodeWithSelector(PrivacyVault.PrivacyVault__LoanAlreadyActive.selector, collateralHash)
        );
        vault.borrow(proof, publicInputs[0], publicInputs[1], payable(address(uint160(uint256(publicInputs[2])))), uint256(publicInputs[3]), borrowAmount);
    }

    function test_repay_success() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 borrowAmount = 50e6;

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory proof, bytes32[] memory publicInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);

        // Borrow
        vault.borrow(proof, publicInputs[0], publicInputs[1], payable(address(uint160(uint256(publicInputs[2])))), uint256(publicInputs[3]), borrowAmount);

        // Get current debt
        uint256 debt = vault.getDebt(collateralHash);
        assertGe(debt, borrowAmount, "Debt should be >= principal");

        // Depositor repays
        bytes memory repaySig = _getRepaySignature(depositor, debt);
        vault.repayWithAuthorization(collateralHash, repaySig);

        // Verify loan is cleared
        (,,, bool active) = vault.s_loans(collateralHash);
        assertFalse(active, "Loan should no longer be active");
        assertEq(vault.totalBorrowed(), 0, "totalBorrowed should be 0");
        assertEq(vault.getDebt(collateralHash), 0, "Debt should be 0 after repayment");
    }

    function test_repay_no_active_loan() public {
        bytes32 fakeHash = bytes32(uint256(999));

        vm.expectRevert(
            abi.encodeWithSelector(PrivacyVault.PrivacyVault__NoActiveLoan.selector, fakeHash)
        );
        vault.repayWithAuthorization(fakeHash, hex"00");
    }

    function test_withdraw_blocked_by_loan() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;

        // Borrow first
        (bytes memory borrowProof, bytes32[] memory borrowInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);
        vault.borrow(borrowProof, borrowInputs[0], borrowInputs[1], payable(address(uint160(uint256(borrowInputs[2])))), uint256(borrowInputs[3]), 10e6);

        // Try to withdraw — should revert because loan is active
        (bytes memory withdrawProof, bytes32[] memory withdrawInputs) = _getWithdrawProof(nullifier, secret, borrower, bytes32(yieldIndex), leaves);
        vm.expectRevert(
            abi.encodeWithSelector(PrivacyVault.PrivacyVault__CollateralLocked.selector, collateralHash)
        );
        vault.withdraw(withdrawProof, withdrawInputs[0], withdrawInputs[1], withdrawInputs[2], payable(address(uint160(uint256(withdrawInputs[3])))), uint256(withdrawInputs[4]));
    }

    function test_withdraw_after_repay() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;

        // Borrow
        (bytes memory borrowProof, bytes32[] memory borrowInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);
        vault.borrow(borrowProof, borrowInputs[0], borrowInputs[1], payable(address(uint160(uint256(borrowInputs[2])))), uint256(borrowInputs[3]), 10e6);

        // Repay
        uint256 debt = vault.getDebt(collateralHash);
        bytes memory repaySig = _getRepaySignature(depositor, debt);
        vault.repayWithAuthorization(collateralHash, repaySig);

        // Withdraw should now succeed
        (bytes memory withdrawProof, bytes32[] memory withdrawInputs) = _getWithdrawProof(nullifier, secret, borrower, bytes32(yieldIndex), leaves);
        uint256 recipientBefore = usdc.balanceOf(borrower);
        vault.withdraw(withdrawProof, withdrawInputs[0], withdrawInputs[1], withdrawInputs[2], payable(address(uint160(uint256(withdrawInputs[3])))), uint256(withdrawInputs[4]));
        assertTrue(usdc.balanceOf(borrower) > recipientBefore, "Borrower should receive withdrawn funds");
    }

    function test_getDebt_tracks_yield() public {
        (bytes32 commitment, bytes32 nullifier, bytes32 secret) = _getCommitment();
        (bytes32 finalCommitment, bytes32 collateralHash) = _deposit(nullifier, secret);
        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();
        uint256 borrowAmount = 50e6;

        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = finalCommitment;
        (bytes memory proof, bytes32[] memory publicInputs) = _getBorrowProof(nullifier, secret, recipient, bytes32(yieldIndex), leaves);

        vault.borrow(proof, publicInputs[0], publicInputs[1], payable(address(uint160(uint256(publicInputs[2])))), uint256(publicInputs[3]), borrowAmount);

        // Simulate 10% yield on Aave
        aavePool.setNormalizedIncome(address(usdc), 1e27 + 1e26);

        uint256 debt = vault.getDebt(collateralHash);
        assertGt(debt, borrowAmount, "Debt should increase with yield");

        // With 10% Aave yield and 0% Morpho, blended = 5% yield
        uint256 expectedDebt = (borrowAmount * 105) / 100;
        assertApproxEqRel(debt, expectedDebt, 0.02e18, "Debt should track blended yield");
    }

    function test_multiple_borrows_different_deposits() public {
        // Deposit 1
        (bytes32 commitment1, bytes32 nullifier1, bytes32 secret1) = _getCommitment();
        (bytes32 finalCommitment1, bytes32 collateralHash1) = _deposit(nullifier1, secret1);

        // Deposit 2
        (bytes32 commitment2, bytes32 nullifier2, bytes32 secret2) = _getCommitment();
        (bytes32 finalCommitment2, bytes32 collateralHash2) = _deposit(nullifier2, secret2);

        uint256 yieldIndex = vault.getCurrentBucketedYieldIndex();

        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = finalCommitment1;
        leaves[1] = finalCommitment2;

        // Borrow against deposit 1
        (bytes memory proof1, bytes32[] memory inputs1) = _getBorrowProof(nullifier1, secret1, recipient, bytes32(yieldIndex), leaves);
        vault.borrow(proof1, inputs1[0], inputs1[1], payable(address(uint160(uint256(inputs1[2])))), uint256(inputs1[3]), 30e6);

        // Borrow against deposit 2
        (bytes memory proof2, bytes32[] memory inputs2) = _getBorrowProof(nullifier2, secret2, borrower, bytes32(yieldIndex), leaves);
        vault.borrow(proof2, inputs2[0], inputs2[1], payable(address(uint160(uint256(inputs2[2])))), uint256(inputs2[3]), 50e6);

        // Both loans should be active
        (uint256 p1,,, bool a1) = vault.s_loans(collateralHash1);
        (uint256 p2,,, bool a2) = vault.s_loans(collateralHash2);
        assertTrue(a1 && a2, "Both loans should be active");
        assertEq(p1, 30e6, "Loan 1 principal");
        assertEq(p2, 50e6, "Loan 2 principal");
        assertEq(vault.totalBorrowed(), 80e6, "Total borrowed should be sum");
    }
}
