import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
		hardhat: {
			type: "edr-simulated",
			chainId: 31337,
		},
	  bsctest: {
			type: "http",
		  url: process.env.BSC_TESTNET_RPC!,
		  accounts: process.env.PRIVATE_KEY2 ? [process.env.PRIVATE_KEY2] : [],
		  chainId: 97,
	  },
		bsc: {
			type: "http",
			url: process.env.BSC_MAINNET_RPC!,
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 56,
		},
  },
};

export default config;
