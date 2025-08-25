import { network } from "hardhat";

async function main() {
	const { ethers } = await network.connect({
		network: "bsc"
	});

	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", deployer.address);

	const recipient     = deployer.address;
	const initialOwner  = deployer.address;
	const treasury      = deployer.address;
	const USDT_ADDRESS  = "0x55d398326f99059fF775485246999027B3197955";
	const USDC_ADDRESS  = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

	const STET = await ethers.getContractFactory("ShengTuoEquityToken");
	const stet = await STET.deploy(recipient, initialOwner);
	await stet.waitForDeployment();
	const STET_ADDR = await stet.getAddress();
	console.log("STET:", STET_ADDR);

	const Converter = await ethers.getContractFactory("EquityConverter");
	const converter = await Converter.deploy(STET_ADDR, initialOwner);
	await converter.waitForDeployment();
	console.log("EquityConverter:", await converter.getAddress());

	const Subscription = await ethers.getContractFactory("Subscription");
	const sub = await Subscription.deploy(
			STET_ADDR,
			recipient,
			treasury,
			USDT_ADDRESS,
			USDC_ADDRESS,
			initialOwner
	);
	await sub.waitForDeployment();
	const SUB_ADDR = await sub.getAddress();
	console.log("Subscription:", SUB_ADDR);

	const approveTx = await stet.approve(SUB_ADDR, ethers.parseUnits("50000000", 18));
	await approveTx.wait();
	console.log("Approved STET to Subscription");
}

main().catch((e) => { console.error(e); process.exit(1); });