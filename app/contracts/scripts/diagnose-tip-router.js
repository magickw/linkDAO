const hre = require("hardhat");

async function main() {
    console.log("Diagnosing TipRouter Contract on Sepolia...");

    // Addresses from configuration/logs
    const TIP_ROUTER_ADDRESS = "0x755Fe81411c86019fff6033E0567A4D93b57281b";
    const EXPECTED_LDAO_ADDRESS = "0xc9F690B45e33ca909bB9ab97836091673232611B";
    const EXPECTED_REWARD_POOL = "0x0bc773696BD4399a93672F82437a59369C2a1e6f";

    // Check network
    const network = await hre.ethers.provider.getNetwork();
    console.log(`Connected to network: ${network.name} (ChainID: ${network.chainId})`);

    if (Number(network.chainId) !== 11155111) {
        console.error("WARNING: Not connected to Sepolia! Checks might rely on Sepolia state.");
    }

    // Get TipRouter instance
    const tipRouter = await hre.ethers.getContractAt("TipRouter", TIP_ROUTER_ADDRESS);

    // Check LDAO Address
    console.log("\n--- Checking LDAO Configuration ---");
    try {
        const actualLdaoObj = await tipRouter.ldao();
        // In rare cases it returns an object/contract specific wrapper? No, should be address.
        const actualLdao = actualLdaoObj.toString();
        console.log(`TipRouter.ldao():    ${actualLdao}`);
        console.log(`Expected LDAO:       ${EXPECTED_LDAO_ADDRESS}`);

        if (actualLdao.toLowerCase() === EXPECTED_LDAO_ADDRESS.toLowerCase()) {
            console.log("✅ LDAO Address MATCHES");
        } else {
            console.error("❌ LDAO Address MISMATCH! This confirms the revert cause.");
        }
    } catch (e) {
        console.error("Failed to read ldao():", e.message);
    }

    // Check Reward Pool
    console.log("\n--- Checking Reward Pool ---");
    try {
        const actualPool = await tipRouter.rewardPool();
        console.log(`TipRouter.rewardPool(): ${actualPool}`);
        console.log(`Expected Pool:          ${EXPECTED_REWARD_POOL}`);

        if (actualPool.toLowerCase() === EXPECTED_REWARD_POOL.toLowerCase()) {
            console.log("✅ Reward Pool MATCHES");
        } else {
            console.warn("⚠️ Reward Pool MISMATCH! (Might be intentional if recently changed)");
        }
    } catch (e) {
        console.error("Failed to read rewardPool():", e.message);
    }

    // Check Fee Calculation
    console.log("\n--- Checking Fee Calculation ---");
    const amount = hre.ethers.parseEther("50"); // 50 LDAO
    try {
        const fee = await tipRouter.calculateFee(amount);
        console.log(`Amount: 50 LDAO`);
        console.log(`Calculated Fee: ${hre.ethers.formatEther(fee)} LDAO`);

        // Expected logic: < 100 LDAO => 10% ? Or 5%?
        // Contract code had default 10% for < 100.
        // Frontend thought 5%.
        if (hre.ethers.formatEther(fee) === "5.0") {
            console.log("Fee is 10% (Consistent with default contract logic)");
        } else if (hre.ethers.formatEther(fee) === "2.5") {
            console.log("Fee is 5% (Consistent with frontend logic)");
        } else {
            console.log(`Fee is ${Number(hre.ethers.formatEther(fee)) / 50 * 100}%`);
        }

    } catch (e) {
        console.error("Failed to calculateFee():", e.message);
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
