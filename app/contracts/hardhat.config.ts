import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
    base: {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      gas: 6000000,
      gasPrice: 1000000000, // 1 gwei
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gas: 6000000,
      gasPrice: 1000000000, // 1 gwei
    },
    polygonMumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
    arbitrumGoerli: {
      url: process.env.ARBITRUM_GOERLI_RPC_URL || "https://goerli-rollup.arbitrum.io/rpc",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 421613,
      gas: 6000000,
      gasPrice: 2000000000, // 2 gwei
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gas: 6000000,
      gasPrice: 200000000000, // 200 gwei
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_wallet_private_key_here") ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
      gas: 6000000,
      gasPrice: 2000000000, // 2 gwei
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      arbitrum: process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      arbitrumGoerli: process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: []
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;