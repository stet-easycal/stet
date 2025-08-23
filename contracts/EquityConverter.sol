// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "./interfaces/ISTET.sol";

contract EquityConverter is Ownable, ReentrancyGuard {
    ISTET public immutable stet;
    uint256 public immutable minConvert;

    event Converted(address indexed user, uint256 amount, bytes32 indexed hash, uint256 timestamp);

    constructor(address _stet, address _owner) Ownable(_owner) {
        require(_stet != address(0), "stet=0");
        stet = ISTET(_stet);
        minConvert = 100 * (10 ** uint256(stet.decimals()));
    }

    function _checks(address caller, uint256 amount) internal view {
        require(amount >= minConvert, "amount < min");
        require(!stet.blacklist(caller), "blacklisted");
        if (stet.whitelistEnabled()) require(stet.whitelist(caller), "not whitelisted");
    }

    function convert(uint256 amount, bytes32 hash) external nonReentrant {
        _checks(msg.sender, amount);
        stet.burnFrom(msg.sender, amount);
        emit Converted(msg.sender, amount, hash, block.timestamp);
    }

    function permitAndConvert(
        uint256 amount,
        bytes32 hash,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant {
        _checks(msg.sender, amount);
        IERC20Permit(address(stet)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        stet.burnFrom(msg.sender, amount);
        emit Converted(msg.sender, amount, hash, block.timestamp);
    }
}