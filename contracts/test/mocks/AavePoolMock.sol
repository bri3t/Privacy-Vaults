// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPool} from "../../src/interfaces/IPool.sol";

contract AavePoolMock is IPool {
    using SafeERC20 for IERC20;

    // Balance by user and asset
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => uint256) public normalizedIncome;

    event Supply(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Withdraw(address indexed asset, uint256 amount, address indexed to);

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 ) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        balances[onBehalfOf][asset] += amount;
        
        emit Supply(asset, amount, onBehalfOf);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 balance = balances[msg.sender][asset];
        
        if (amount > balance) {
            amount = balance;
        }
        
        balances[msg.sender][asset] -= amount;
        
        //calculate amount with yield
        uint256 income = normalizedIncome[asset];
        if (income == 0) {
            income = 1e27; // Default to 1e27 (ray) if not set
        }
        uint256 amountWithYield = (amount * income) / 1e27;

        IERC20(asset).safeTransfer(to, amountWithYield);
        
        emit Withdraw(asset, amount, to);
        
        return amount;
    }

    function getReserveNormalizedIncome(address asset) external view returns (uint256) {
        uint256 income = normalizedIncome[asset];
        // Default to 1e27 (ray) if not set (Aave's standard)
        return income == 0 ? 1e27 : income;
    }

    // Helper to set normalized income for testing
    function setNormalizedIncome(address asset, uint256 income) external {
        normalizedIncome[asset] = income;
    }

    // Helper to get user balance for testing
    function getUserBalance(address user, address asset) external view returns (uint256) {
        return balances[user][asset];
    }
}