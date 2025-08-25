import { expect } from "chai";
import { network } from 'hardhat';

const SUPPLY = 50_000_000n * 10n ** 18n;
const { ethers } = await network.connect({
	network: "hardhat"
});

describe("ShengTuoEquityToken", function () {


	async function deploy() {
		const [deployer, owner, recipient, alice, bob, spender] = await ethers.getSigners();
		const Token = await ethers.getContractFactory("ShengTuoEquityToken", deployer);
		const token = await Token.deploy(recipient.address, owner.address);
		await token.waitForDeployment();

		return { token, deployer, owner, recipient, alice, bob, spender };
	}

	it("初始化：总量、余额、owner 正确", async () => {
		const { token, owner, recipient } = await deploy();

		expect(await token.owner()).to.equal(owner.address);
		expect(await token.totalSupply()).to.equal(SUPPLY);
		expect(await token.balanceOf(recipient.address)).to.equal(SUPPLY);

		// 默认不启用白名单
		expect(await token.whitelistEnabled()).to.equal(false);
	});

	it("未启用白名单时可正常转账", async () => {
		const { token, recipient, alice } = await deploy();

		const amount = ethers.parseUnits("123.45", 18);
		await expect(token.connect(recipient).transfer(alice.address, amount))
				.to.emit(token, "Transfer")
				.withArgs(recipient.address, alice.address, amount);

		expect(await token.balanceOf(alice.address)).to.equal(amount);
	});

	it("pause 后所有转账/燃烧都会被阻止，unpause 恢复", async () => {
		const { token, owner, recipient, alice } = await deploy();
		const amt = ethers.parseUnits("10", 18);

		await token.connect(owner).pause();

		await expect(token.connect(recipient).transfer(alice.address, amt)).to.be.revert(ethers);

		await token.connect(owner).unpause();
		await token.connect(recipient).transfer(alice.address, amt);
		expect(await token.balanceOf(alice.address)).to.equal(amt);

		// 再次 pause，burn 也会被挡
		await token.connect(owner).pause();
		await expect(token.connect(alice).burn(1n)).to.be.revert(ethers);
	});

	it("黑名单：发起方/接收方任一被拉黑都禁止转账", async () => {
		const { token, owner, recipient, alice } = await deploy();
		const amt = ethers.parseUnits("1", 18);

		// 拉黑发起方
		await token.connect(owner).setBlacklist(recipient.address, true);
		await expect(token.connect(recipient).transfer(alice.address, amt))
				.to.be.revertedWith("Sender is blacklisted");

		// 解除发起方黑名单，拉黑接收方
		await token.connect(owner).setBlacklist(recipient.address, false);
		await token.connect(owner).setBlacklist(alice.address, true);
		await expect(token.connect(recipient).transfer(alice.address, amt))
				.to.be.revertedWith("Recipient is blacklisted");
	});

	it("白名单开启后：from 与 to 都必须在白名单", async () => {
		const { token, owner, recipient, alice } = await deploy();
		const amt = ethers.parseUnits("2", 18);

		await token.connect(owner).setWhitelistEnabled(true);

		// 两者都不在白名单 → 先检查 from
		await expect(token.connect(recipient).transfer(alice.address, amt))
				.to.be.revertedWith("Sender is not whitelisted");

		// 仅放行 from，不放行 to
		await token.connect(owner).setWhitelist(recipient.address, true);
		await expect(token.connect(recipient).transfer(alice.address, amt))
				.to.be.revertedWith("Recipient is not whitelisted");

		// 两边都放行 → 成功
		await token.connect(owner).setWhitelist(alice.address, true);
		await token.connect(recipient).transfer(alice.address, amt);

		expect(await token.balanceOf(alice.address)).to.equal(amt);
	});

	it("燃烧：burn 与 burnFrom 正常减少总量与余额", async () => {
		const { token, recipient, alice, spender } = await deploy();

		// 给 alice 转一些再测试 burn
		const amt = ethers.parseUnits("100", 18);
		await token.connect(recipient).transfer(alice.address, amt);

		const ts0 = await token.totalSupply();
		const bal0 = await token.balanceOf(alice.address);

		// burn 自己
		await token.connect(alice).burn(ethers.parseUnits("1", 18));
		expect(await token.totalSupply()).to.equal(ts0 - ethers.parseUnits("1", 18));
		expect(await token.balanceOf(alice.address)).to.equal(bal0 - ethers.parseUnits("1", 18));

		// burnFrom：先授权再由 spender 销毁
		await token.connect(alice).approve(spender.address, ethers.parseUnits("2", 18));
		await token.connect(spender).burnFrom(alice.address, ethers.parseUnits("2", 18));

		expect(await token.balanceOf(alice.address)).to.equal(bal0 - ethers.parseUnits("3", 18));
	});

	it("permit: EIP-2612 设置额度后可 transferFrom", async () => {
		const { token, recipient, alice, spender } = await deploy();

		// 给 alice 一些余额
		const value = ethers.parseUnits("5", 18);
		await token.connect(recipient).transfer(alice.address, value);

		// 准备 EIP-2612 签名
		const chainId = (await ethers.provider.getNetwork()).chainId;
		const name = await token.name();
		const nonce = await token.nonces(alice.address);
		const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

		const domain = {
			name,
			version: "1",
			chainId,
			verifyingContract: await token.getAddress(),
		};
		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};
		const message = {
			owner: alice.address,
			spender: spender.address,
			value,
			nonce,
			deadline,
		};

		const sig = await (alice as any).signTypedData(domain, types, message);
		const r = `0x${sig.slice(2, 66)}` as `0x${string}`;
		const s = `0x${sig.slice(66, 130)}` as `0x${string}`;
		const v = Number(`0x${sig.slice(130, 132)}`);

		// 调用 permit
		await token.permit(alice.address, spender.address, value, deadline, v, r, s);
		expect(await token.allowance(alice.address, spender.address)).to.equal(value);

		// 再由 spender 划走
		await token.connect(spender).transferFrom(alice.address, (await ethers.getSigners())[0].address, value);
		expect(await token.allowance(alice.address, spender.address)).to.equal(0n);
	});

	it("批量白名单: setWhitelistBatch 正常生效", async () => {
		const { token, owner, recipient, alice, bob } = await deploy();
		await token.connect(owner).setWhitelistEnabled(true);

		await token.connect(owner).setWhitelistBatch([recipient.address, alice.address], true);

		// recipient -> alice OK
		await token.connect(recipient).transfer(alice.address, ethers.parseUnits("1", 18));

		// alice -> bob（bob 未白名单）失败
		await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18)))
				.to.be.revertedWith("Recipient is not whitelisted");
	});

	it("黑名单事件触发", async () => {
		const { token, owner, alice } = await deploy();
		await expect(token.connect(owner).setBlacklist(alice.address, true))
				.to.emit(token, "BlacklistUpdated")
				.withArgs(alice.address, true);
	});

	it("WhitelistEnabledSet 事件触发", async () => {
		const { token, owner } = await deploy();
		await expect(token.connect(owner).setWhitelistEnabled(true))
				.to.emit(token, "WhitelistEnabledSet")
				.withArgs(true);
	});
});