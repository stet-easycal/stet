import { network } from "hardhat";

async function main() {
	const { ethers } = await network.connect({
		network: "bsctest"
	});

	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", await deployer.getAddress());


	const MockToken = await ethers.getContractFactory("MockToken");
	const usdt = await MockToken.deploy("Mock USDT", "USDT");
	await usdt.waitForDeployment();

	console.log(`✓ Deployed USDT at ${usdt.target}`);

	const usdc = await MockToken.deploy("Mock USDC", "USDC");
	await usdc.waitForDeployment();

	console.log(`✓ Deployed USDC at ${usdc.target}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});