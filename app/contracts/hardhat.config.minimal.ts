import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: false, // Disable optimization completely
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: false, // Disable optimization completely
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};

export default config;