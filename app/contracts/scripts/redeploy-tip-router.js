const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Redeploying TipRouter on Sepolia...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Existing Addresses
    const LDAO = "0xc9F690B45e33ca909bB9ab97836091673232611B";
    const REWARD_POOL = "0x0bc773696BD4399a93672F82437a59369C2a1e6f";
    // Sepolia USDC/USDT (from frontend/communityWeb3Service.ts)
    const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";

    console.log("Configuration:", { LDAO, USDC, USDT, REWARD_POOL });

    const TipRouter = await hre.ethers.getContractFactory("TipRouter");
    const tipRouter = await TipRouter.deploy(LDAO, USDC, USDT, REWARD_POOL);

    console.log("Deploying... (Hash: " + tipRouter.deploymentTransaction().hash + ")");

    await tipRouter.waitForDeployment();

    const address = await tipRouter.getAddress();
    console.log("✅ TipRouter Deployed at:", address);

    // Verification Log
    console.log("Verifying LDAO on new contract...");
    const ldaoOnContract = await tipRouter.ldao();
    if (ldaoOnContract.toLowerCase() === LDAO.toLowerCase()) {
        console.log("✅ New Contract LDAO Address Matches!");
    } else {
        console.error("❌ Mismatch in new contract (Should be impossible)");
    }

    // Verify Fee Tiers are set (default constructor)
    try {
        const tier0 = await tipRouter.feeTiers(0);
        console.log("✅ Fee Tiers initialized correctly. Tier 0:", tier0);
    } catch (e) {
        console.error("❌ Fee Tiers empty on new deployment!");
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
