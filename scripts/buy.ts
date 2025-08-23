import hre from "hardhat";

const { ethers } = await hre.network.connect({ network: "bsctest" });

try {
	const SUB  = "0x6909D5E8F0d0695A512EfBF8270749252F5f7892";
	const USDT = "0xFB26093Fa0ab84426AFBd672563FB1872B0b8253";

	const [buyer] = await ethers.getSigners();
	const erc20 = new ethers.Contract(USDT, [
		"function approve(address,uint256) returns (bool)",
		"function allowance(address,address) view returns (uint256)"
	], buyer);
	const sub = new ethers.Contract(SUB, [
		"function subscribe(address token, uint256 amount) external"
	], buyer);

	const amount6 = ethers.parseUnits("1000", 6);

	const tx1 = await erc20.approve(SUB, amount6);
	await tx1.wait();

	console.log("allowance =", (await erc20.allowance(await buyer.getAddress(), SUB)).toString());

	const tx2 = await sub.subscribe(USDT, amount6);
	await tx2.wait();
	console.log("✓ subscribed");
} catch (e: any) {
	console.log("short:", e.shortMessage);
	console.log("reason:", e.reason);
	console.log("raw:", e.data);
}