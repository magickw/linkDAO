import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LDAOTreasury", function () {
    let ldaoToken: Contract;
    let usdcToken: Contract;
    let multiSigWallet: Contract;
    let treasury: Contract;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;

    const INITIAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1B tokens
    const INITIAL_PRICE = ethers.utils.parseEther("0.01"); // $0.01

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy USDC mock token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdcToken = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdcToken.deployed();

        // Deploy MultiSigWallet
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        const owners = [owner.address, user1.address, user2.address];
        multiSigWallet = await MultiSigWallet.deploy(owners, 2, 3600); // 2 confirmations, 1 hour delay
        await multiSigWallet.deployed();

        // Deploy LDAO Token
        const LDAOToken = await ethers.getContractFactory("LDAOToken");
        ldaoToken = await LDAOToken.deploy(owner.address);
        await ldaoToken.deployed();

        // Deploy Treasury
        const LDAOTreasury = await ethers.getContractFactory("LDAOTreasury");
        treasury = await LDAOTreasury.deploy(
            ldaoToken.address,
            usdcToken.address,
            multiSigWallet.address
        );
        await treasury.deployed();

        // Transfer tokens to treasury
        const treasurySupply = ethers.utils.parseEther("100000000"); // 100M tokens for sales
        await ldaoToken.transfer(treasury.address, treasurySupply);

        // Mint USDC to users for testing
        await usdcToken.mint(user1.address, ethers.utils.parseUnits("10000", 6)); // 10k USDC
        await usdcToken.mint(user2.address, ethers.utils.parseUnits("10000", 6));
        await usdcToken.mint(user3.address, ethers.utils.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
        it("Should set the correct initial parameters", async function () {
            expect(await treasury.ldaoToken()).to.equal(await ldaoToken.getAddress());
            expect(await treasury.usdcToken()).to.equal(await usdcToken.getAddress());
            expect(await treasury.multiSigWallet()).to.equal(await multiSigWallet.getAddress());
            expect(await treasury.ldaoPriceInUSD()).to.equal(INITIAL_PRICE);
            expect(await treasury.salesActive()).to.be.true;
            expect(await treasury.kycRequired()).to.be.false;
        });

        it("Should initialize pricing tiers correctly", async function () {
            const tier1 = await treasury.getPricingTier(1);
            expect(tier1.threshold).to.equal(ethers.parseEther("100000")); // 100k LDAO
            expect(tier1.discountBps).to.equal(500); // 5%
            expect(tier1.active).to.be.true;

            const tier2 = await treasury.getPricingTier(2);
            expect(tier2.threshold).to.equal(ethers.parseEther("500000")); // 500k LDAO
            expect(tier2.discountBps).to.equal(1000); // 10%
            expect(tier2.active).to.be.true;

            const tier3 = await treasury.getPricingTier(3);
            expect(tier3.threshold).to.equal(ethers.parseEther("1000000")); // 1M LDAO
            expect(tier3.discountBps).to.equal(1500); // 15%
            expect(tier3.active).to.be.true;
        });
    });

    describe("ETH Purchases", function () {
        it("Should allow ETH purchase with correct calculations", async function () {
            const ldaoAmount = ethers.parseEther("1000"); // 1000 LDAO
            const expectedUSDAmount = ldaoAmount * INITIAL_PRICE / ethers.parseEther("1");
            const expectedETHAmount = expectedUSDAmount * ethers.parseEther("1") / ETH_PRICE;

            const initialBalance = await ldaoToken.balanceOf(await user1.getAddress());
            
            await treasury.connect(user1).purchaseWithETH(ldaoAmount, {
                value: expectedETHAmount
            });

            const finalBalance = await ldaoToken.balanceOf(await user1.getAddress());
            expect(finalBalance - initialBalance).to.equal(ldaoAmount);
        });

        it("Should apply volume discounts correctly", async function () {
            const ldaoAmount = ethers.parseEther("150000"); // 150k LDAO (qualifies for 5% discount)
            
            const quote = await treasury.getQuote(ldaoAmount);
            const basePrice = ldaoAmount * INITIAL_PRICE / ethers.parseEther("1");
            const expectedDiscount = basePrice * 500n / 10000n; // 5% discount
            const expectedUSDAmount = basePrice - expectedDiscount;

            expect(quote.usdAmount).to.equal(expectedUSDAmount);
            expect(quote.discount).to.equal(500); // 5% in basis points
        });

        it("Should enforce purchase limits", async function () {
            const tooSmall = ethers.parseEther("5"); // Below minimum
            const tooLarge = ethers.parseEther("2000000"); // Above maximum

            await expect(
                treasury.connect(user1).purchaseWithETH(tooSmall, { value: ethers.parseEther("0.1") })
            ).to.be.revertedWith("Below minimum purchase");

            await expect(
                treasury.connect(user1).purchaseWithETH(tooLarge, { value: ethers.parseEther("100") })
            ).to.be.revertedWith("Exceeds maximum purchase");
        });

        it("Should refund excess ETH", async function () {
            const ldaoAmount = ethers.parseEther("1000");
            const expectedUSDAmount = ldaoAmount * INITIAL_PRICE / ethers.parseEther("1");
            const expectedETHAmount = expectedUSDAmount * ethers.parseEther("1") / ETH_PRICE;
            const excessETH = ethers.parseEther("1"); // Send extra ETH

            const initialETHBalance = await ethers.provider.getBalance(await user1.getAddress());
            
            const tx = await treasury.connect(user1).purchaseWithETH(ldaoAmount, {
                value: expectedETHAmount + excessETH
            });
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

            const finalETHBalance = await ethers.provider.getBalance(await user1.getAddress());
            const expectedFinalBalance = initialETHBalance - expectedETHAmount - gasUsed;

            expect(finalETHBalance).to.be.closeTo(expectedFinalBalance, ethers.parseEther("0.001"));
        });
    });

    describe("USDC Purchases", function () {
        it("Should allow USDC purchase with correct calculations", async function () {
            const ldaoAmount = ethers.parseEther("1000");
            const expectedUSDAmount = ldaoAmount * INITIAL_PRICE / ethers.parseEther("1");
            const expectedUSDCAmount = expectedUSDAmount / ethers.parseUnits("1", 12); // Convert to 6 decimals

            // Approve USDC spending
            await usdcToken.connect(user1).approve(await treasury.getAddress(), expectedUSDCAmount);

            const initialLDAOBalance = await ldaoToken.balanceOf(await user1.getAddress());
            const initialUSDCBalance = await usdcToken.balanceOf(await user1.getAddress());

            await treasury.connect(user1).purchaseWithUSDC(ldaoAmount);

            const finalLDAOBalance = await ldaoToken.balanceOf(await user1.getAddress());
            const finalUSDCBalance = await usdcToken.balanceOf(await user1.getAddress());

            expect(finalLDAOBalance - initialLDAOBalance).to.equal(ldaoAmount);
            expect(initialUSDCBalance - finalUSDCBalance).to.equal(expectedUSDCAmount);
        });

        it("Should fail without sufficient USDC allowance", async function () {
            const ldaoAmount = ethers.parseEther("1000");

            await expect(
                treasury.connect(user1).purchaseWithUSDC(ldaoAmount)
            ).to.be.revertedWith("USDC transfer failed");
        });
    });

    describe("Circuit Breaker", function () {
        it("Should enforce daily purchase limits", async function () {
            const dailyLimit = await treasury.dailyPurchaseLimit();
            const largeAmount = dailyLimit + ethers.parseEther("1");

            await expect(
                treasury.connect(user1).purchaseWithETH(largeAmount, { value: ethers.parseEther("100") })
            ).to.be.revertedWith("Daily purchase limit exceeded");
        });

        it("Should trigger emergency stop at threshold", async function () {
            const emergencyThreshold = await treasury.emergencyStopThreshold();
            const triggerAmount = emergencyThreshold + ethers.parseEther("1");

            await expect(
                treasury.connect(user1).purchaseWithETH(triggerAmount, { value: ethers.parseEther("100") })
            ).to.be.revertedWith("Emergency threshold exceeded");
        });

        it("Should reset daily counters after 24 hours", async function () {
            const purchaseAmount = ethers.parseEther("1000000"); // 1M LDAO
            const ethValue = ethers.parseEther("50");

            // Make a large purchase
            await treasury.connect(user1).purchaseWithETH(purchaseAmount, { value: ethValue });
            
            let currentDayPurchases = await treasury.getCurrentDayPurchases();
            expect(currentDayPurchases).to.equal(purchaseAmount);

            // Fast forward 25 hours
            await time.increase(25 * 60 * 60);

            // Check that counters reset
            currentDayPurchases = await treasury.getCurrentDayPurchases();
            expect(currentDayPurchases).to.equal(0);
        });
    });

    describe("Dynamic Pricing", function () {
        it("Should update price based on demand", async function () {
            const initialPrice = await treasury.ldaoPriceInUSD();
            
            // Make large purchases to increase demand
            const largeAmount = ethers.parseEther("2000000"); // 2M LDAO
            const ethValue = ethers.parseEther("100");
            
            await treasury.connect(user1).purchaseWithETH(largeAmount, { value: ethValue });

            // Fast forward past price update interval
            await time.increase(3601); // 1 hour + 1 second

            // Trigger price update with another purchase
            await treasury.connect(user2).purchaseWithETH(ethers.parseEther("1000"), { value: ethers.parseEther("1") });

            const newPrice = await treasury.ldaoPriceInUSD();
            expect(newPrice).to.be.greaterThan(initialPrice);
        });

        it("Should cap price at maximum multiplier", async function () {
            const basePriceInUSD = await treasury.basePriceInUSD();
            const maxPriceMultiplier = await treasury.maxPriceMultiplier();
            const maxPrice = basePriceInUSD * maxPriceMultiplier / ethers.parseEther("1");

            // Set extreme demand multiplier
            await treasury.updateDynamicPricingParams(maxPriceMultiplier * 2n, 3600);

            const pricingInfo = await treasury.getDynamicPricingInfo();
            expect(pricingInfo.currentPrice).to.be.lessThanOrEqual(maxPrice);
        });
    });

    describe("KYC and Whitelist", function () {
        it("Should enforce KYC when required", async function () {
            await treasury.setKYCRequired(true);

            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");

            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue })
            ).to.be.revertedWith("KYC required");

            // Approve KYC
            await treasury.updateKYCStatus(await user1.getAddress(), true);

            // Should work now
            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue })
            ).to.not.be.reverted;
        });

        it("Should allow batch KYC updates", async function () {
            const users = [await user1.getAddress(), await user2.getAddress(), await user3.getAddress()];
            
            await treasury.batchUpdateKYC(users, true);

            for (const user of users) {
                expect(await treasury.kycApproved(user)).to.be.true;
            }
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update pricing parameters", async function () {
            const newPrice = ethers.parseEther("0.02"); // $0.02
            
            await treasury.updateLDAOPrice(newPrice);
            expect(await treasury.basePriceInUSD()).to.equal(newPrice);
        });

        it("Should allow owner to update circuit breaker parameters", async function () {
            const newDailyLimit = ethers.parseEther("20000000"); // 20M LDAO
            const newEmergencyThreshold = ethers.parseEther("10000000"); // 10M LDAO

            await treasury.updateCircuitBreakerParams(newDailyLimit, newEmergencyThreshold);

            expect(await treasury.dailyPurchaseLimit()).to.equal(newDailyLimit);
            expect(await treasury.emergencyStopThreshold()).to.equal(newEmergencyThreshold);
        });

        it("Should allow emergency pause", async function () {
            await treasury.emergencyPause("Emergency test");
            expect(await treasury.paused()).to.be.true;

            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");

            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue })
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should allow adding and updating pricing tiers", async function () {
            const threshold = ethers.parseEther("2000000"); // 2M LDAO
            const discount = 2000; // 20%

            await treasury.addPricingTier(threshold, discount);

            const tier = await treasury.getPricingTier(4);
            expect(tier.threshold).to.equal(threshold);
            expect(tier.discountBps).to.equal(discount);
            expect(tier.active).to.be.true;
        });

        it("Should prevent non-owners from calling admin functions", async function () {
            await expect(
                treasury.connect(user1).updateLDAOPrice(ethers.parseEther("0.02"))
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                treasury.connect(user1).emergencyPause("Unauthorized")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Fund Management", function () {
        it("Should allow owner to withdraw ETH", async function () {
            // First make a purchase to add ETH to treasury
            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");
            
            await treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue });

            const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
            const treasuryETHBalance = await ethers.provider.getBalance(await treasury.getAddress());

            const tx = await treasury.withdrawETH(treasuryETHBalance, await owner.getAddress());
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

            const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
            expect(finalBalance).to.equal(initialBalance + treasuryETHBalance - gasUsed);
        });

        it("Should allow owner to withdraw USDC", async function () {
            // First make a purchase to add USDC to treasury
            const ldaoAmount = ethers.parseEther("1000");
            const expectedUSDCAmount = ethers.parseUnits("10", 6); // Approximate USDC amount

            await usdcToken.connect(user1).approve(await treasury.getAddress(), expectedUSDCAmount);
            await treasury.connect(user1).purchaseWithUSDC(ldaoAmount);

            const treasuryUSDCBalance = await usdcToken.balanceOf(await treasury.getAddress());
            const initialOwnerBalance = await usdcToken.balanceOf(await owner.getAddress());

            await treasury.withdrawToken(
                await usdcToken.getAddress(),
                treasuryUSDCBalance,
                await owner.getAddress()
            );

            const finalOwnerBalance = await usdcToken.balanceOf(await owner.getAddress());
            expect(finalOwnerBalance).to.equal(initialOwnerBalance + treasuryUSDCBalance);
        });

        it("Should prevent withdrawing LDAO tokens through regular withdraw", async function () {
            const ldaoBalance = await ldaoToken.balanceOf(await treasury.getAddress());

            await expect(
                treasury.withdrawToken(
                    await ldaoToken.getAddress(),
                    ldaoBalance,
                    await owner.getAddress()
                )
            ).to.be.revertedWith("Cannot withdraw LDAO");
        });

        it("Should allow emergency LDAO withdrawal", async function () {
            const ldaoBalance = await ldaoToken.balanceOf(await treasury.getAddress());
            const initialOwnerBalance = await ldaoToken.balanceOf(await owner.getAddress());

            await treasury.emergencyWithdrawLDAO(ldaoBalance, await owner.getAddress());

            const finalOwnerBalance = await ldaoToken.balanceOf(await owner.getAddress());
            expect(finalOwnerBalance).to.equal(initialOwnerBalance + ldaoBalance);
        });
    });

    describe("View Functions", function () {
        it("Should return correct treasury balances", async function () {
            const balances = await treasury.getTreasuryBalance();
            
            expect(balances.ldaoBalance).to.equal(await ldaoToken.balanceOf(await treasury.getAddress()));
            expect(balances.ethBalance).to.equal(await ethers.provider.getBalance(await treasury.getAddress()));
            expect(balances.usdcBalance).to.equal(await usdcToken.balanceOf(await treasury.getAddress()));
        });

        it("Should return correct user purchase history", async function () {
            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");

            await treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue });

            const history = await treasury.getUserPurchaseHistory(await user1.getAddress());
            expect(history).to.equal(ldaoAmount);
        });

        it("Should return correct pricing quotes", async function () {
            const ldaoAmount = ethers.parseEther("150000"); // 150k LDAO (5% discount)
            const quote = await treasury.getQuote(ldaoAmount);

            expect(quote.discount).to.equal(500); // 5% discount in basis points
            expect(quote.usdAmount).to.be.greaterThan(0);
            expect(quote.ethAmount).to.be.greaterThan(0);
            expect(quote.usdcAmount).to.be.greaterThan(0);
        });

        it("Should return circuit breaker status", async function () {
            const status = await treasury.getCircuitBreakerStatus();
            
            expect(status.dailyLimit).to.equal(await treasury.dailyPurchaseLimit());
            expect(status.emergencyThreshold).to.equal(await treasury.emergencyStopThreshold());
            expect(status.currentVolume).to.equal(await treasury.getCurrentDayPurchases());
        });
    });

    describe("Edge Cases and Error Conditions", function () {
        it("Should handle zero amount purchases", async function () {
            await expect(
                treasury.connect(user1).purchaseWithETH(0, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Below minimum purchase");
        });

        it("Should handle insufficient ETH sent", async function () {
            const ldaoAmount = ethers.parseEther("1000");
            const insufficientETH = ethers.parseEther("0.001");

            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: insufficientETH })
            ).to.be.revertedWith("Insufficient ETH sent");
        });

        it("Should handle treasury running out of LDAO tokens", async function () {
            // Withdraw all LDAO tokens from treasury
            const treasuryBalance = await ldaoToken.balanceOf(await treasury.getAddress());
            await treasury.emergencyWithdrawLDAO(treasuryBalance, await owner.getAddress());

            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");

            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue })
            ).to.be.revertedWith("LDAO transfer failed");
        });

        it("Should handle invalid pricing tier parameters", async function () {
            await expect(
                treasury.addPricingTier(ethers.parseEther("1000"), 6000) // 60% discount (too high)
            ).to.be.revertedWith("Discount cannot exceed 50%");
        });
    });

    describe("Gas Optimization", function () {
        it("Should have reasonable gas costs for purchases", async function () {
            const ldaoAmount = ethers.parseEther("1000");
            const ethValue = ethers.parseEther("1");

            const tx = await treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue });
            const receipt = await tx.wait();

            // Gas should be reasonable (less than 200k gas)
            expect(receipt!.gasUsed).to.be.lessThan(200000);
        });

        it("Should batch operations efficiently", async function () {
            const users = [await user1.getAddress(), await user2.getAddress(), await user3.getAddress()];
            
            const tx = await treasury.batchUpdateKYC(users, true);
            const receipt = await tx.wait();

            // Batch operation should be more efficient than individual calls
            expect(receipt!.gasUsed).to.be.lessThan(150000);
        });
    });
});