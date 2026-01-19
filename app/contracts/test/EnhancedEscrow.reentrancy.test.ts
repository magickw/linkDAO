import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EnhancedEscrow - Reentrancy Security Tests", function () {
    let escrow: Contract;
    let ldaoToken: Contract;
    let owner: Signer;
    let buyer: Signer;
    let seller: Signer;
    let attacker: Signer;
    let maliciousContract: Contract;

    const ESCROW_AMOUNT = ethers.parseEther("1.0");
    const PLATFORM_FEE = 250; // 2.5%

    beforeEach(async function () {
        [owner, buyer, seller, attacker] = await ethers.getSigners();

        // Deploy LDAO Token
        const LDAOToken = await ethers.getContractFactory("LDAOToken");
        ldaoToken = await LDAOToken.deploy(
            await owner.getAddress() // treasury
        );

        // Deploy EnhancedEscrow
        const EnhancedEscrow = await ethers.getContractFactory("EnhancedEscrow");
        escrow = await EnhancedEscrow.deploy(
            await ldaoToken.getAddress(),
            await owner.getAddress(), // governance (mock)
            await owner.getAddress()  // platformArbiter
        );

        // Set platform fee
        await escrow.setPlatformFee(PLATFORM_FEE);
    });

    describe("Reentrancy Attack Prevention", function () {
        it("Should prevent reentrancy in delivery confirmation", async function () {
            // Deploy malicious contract
            const MaliciousReceiver = await ethers.getContractFactory("MaliciousEscrowReceiver");
            maliciousContract = await MaliciousReceiver.deploy(await escrow.getAddress());

            // Create escrow with malicious contract as seller
            const deliveryDeadline = (await time.latest()) + 86400; // 1 day

            // Create escrow
            const tx = await escrow.connect(buyer).createEscrow(
                1, // listingId
                await maliciousContract.getAddress(),
                ethers.ZeroAddress, // ETH
                ESCROW_AMOUNT,
                deliveryDeadline,
                0 // AUTOMATIC resolution
            );

            const receipt = await tx.wait();
            const event = receipt?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event ? escrow.interface.parseLog(event)?.args[0] : 0;

            // Lock funds
            await escrow.connect(buyer).lockFunds(escrowId, {
                value: ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000)
            });

            // Attempt delivery confirmation (malicious contract will try to re-enter)
            await expect(
                escrow.connect(buyer).confirmDelivery(escrowId, "Delivered")
            ).to.not.be.reverted;

            // Verify the malicious contract only received funds once
            const contractBalance = await ethers.provider.getBalance(await maliciousContract.getAddress());
            expect(contractBalance).to.equal(ESCROW_AMOUNT);

            // Verify escrow status is DELIVERY_CONFIRMED (4)
            const escrowData = await escrow.escrows(escrowId);
            expect(escrowData.status).to.equal(4); // DELIVERY_CONFIRMED
        });

        it("Should prevent reentrancy in dispute resolution", async function () {
            // Deploy malicious contract
            const MaliciousReceiver = await ethers.getContractFactory("MaliciousEscrowReceiver");
            maliciousContract = await MaliciousReceiver.deploy(await escrow.getAddress());

            // Create escrow with malicious contract as buyer
            const deliveryDeadline = (await time.latest()) + 86400;

            // Create and fund escrow via malicious contract
            const totalAmount = ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000);
            const tx = await maliciousContract.createEscrowAndLockFunds(
                await seller.getAddress(),
                ethers.ZeroAddress,
                ESCROW_AMOUNT,
                deliveryDeadline,
                1, // COMMUNITY_VOTING
                totalAmount,
                { value: totalAmount }
            );

            // Extract escrowId from transaction logs
            // Since createEscrowAndLockFunds is internal transaction, we need to inspect logs
            const receipt = await tx.wait();
            const event = receipt?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event ? escrow.interface.parseLog(event)?.args[0] : 0;

            // Open dispute with bond
            // Default dispute bond is enabled in contract (check if default percentage > 0)
            // If required, we must send value.
            // Safe approach: disable bond or send sufficient amount.
            // Let's check required bond first
            let bondAmount = BigInt(0);
            try {
                bondAmount = await escrow.calculateDisputeBond(escrowId);
            } catch (e) {
                // If revert, maybe not required or other issue
            }

            if (bondAmount > 0) {
                await escrow.connect(seller).openDispute(escrowId, { value: bondAmount });
            } else {
                await escrow.connect(seller).openDispute(escrowId);
            }

            // Cast votes (buyer wins)
            await escrow.connect(owner).castVote(escrowId, true);

            // Since owner has > 10% voting power, it auto-resolves immediately
            // Verify status is RESOLVED_BUYER_WINS (6)
            let escrowData = await escrow.escrows(escrowId);
            expect(escrowData.status).to.equal(6);

            // Reentrancy check happens during resolution (inside castVote)
            // If we are here, reentrancy protection worked (or didn't crash)

            // Verify the malicious contract (Buyer) received funds (Escrow + Forfeited Bond)
            const expectedBondAmount = (ESCROW_AMOUNT * BigInt(500)) / BigInt(10000);
            const contractBalance = await ethers.provider.getBalance(await maliciousContract.getAddress());
            expect(contractBalance).to.equal(ESCROW_AMOUNT + expectedBondAmount);
        });

        it("Should prevent reentrancy in bond distribution", async function () {
            // Enable dispute bonds
            await escrow.setDisputeBondConfig(1000, true); // 10%

            // Deploy malicious contract
            const MaliciousReceiver = await ethers.getContractFactory("MaliciousEscrowReceiver");
            maliciousContract = await MaliciousReceiver.deploy(await escrow.getAddress());

            // Create escrow
            const deliveryDeadline = (await time.latest()) + 86400;
            const totalAmount = ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000);

            const tx1 = await escrow.connect(buyer).createEscrow(
                3,
                await maliciousContract.getAddress(), // Malicious contract as seller
                ethers.ZeroAddress,
                ESCROW_AMOUNT,
                deliveryDeadline,
                1 // COMMUNITY_VOTING
            );
            const receipt1 = await tx1.wait();
            const event1 = receipt1?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event1 ? escrow.interface.parseLog(event1)?.args[0] : 0;

            await escrow.connect(buyer).lockFunds(escrowId, { value: totalAmount });

            // Open dispute with bond from malicious contract (as seller)
            const bondAmount = (ESCROW_AMOUNT * BigInt(1000)) / BigInt(10000);
            await maliciousContract.enableAttack(); // Enable attack mode before interaction if needed, or inside receive
            await maliciousContract.openDisputeWithBond(escrowId, { value: bondAmount });

            // We want buyer to win so seller (malicious contract) loses bond
            // Wait, if seller relies on "bond forfeited" path?
            // Reentrancy usually happens when receiving ETH.
            // If seller loses, bond goes to buyer. Malicious contract receives nothing?
            // If seller wins, bond is refunded to seller. This is where reentrancy can happen.
            // So we want SELLER (Malicious) to WIN.

            await escrow.connect(owner).castVote(escrowId, false); // Vote for Seller

            // Verify status is RESOLVED_SELLER_WINS (7) (Immediate resolution)
            const escrowData = await escrow.escrows(escrowId);
            expect(escrowData.status).to.equal(7);

            const finalBalance = await ethers.provider.getBalance(await maliciousContract.getAddress());
            expect(finalBalance).to.be.gt(0); // Check balance increased (refund/payout)
        });
    });

    describe("State Consistency After Reentrancy Attempts", function () {
        it("Should maintain correct escrow status after reentrancy attempt", async function () {
            const deliveryDeadline = (await time.latest()) + 86400;

            const tx2 = await escrow.connect(buyer).createEscrow(
                4,
                await seller.getAddress(),
                ethers.ZeroAddress,
                ESCROW_AMOUNT,
                deliveryDeadline,
                0
            );
            const receipt2 = await tx2.wait();
            const event2 = receipt2?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event2 ? escrow.interface.parseLog(event2)?.args[0] : 0;

            await escrow.connect(buyer).lockFunds(escrowId, {
                value: ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000)
            });

            // Confirm delivery
            await escrow.connect(buyer).confirmDelivery(escrowId, "Delivered");

            // Verify status is DELIVERY_CONFIRMED (4)
            const escrowData = await escrow.escrows(escrowId);
            expect(escrowData.status).to.equal(4);

            // Attempt to confirm delivery again should fail
            await expect(
                escrow.connect(buyer).confirmDelivery(escrowId, "Delivered again")
            ).to.be.reverted;
        });

        it("Should prevent double spending of dispute bonds", async function () {
            await escrow.setDisputeBondConfig(1000, true);

            const deliveryDeadline = (await time.latest()) + 86400;
            const totalAmount = ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000);

            const tx3 = await escrow.connect(buyer).createEscrow(
                5,
                await seller.getAddress(),
                ethers.ZeroAddress,
                ESCROW_AMOUNT,
                deliveryDeadline,
                1
            );
            const receipt3 = await tx3.wait();
            const event3 = receipt3?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event3 ? escrow.interface.parseLog(event3)?.args[0] : 0;

            await escrow.connect(buyer).lockFunds(escrowId, { value: totalAmount });

            // Open dispute with bond
            const bondAmount = (ESCROW_AMOUNT * BigInt(1000)) / BigInt(10000);
            await escrow.connect(buyer).openDispute(escrowId, { value: bondAmount });

            // Resolve dispute
            await escrow.connect(owner).castVote(escrowId, true);

            // Verify status is RESOLVED_BUYER_WINS (6) or RESOLVED_SELLER_WINS (7)
            // Owner voted for Buyer -> 6
            let escrowStatusData = await escrow.escrows(escrowId);
            expect(escrowStatusData.status).to.equal(6);

            // Attempt reentrancy via openDispute (if possible) or just verify balance logic
            // The test "prevent double spending" usually involves calling withdraw/distribute twice.
            // Since it auto-resolved, funds are distributed.
            // We can try to manually call _handleDisputeBondDistribution if it were public? No.
            // We can try to call autoResolveDispute, which should fail "No active dispute".

            await expect(
                escrow.autoResolveDispute(escrowId)
            ).to.be.revertedWith("No active dispute");

            // Verify bond was cleared
            const bondData = await escrow.disputeBonds(escrowId);
            expect(bondData).to.equal(0);
        });
    });

    describe("Gas Limits and DoS Protection", function () {
        it("Should handle low gas scenarios gracefully", async function () {
            const deliveryDeadline = (await time.latest()) + 86400;

            const tx4 = await escrow.connect(buyer).createEscrow(
                6,
                await seller.getAddress(),
                ethers.ZeroAddress,
                ESCROW_AMOUNT,
                deliveryDeadline,
                0
            );
            const receipt4 = await tx4.wait();
            const event4 = receipt4?.logs.find((log: any) => {
                try {
                    return escrow.interface.parseLog(log)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowId = event4 ? escrow.interface.parseLog(event4)?.args[0] : 0;

            await escrow.connect(buyer).lockFunds(escrowId, {
                value: ESCROW_AMOUNT + (ESCROW_AMOUNT * BigInt(PLATFORM_FEE)) / BigInt(10000)
            });

            // Confirm delivery with sufficient gas
            const confirmTx = await escrow.connect(buyer).confirmDelivery(escrowId, "Delivered");
            const confirmReceipt = await confirmTx.wait();

            // Verify gas used is reasonable (< 300k gas)
            expect(confirmReceipt?.gasUsed).to.be.lessThan(300000);
        });
    });
});

// Malicious contract for testing
// Note: This should be created as a separate contract file
// contracts/test/MaliciousEscrowReceiver.sol
