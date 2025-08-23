// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISTET.sol";

contract Subscription is Ownable, ReentrancyGuard {
    ISTET   public stet;
    address public stetTreasury;
    address public treasury;
    address public usdt;
    address public usdc;

    uint256 public constant STET_PER_USD = 10;
    uint256 public constant MIN_USD6     = 100e6;
    uint256 public usdCap6  = 5_000_000e6;
    uint256 public usdRaised6;

    event SubscriptionCreated(address indexed buyer, address indexed token, uint256 payAmount, uint256 usd6Added, uint256 stetOut);

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

    function setUsdCap6(uint256 cap6) external onlyOwner { usdCap6 = cap6; }
    function setTreasury(address t) external onlyOwner { require(t!=address(0),"zero"); treasury = t; }
    function setStetTreasury(address t) external onlyOwner { require(t!=address(0),"zero"); stetTreasury = t; }
    function setStableTokens(address _usdt, address _usdc) external onlyOwner { usdt = _usdt; usdc = _usdc; }

    function subscribe(address stable, uint256 payAmount) external nonReentrant {
        require(stable == usdt || stable == usdc, "unsupported");
        require(payAmount > 0, "zero");

        require(!stet.blacklist(msg.sender), "blacklisted");
        if (stet.whitelistEnabled()) require(stet.whitelist(msg.sender), "not whitelisted");

        uint8 d = IERC20Metadata(stable).decimals();

        uint256 usd6 = _to6(payAmount, d);
        require(usd6 >= MIN_USD6, "below min $100");
        uint256 newRaised = usdRaised6 + usd6;
        require(newRaised <= usdCap6, "cap reached");
        usdRaised6 = newRaised;

        uint256 stetOut = _stetOutFromPay(payAmount, d);

        IERC20(stable).transferFrom(msg.sender, treasury, payAmount);

        bool ok = IERC20(address(stet)).transferFrom(stetTreasury, msg.sender, stetOut);
        require(ok, "STET transferFrom failed");

        emit SubscriptionCreated(msg.sender, stable, payAmount, usd6, stetOut);
    }

    function _to6(uint256 amount, uint8 d) internal pure returns (uint256) {
        if (d == 6) return amount;
        if (d > 6)  return amount / (10 ** (d - 6));
        return amount * (10 ** (6 - d));
    }

    function _stetOutFromPay(uint256 payAmount, uint8 d) internal pure returns (uint256) {
        if (d <= 18) {
            return payAmount * (10 ** (18 - d)) * STET_PER_USD;
        } else {
            return (payAmount / (10 ** (d - 18))) * STET_PER_USD;
        }
    }
}