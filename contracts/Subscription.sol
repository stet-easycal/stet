// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISTET.sol";

contract Subscription is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISTET   public stet;
    address public stetTreasury;
    address public treasury;
    address public usdt;
    address public usdc;

    uint256 public constant STET_PER_USD = 10;

    uint256 public usdCap   = 5_000_000e18;
    uint256 public usdRaised;

    event SubscriptionCreated(
        address indexed buyer,
        address indexed token,
        uint256 payAmount18,
        uint256 usd18Added,
        uint256 stetOut
    );

    constructor(
        address _stet,
        address _stetTreasury,
        address _treasury,
        address _usdt,
        address _usdc,
        address _owner
    ) Ownable(_owner) {
        require(_stet != address(0) && _stetTreasury != address(0) && _treasury != address(0), "zero addr");
        stet = ISTET(_stet);
        stetTreasury = _stetTreasury;
        treasury = _treasury;
        usdt = _usdt;
        usdc = _usdc;
    }

    function setUsdCap18(uint256 cap18) external onlyOwner { usdCap = cap18; }
    function setTreasury(address t) external onlyOwner { require(t != address(0), "zero"); treasury = t; }
    function setStetTreasury(address t) external onlyOwner { require(t != address(0), "zero"); stetTreasury = t; }
    function setStableTokens(address _usdt, address _usdc) external onlyOwner {
        require(_usdt != address(0) && _usdc != address(0), "zero");
        require(IERC20Metadata(_usdt).decimals() == 18 && IERC20Metadata(_usdc).decimals() == 18, "decimals != 18");
        usdt = _usdt; usdc = _usdc;
    }

    function _subscribe(address stable, uint256 payAmount) internal {
        require(stable == usdt || stable == usdc, "unsupported");
        require(payAmount > 0, "zero");

        require(IERC20Metadata(stable).decimals() == 18, "decimals != 18");

        require(!stet.blacklist(msg.sender), "blacklisted");
        if (stet.whitelistEnabled()) require(stet.whitelist(msg.sender), "not whitelisted");

        uint256 newRaised = usdRaised + payAmount;
        require(newRaised <= usdCap, "cap reached");
        usdRaised = newRaised;

        uint256 stetOut = payAmount * STET_PER_USD;

        IERC20(stable).safeTransferFrom(msg.sender, treasury, payAmount);
        IERC20(address(stet)).safeTransferFrom(stetTreasury, msg.sender, stetOut);

        emit SubscriptionCreated(msg.sender, stable, payAmount, payAmount, stetOut);
    }

    function subscribeUSDT(uint256 payAmount) external nonReentrant {
        _subscribe(usdt, payAmount);
    }
    function subscribeUSDC(uint256 payAmount) external nonReentrant {
        _subscribe(usdc, payAmount);
    }

    receive() external payable { revert("no native"); }
}