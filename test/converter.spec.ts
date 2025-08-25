import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect({
	network: "hardhat"
});


const E18 = (x: string) => ethers.parseUnits(x, 18);

describe("EquityConverter", () => {
	async function fixture() {
		const [deployer, owner, recipient, alice] = await ethers.getSigners();

		// STET
		const Token = await ethers.getContractFactory("ShengTuoEquityToken", deployer);
		const stet = await Token.deploy(recipient.address, owner.address);
		await stet.waitForDeployment();

		// Converter
		const Conv = await ethers.getContractFactory("EquityConverter", deployer);
		const cvt = await Conv.deploy(await stet.getAddress(), owner.address);
		await cvt.waitForDeployment();

		// 给 alice 分点 STET 用于转股
		await stet.connect(recipient).transfer(alice.address, E18("500"));

		return { owner, recipient, alice, stet, cvt };
	}

	it("convert：先 approve，再 convert，余额与总量都会减少", async () => {
		const { alice, stet, cvt } = await fixture();
		const amount = E18("150");
		const ts0 = await stet.totalSupply();
		const bal0 = await stet.balanceOf(alice.address);

		await stet.connect(alice).approve(await cvt.getAddress(), amount);
		const hash = ethers.keccak256(ethers.toUtf8Bytes("document-001"));
		const tx = await cvt.connect(alice).convert(amount, hash);
		await expect(tx).to.emit(cvt, "Converted");

		expect(await stet.balanceOf(alice.address)).eq(bal0 - amount);
		expect(await stet.totalSupply()).eq(ts0 - amount);
	});

	it("permitAndConvert：免 approve，一次交易销毁", async () => {
		const { alice, stet, cvt } = await fixture();
		const amount = E18("120");

		const chainId = (await ethers.provider.getNetwork()).chainId;
		const name = await stet.name();
		const nonce = await stet.nonces(alice.address);
		const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
		const domain = { name, version: "1", chainId, verifyingContract: await stet.getAddress() };
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
			spender: await cvt.getAddress(),
			value: amount,
			nonce,
			deadline,
		};
		const sig = await (alice as any).signTypedData(domain, types, message);
		const r = `0x${sig.slice(2, 66)}` as `0x${string}`;
		const s = `0x${sig.slice(66, 130)}` as `0x${string}`;
		const v = Number(`0x${sig.slice(130, 132)}`);

		const bal0 = await stet.balanceOf(alice.address);
		const ts0 = await stet.totalSupply();
		const hash = ethers.keccak256(ethers.toUtf8Bytes("document-002"));

		const tx = await cvt.connect(alice).permitAndConvert(amount, hash, deadline, v, r, s);
		await expect(tx).to.emit(cvt, "Converted");

		expect(await stet.balanceOf(alice.address)).eq(bal0 - amount);
		expect(await stet.totalSupply()).eq(ts0 - amount);
	});
});