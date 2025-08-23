import { network } from "hardhat";

async function main() {
	const { ethers } = await network.connect({
		network: "bsctest"
	});

	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", deployer.address);

	const recipient     = deployer.address;
	const initialOwner  = deployer.address;
	const treasury      = deployer.address;
	const USDT_ADDRESS  = "0xFB26093Fa0ab84426AFBd672563FB1872B0b8253";
	const USDC_ADDRESS  = "0x377Be66e77484f0046A29B73880965D886A50AA8";

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