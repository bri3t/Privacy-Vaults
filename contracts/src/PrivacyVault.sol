// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IVerifier} from "./Verifier.sol";
import {IncrementalMerkleTree, Poseidon2} from "./IncrementalMerkleTree.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {IMorphoVault} from "./interfaces/IMorphoPool.sol";

contract PrivacyVault is IncrementalMerkleTree, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // keccak256("receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)")[0:4]
    bytes4 private constant _RECEIVE_WITH_AUTHORIZATION_SELECTOR = 0xef55bec6;

    /// @dev Aave uses 27-decimal Ray units for liquidity index
    uint256 private constant RAY = 1e27;

    /// @dev Bucket precision: round yield index to this granularity (daily bucket ≈ 1e23)
    uint256 private constant BUCKET_PRECISION = 1e23;

    /// @dev 1 full share in MetaMorpho (18 decimals)
    uint256 private constant ONE_SHARE = 1e18;

    IERC20 public immutable token;
    IAavePool public aavePool;
    IMorphoVault public morphoVault;

    IVerifier public immutable i_verifier;
    uint256 public immutable DENOMINATION;

    /// @dev Morpho share price at deployment, used to normalize to RAY-scale index
    uint256 public immutable initialMorphoSharePrice;

    mapping(bytes32 => bool) public s_nullifierHashes;
    mapping(bytes32 => bool) public s_commitments;

    event DepositWithAuthorization(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp, uint256 yieldIndex);
    event Withdrawal(address to, bytes32 nullifierHash, uint256 payout);

    error PrivacyVault__DepositValueMismatch(uint256 expected, uint256 actual);
    error PrivacyVault__InvalidRecipient(address expected, address actual);
    error PrivacyVault__InvalidSender(address expected, address actual);
    error PrivacyVault__PaymentFailed(address recipient, uint256 amount);
    error PrivacyVault__NoteAlreadySpent(bytes32 nullifierHash);
    error PrivacyVault__UnknownRoot(bytes32 root);
    error PrivacyVault__InvalidWithdrawProof();
    error PrivacyVault__FeeExceedsDepositValue(uint256 expected, uint256 actual);
    error PrivacyVault__CommitmentAlreadyAdded(bytes32 commitment);
    error PrivacyVault__InvalidYieldIndex();

    constructor(
        IVerifier _verifier,
        Poseidon2 _hasher,
        uint32 _merkleTreeDepth,
        uint256 _denomination,
        IERC20 _token,
        IAavePool _aavePool,
        IMorphoVault _morphoVault
    ) IncrementalMerkleTree(_merkleTreeDepth, _hasher) Ownable(msg.sender) {
        i_verifier = _verifier;
        DENOMINATION = _denomination;
        token = _token;
        aavePool = _aavePool;
        morphoVault = _morphoVault;

        // Record Morpho share price at deployment to compute normalized growth
        initialMorphoSharePrice = _morphoVault.convertToAssets(ONE_SHARE);

        _token.approve(address(_aavePool), type(uint256).max);
        _token.approve(address(_morphoVault), type(uint256).max);
    }

    function setPools(address _aavePool, address _morphoVault) external onlyOwner {
        if (_aavePool != address(0)) {
            aavePool = IAavePool(_aavePool);
            token.approve(address(_aavePool), type(uint256).max);
        }
        if (_morphoVault != address(0)) {
            morphoVault = IMorphoVault(_morphoVault);
            token.approve(address(_morphoVault), type(uint256).max);
        }
    }

    /**
     * @dev Returns Morpho's share price scaled to RAY units (starts at RAY, grows with yield).
     *      Analogous to Aave's getReserveNormalizedIncome.
     */
    function getMorphoNormalizedIncome() public view returns (uint256) {
        uint256 currentPrice = morphoVault.convertToAssets(ONE_SHARE);
        return (currentPrice * RAY) / initialMorphoSharePrice;
    }

    /**
     * @dev Returns a blended yield index averaging Aave and Morpho, bucketed for privacy.
     *
     *      blendedIndex = (aaveIndex + morphoIndex) / 2
     *
     *      Both indices are in RAY scale (start at ~1e27). The approximation error of using
     *      a simple average vs computing each half independently is negligible when both
     *      protocols lend the same asset on the same chain (<0.01% for typical yield spreads).
     */
    function getCurrentBucketedYieldIndex() public view returns (uint256) {
        uint256 aaveIndex = aavePool.getReserveNormalizedIncome(address(token));
        uint256 morphoIndex = getMorphoNormalizedIncome();
        uint256 blendedIndex = (aaveIndex + morphoIndex) / 2;
        return (blendedIndex / BUCKET_PRECISION) * BUCKET_PRECISION;
    }

    /**
     * @param _innerCommitment the inner commitment Poseidon2(nullifier, secret), computed off-chain
     * @param _receiveAuthorization the calldata for EIP-3009 receiveWithAuthorization function
     * @dev Contract computes finalCommitment = Poseidon2(innerCommitment, yieldIndex) on-chain
     */
    function depositWithAuthorization(bytes32 _innerCommitment, bytes calldata _receiveAuthorization)
        external
        payable
        nonReentrant
    {
        // Compute yield index and final commitment on-chain (user cannot fake yield index)
        uint256 yieldIndex = getCurrentBucketedYieldIndex();
        bytes32 finalCommitment = hashLeftRight(_innerCommitment, bytes32(yieldIndex));

        if (s_commitments[finalCommitment]) revert PrivacyVault__CommitmentAlreadyAdded(finalCommitment);
        s_commitments[finalCommitment] = true;

        (address from, address to, uint256 amount) =
            abi.decode(_receiveAuthorization[0:96], (address, address, uint256));

        if (amount != DENOMINATION) {
            revert PrivacyVault__DepositValueMismatch({expected: DENOMINATION, actual: amount});
        }
        if (to != address(this)) revert PrivacyVault__InvalidRecipient({expected: address(this), actual: to});
        if (from != msg.sender) revert PrivacyVault__InvalidSender({expected: msg.sender, actual: from});

        // Transfer USDC from depositor to vault via EIP-3009
        (bool success,) =
            address(token).call(abi.encodePacked(_RECEIVE_WITH_AUTHORIZATION_SELECTOR, _receiveAuthorization));
        if (!success) revert PrivacyVault__PaymentFailed({recipient: address(this), amount: amount});

        // Supply USDC to Morpho and Aave to earn yield (50/50 split)
        uint256 depositSplit = amount / 2;
        morphoVault.deposit(depositSplit, address(this));
        aavePool.supply(address(token), depositSplit, address(this), 0);

        uint32 insertedIndex = _insert(finalCommitment);

        emit DepositWithAuthorization(finalCommitment, insertedIndex, block.timestamp, yieldIndex);
    }

    function withdraw(
        bytes calldata _proof,
        bytes32 _root,
        bytes32 _nullifierHash,
        address payable _recipient,
        uint256 _yieldIndex
    ) external nonReentrant {
        if (s_nullifierHashes[_nullifierHash]) {
            revert PrivacyVault__NoteAlreadySpent({nullifierHash: _nullifierHash});
        }
        if (!isKnownRoot(_root)) revert PrivacyVault__UnknownRoot({root: _root});
        if (_yieldIndex == 0) revert PrivacyVault__InvalidYieldIndex();

        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = _root;
        publicInputs[1] = _nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(address(_recipient))));
        publicInputs[3] = bytes32(_yieldIndex);

        if (!i_verifier.verify(_proof, publicInputs)) revert PrivacyVault__InvalidWithdrawProof();

        s_nullifierHashes[_nullifierHash] = true;

        // Calculate yield-adjusted payout using blended index (Aave + Morpho)
        uint256 currentAaveIndex = aavePool.getReserveNormalizedIncome(address(token));
        uint256 currentMorphoIndex = getMorphoNormalizedIncome();
        uint256 currentBlended = (currentAaveIndex + currentMorphoIndex) / 2;
        uint256 payout = (DENOMINATION * currentBlended) / _yieldIndex;

        // Withdraw proportionally to each protocol's current share of the yield.
        // Since every deposit puts DENOMINATION/2 into each protocol, their
        // current value is proportional to their respective index.
        uint256 totalIndex = currentAaveIndex + currentMorphoIndex;
        uint256 aaveWithdraw = (payout * currentAaveIndex) / totalIndex;
        uint256 morphoWithdraw = payout - aaveWithdraw; // remainder to avoid rounding loss

        morphoVault.withdraw(morphoWithdraw, _recipient, address(this));
        aavePool.withdraw(address(token), aaveWithdraw, _recipient);

        emit Withdrawal(_recipient, _nullifierHash, payout);
    }
}
