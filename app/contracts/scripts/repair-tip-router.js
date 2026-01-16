const hre = require("hardhat");

async function main() {
    const TIP_ROUTER_ADDRESS = "0x755Fe81411c86019fff6033E0567A4D93b57281b";
    console.log(`Connecting to TipRouter at ${TIP_ROUTER_ADDRESS}...`);

    const [deployer] = await hre.ethers.getSigners();
    console.log("Signer:", deployer.address);

    // Check if signer is owner
    const tipRouter = await hre.ethers.getContractAt("TipRouter", TIP_ROUTER_ADDRESS);
    const owner = await tipRouter.owner();
    console.log("Contract Owner:", owner);

    if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
        console.error("❌ Signer is NOT the owner! Cannot repair.");
        return;
    }

    console.log("Repairing TipRouter feeTiers (Array Format)...");

    // Format: [[threshold, feeBps], ...]
    const tiers = [
        [0, 1000],
        [hre.ethers.parseEther("100"), 500],
        [hre.ethers.parseEther("1000"), 250]
    ];

    console.log("Sending transaction with MANUAL gas limit...");
    const tx = await tipRouter.setFeeTiers(tiers, { gasLimit: 300000 }); // Bump gas slightly
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ TipRouter feeTiers restored!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
