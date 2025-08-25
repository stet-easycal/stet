// scripts/subscribe-usdt-bsc.ts


import { network } from 'hardhat';

async function main() {
	const { ethers } = await network.connect({
		network: "bsc"
	});

	const SUB  = "0xEfd994c510d7eD1f7C0c603EAb7AF3583a92863d";
	const USDT = "0x55d398326f99059fF775485246999027B3197955";

	const [buyer] = await ethers.getSigners();

	const erc20 = new ethers.Contract(
			USDT,
			[
				"function approve(address,uint256) returns (bool)",
				"function allowance(address,address) view returns (uint256)",
				"function balanceOf(address) view returns (uint256)",
				"function decimals() view returns (uint8)"
			],
			buyer
	);

	const sub = new ethers.Contract(
			SUB,
			["function subscribeUSDT(uint256 payAmount) external"],
			buyer
	);

	const payHuman = "1";
	const dec = await erc20.decimals();
	const amount = ethers.parseUnits(payHuman, dec);

	const bal = await erc20.balanceOf(await buyer.getAddress());
	if (bal < amount) {
		throw new Error(`余额不足：需要 ${payHuman} USDT，当前余额为 ${ethers.formatUnits(bal, dec)} USDT`);
	}

	const current = await erc20.allowance(await buyer.getAddress(), SUB);
	if (current < amount) {
		const tx1 = await erc20.approve(SUB, amount);
		console.log("approve tx =", tx1.hash);
		await tx1.wait();
	}

	console.log(
			"allowance =",
			(await erc20.allowance(await buyer.getAddress(), SUB)).toString()
	);

	const tx2 = await sub.subscribeUSDT(amount);
	console.log("subscribeUSDT tx =", tx2.hash);
	await tx2.wait();
	console.log("✓ subscribed");
}

main().catch((e: any) => {
	console.log("short:", e.shortMessage);
	console.log("reason:", e.reason);
	console.log("raw:", e.data ?? e);
	process.exit(1);
});