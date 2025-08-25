import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect({
	network: "hardhat"
});

const E18 = (x: string) => ethers.parseUnits(x, 18);
const SUPPLY = 50_000_000n * 10n ** 18n;

describe("Subscription (18-decimals USDT/USDC)", () => {
	async function fixture() {
		const [deployer, owner, recipient, treasury, buyer] = await ethers.getSigners();

		// 1) 部署 STET，全部打到 recipient（stetTreasury）
		const Token = await ethers.getContractFactory("ShengTuoEquityToken", deployer);
		const stet = await Token.deploy(recipient.address, owner.address);
		await stet.waitForDeployment();

		// 2) 部署 18 位的 Mock USDT/USDC，给 buyer 铸币
		const Mock = await ethers.getContractFactory("MockToken");
		const usdt = await Mock.deploy("Mock USDT", "USDT");
		const usdc = await Mock.deploy("Mock USDC", "USDC");
		await usdt.waitForDeployment(); await usdc.waitForDeployment();

		await usdt.connect(deployer).transfer(buyer.address, E18("1000000"));
		await usdc.connect(deployer).transfer(buyer.address, E18("1000000"));

		// 3) 部署 Subscription（stetTreasury=recipient，treasury 收稳定币）
		const Sub = await ethers.getContractFactory("Subscription", deployer);
		const sub = await Sub.deploy(
				await stet.getAddress(),
				recipient.address,   // stetTreasury
				treasury.address,    // 收款地址
				await usdt.getAddress(),
				await usdc.getAddress(),
				owner.address
		);
		await sub.waitForDeployment();

		// 4) 让 stetTreasury 批 STET 给 Subscription（发币用）
		await stet.connect(recipient).approve(await sub.getAddress(), SUPPLY);

		return { deployer, owner, recipient, treasury, buyer, stet, usdt, usdc, sub };
	}

	it("正常认购：buyer approve USDT → subscribe → buyer 得到 STET，treasury 收到 USDT", async () => {
		const { buyer, treasury, stet, usdt, usdc, sub } = await fixture();

		const pay = E18("1000");          // 1000 USDT
		const expectSTET = pay * 10n;     // 1 USD -> 10 STET

		// 先批 USDT 给 Subscription
		await usdt.connect(buyer).approve(await sub.getAddress(), pay);

		const balU0 = await usdt.balanceOf(treasury.address);
		const balS0 = await stet.balanceOf(buyer.address);

		const tx = await sub.connect(buyer).subscribeUSDT(pay);
		await expect(tx).to.emit(sub, "SubscriptionCreated");

		expect(await usdt.balanceOf(treasury.address)).eq(balU0 + pay);
		expect(await stet.balanceOf(buyer.address)).eq(balS0 + expectSTET);

		// 用 USDC 再试一次
		await usdc.connect(buyer).approve(await sub.getAddress(), pay);
		await sub.connect(buyer).subscribeUSDC(pay);
		expect(await usdc.balanceOf(treasury.address)).eq(balU0 + pay);
		expect(await stet.balanceOf(buyer.address)).eq(balS0 + expectSTET + expectSTET); // +2 次认购

	});

	it("cap 限制：超过 usdCap 会 revert", async () => {
		const { owner, buyer, usdt, sub } = await fixture();
		await sub.connect(owner).setUsdCap18(E18("1000")); // 设置上限 1000 USD

		await usdt.connect(buyer).approve(await sub.getAddress(), E18("2000"));
		await expect(sub.connect(buyer).subscribeUSDT(E18("1500")))
				.to.be.revertedWith("cap reached");
	});

	it("decimals 校验：非 18 位稳定币会被拒绝", async () => {
		const { deployer, owner, recipient, treasury, buyer, stet } = await fixture();

		// 再部署一个 6 位的代币
		const Mock = await ethers.getContractFactory("MockERC20", deployer);
		const usdx6 = await Mock.deploy("Mock6", "USDX", 6, buyer.address, 1_000_000n * 10n ** 6n);
		await usdx6.waitForDeployment();

		const Sub = await ethers.getContractFactory("Subscription", deployer);
		const sub2 = await Sub.deploy(
				await stet.getAddress(),
				recipient.address,
				treasury.address,
				await usdx6.getAddress(), // 有意配置成 6 位
				await usdx6.getAddress(),
				owner.address
		);
		await sub2.waitForDeployment();
		await stet.connect(recipient).approve(await sub2.getAddress(), SUPPLY);

		await usdx6.connect(buyer).approve(await sub2.getAddress(), 1000n * 10n ** 6n);
		await expect(sub2.connect(buyer).subscribeUSDT(1000n * 10n ** 6n))
				.to.be.revertedWith("decimals != 18");
	});

	it("黑名单/白名单检查：黑名单拒绝；开启白名单时 from&to 都要在白名单", async () => {
		const { owner, recipient, buyer, usdt, stet, sub } = await fixture();
		const pay = E18("10");

		// 黑名单：买家黑名单 → 拒绝
		await stet.connect(owner).setBlacklist(buyer.address, true);
		await usdt.connect(buyer).approve(await sub.getAddress(), pay);
		await expect(sub.connect(buyer).subscribeUSDT(pay))
				.to.be.revertedWith("blacklisted");
		await stet.connect(owner).setBlacklist(buyer.address, false);

		// 开启白名单：需要把 "STET 金库(recipient)" 和 "买家(buyer)" 两边都放行
		await stet.connect(owner).setWhitelistEnabled(true);
		await stet.connect(owner).setWhitelist(recipient.address, true);
		await expect(sub.connect(buyer).subscribeUSDT(pay))
				.to.be.revertedWith("not whitelisted");
		await stet.connect(owner).setWhitelist(buyer.address, true);

		// 再试一次（注意重新批额度或用 MaxUint256，避免额度不足）
		await usdt.connect(buyer).approve(await sub.getAddress(), pay);
		await sub.connect(buyer).subscribeUSDT(pay);
	});
});