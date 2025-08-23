import hre from "hardhat";

const { ethers } = await hre.network.connect({ network: "bsctest" });

const user = (await ethers.getSigners())[0];

try {
	const SUB  = "0xC0Bb770B95ec1a6fBe2b92D78DE0D40B01579306";
	const STET = "0x0D40C9b9019D57aFf9737A817495B73C87377946";
	const stet = new ethers.Contract(STET, [
		"function decimals() view returns(uint8)",
		"function allowance(address,address) view returns(uint256)",
		"function approve(address,uint256) returns (bool)",
	], user);
	const conv = new ethers.Contract(SUB, [
		"function convert(uint256 amount, bytes32 hash) external",
	], user);

	const d = await stet.decimals(); // 18
	const amount18 = ethers.parseUnits("100", d);
	const docHash = ethers.id("doc-001");

	const cur = await stet.allowance(user.address, SUB);
	if (cur < amount18) {
		const tx1 = await stet.approve(SUB, amount18);
		console.log("approve tx:", tx1.hash);
		await tx1.wait();
	}

	const tx = await conv.convert(amount18, docHash);
	console.log("convert tx:", tx.hash);
	const receipt = await tx.wait();
	console.log("✓ 转股完成，block:", receipt.blockNumber);
} catch (e: any) {
	console.log("short:", e.shortMessage);
	console.log("reason:", e.reason);
	console.log("raw:", e.data);
}