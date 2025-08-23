// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC1363.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ShengTuoEquityToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC1363, ERC20Permit {
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blacklist;
    bool public whitelistEnabled;

    event WhitelistEnabledSet(bool enabled);
    event WhitelistUpdated(address indexed account, bool allowed);
    event BlacklistUpdated(address indexed account, bool blocked);

    constructor(address recipient, address initialOwner)
        ERC20("Sheng Tuo Equity Token", "STET")
        Ownable(initialOwner)
        ERC20Permit("Sheng Tuo Equity Token")
    {
        _mint(recipient, 50_000_000 * 10 ** decimals());
    }

    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistEnabledSet(enabled);
    }

    function setWhitelist(address account, bool allowed) external onlyOwner {
        whitelist[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    function setWhitelistBatch(address[] calldata accounts, bool allowed) external onlyOwner {
        for (uint i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = allowed;
            emit WhitelistUpdated(accounts[i], allowed);
        }
    }

    function setBlacklist(address account, bool blocked) external onlyOwner {
        blacklist[account] = blocked;
        emit BlacklistUpdated(account, blocked);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
        whenNotPaused
    {
        if (from != address(0)) {
            require(!blacklist[from], "Sender is blacklisted");
            if (whitelistEnabled) {
                require(whitelist[from], "Sender is not whitelisted");
            }
        }
        if (to != address(0)) {
            require(!blacklist[to], "Recipient is blacklisted");
            if (whitelistEnabled) {
                require(whitelist[to], "Recipient is not whitelisted");
            }
        }
        super._update(from, to, value);
    }
}
