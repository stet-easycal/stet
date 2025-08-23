// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISTET is IERC20 {
    function burnFrom(address account, uint256 amount) external;
    function whitelistEnabled() external view returns (bool);
    function whitelist(address) external view returns (bool);
    function blacklist(address) external view returns (bool);
    function decimals() external view returns (uint8);
}