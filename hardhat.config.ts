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
	  bsctest: {
			type: "http",
		  url: process.env.BSC_TESTNET_RPC!,
		  accounts: process.env.PRIVATE_KEY2 ? [process.env.PRIVATE_KEY2] : [],
		  chainId: 97,
	  },
  },
};

export default config;
