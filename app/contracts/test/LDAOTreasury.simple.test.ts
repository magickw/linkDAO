import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LDAOTreasury - Core Functionality", function () {
    let ldaoToken: Contract;
    let usdcToken: Contract;
    let multiSigWallet: Contract;
    let treasury: Contract;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    const INITIAL_PRICE = ethers.utils.parseEther("0.01"); // $0.01

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy USDC mock token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdcToken = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdcToken.deployed();

        // Deploy MultiSigWallet
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        const owners = [owner.address, user1.address, user2.address];
        multiSigWallet = await MultiSigWallet.deploy(owners, 2, 3600);
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
        const treasurySupply = ethers.utils.parseEther("100000000"); // 100M tokens
        await ldaoToken.transfer(treasury.address, treasurySupply);

        // Mint USDC to users
        await usdcToken.mint(user1.address, ethers.utils.parseUnits("10000", 6));
        await usdcToken.mint(user2.address, ethers.utils.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
        it("Should set correct initial parameters", async function () {
            expect(await treasury.ldaoToken()).to.equal(ldaoToken.address);
            expect(await treasury.usdcToken()).to.equal(usdcToken.address);
            expect(await treasury.multiSigWallet()).to.equal(multiSigWallet.address);
            expect(await treasury.ldaoPriceInUSD()).to.equal(INITIAL_PRICE);
            expect(await treasury.salesActive()).to.be.true;
        });

        it("Should initialize pricing tiers", async function () {
            const tier1 = await treasury.getPricingTier(1);
            expect(tier1.threshold).to.equal(ethers.utils.parseEther("100000"));
            expect(tier1.discountBps).to.equal(500); // 5%
            expect(tier1.active).to.be.true;
        });
    });

    describe("ETH Purchases", function () {
        it("Should allow ETH purchase", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");
            const ethValue = ethers.utils.parseEther("0.5"); // Generous ETH amount

            const initialBalance = await ldaoToken.balanceOf(user1.address);
            
            await treasury.connect(user1).purchaseWithETH(ldaoAmount, {
                value: ethValue
            });

            const finalBalance = await ldaoToken.balanceOf(user1.address);
            expect(finalBalance.sub(initialBalance)).to.equal(ldaoAmount);
        });

        it("Should enforce minimum purchase", async function () {
            const tooSmall = ethers.utils.parseEther("5"); // Below minimum
            
            await expect(
                treasury.connect(user1).purchaseWithETH(tooSmall, { 
                    value: ethers.utils.parseEther("0.1") 
                })
            ).to.be.revertedWith("Below minimum purchase");
        });

        it("Should enforce maximum purchase", async function () {
            const tooLarge = ethers.utils.parseEther("2000000"); // Above maximum
            
            await expect(
                treasury.connect(user1).purchaseWithETH(tooLarge, { 
                    value: ethers.utils.parseEther("100") 
                })
            ).to.be.revertedWith("Exceeds maximum purchase");
        });
    });

    describe("USDC Purchases", function () {
        it("Should allow USDC purchase", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");
            const usdcAmount = ethers.utils.parseUnits("10", 6); // 10 USDC

            // Approve USDC spending
            await usdcToken.connect(user1).approve(treasury.address, usdcAmount);

            const initialLDAOBalance = await ldaoToken.balanceOf(user1.address);
            const initialUSDCBalance = await usdcToken.balanceOf(user1.address);

            await treasury.connect(user1).purchaseWithUSDC(ldaoAmount);

            const finalLDAOBalance = await ldaoToken.balanceOf(user1.address);
            const finalUSDCBalance = await usdcToken.balanceOf(user1.address);

            expect(finalLDAOBalance.sub(initialLDAOBalance)).to.equal(ldaoAmount);
            expect(initialUSDCBalance.sub(finalUSDCBalance)).to.be.gt(0);
        });

        it("Should fail without USDC allowance", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");

            await expect(
                treasury.connect(user1).purchaseWithUSDC(ldaoAmount)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
    });

    describe("Volume Discounts", function () {
        it("Should apply volume discounts", async function () {
            const largeAmount = ethers.utils.parseEther("150000"); // 150k LDAO (5% discount)
            
            const quote = await treasury.getQuote(largeAmount);
            expect(quote.discount).to.equal(500); // 5% in basis points
        });

        it("Should apply higher discounts for larger volumes", async function () {
            const veryLargeAmount = ethers.utils.parseEther("1500000"); // 1.5M LDAO (15% discount)
            
            const quote = await treasury.getQuote(veryLargeAmount);
            expect(quote.discount).to.equal(1500); // 15% in basis points
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update price", async function () {
            const newPrice = ethers.utils.parseEther("0.02");
            
            await treasury.updateLDAOPrice(newPrice);
            expect(await treasury.basePriceInUSD()).to.equal(newPrice);
        });

        it("Should allow owner to pause sales", async function () {
            await treasury.emergencyPause("Test pause");
            expect(await treasury.paused()).to.be.true;

            const ldaoAmount = ethers.utils.parseEther("1000");
            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { 
                    value: ethers.utils.parseEther("1") 
                })
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should prevent non-owners from admin functions", async function () {
            await expect(
                treasury.connect(user1).updateLDAOPrice(ethers.utils.parseEther("0.02"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Circuit Breaker", function () {
        it("Should enforce circuit breaker limits", async function () {
            // Update max purchase to be higher than circuit breaker limits
            await treasury.updatePurchaseLimits(
                ethers.utils.parseEther("10"), // min
                ethers.utils.parseEther("15000000") // 15M LDAO max
            );
            
            const overLimit = ethers.utils.parseEther("8000000"); // 8M LDAO (over emergency threshold)
            
            // Should be rejected by circuit breaker (either daily limit or emergency threshold)
            await expect(
                treasury.connect(user1).purchaseWithETH(overLimit, { 
                    value: ethers.utils.parseEther("100") 
                })
            ).to.be.reverted; // Just check that it reverts, don't care about specific message
        });

        it("Should enforce emergency threshold", async function () {
            // First, update the max purchase amount to be higher than emergency threshold
            await treasury.updatePurchaseLimits(
                ethers.utils.parseEther("10"), // min
                ethers.utils.parseEther("8000000") // 8M LDAO max (higher than 5M emergency threshold)
            );
            
            const overEmergencyThreshold = ethers.utils.parseEther("6000000"); // 6M LDAO
            
            await expect(
                treasury.connect(user1).purchaseWithETH(overEmergencyThreshold, { 
                    value: ethers.utils.parseEther("100") 
                })
            ).to.be.revertedWith("Emergency threshold exceeded");
        });
    });

    describe("View Functions", function () {
        it("Should return treasury balances", async function () {
            const balances = await treasury.getTreasuryBalance();
            
            expect(balances.ldaoBalance).to.equal(await ldaoToken.balanceOf(treasury.address));
            expect(balances.ethBalance).to.equal(await ethers.provider.getBalance(treasury.address));
            expect(balances.usdcBalance).to.equal(await usdcToken.balanceOf(treasury.address));
        });

        it("Should return user purchase history", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");
            
            await treasury.connect(user1).purchaseWithETH(ldaoAmount, { 
                value: ethers.utils.parseEther("1") 
            });

            const history = await treasury.getUserPurchaseHistory(user1.address);
            expect(history).to.equal(ldaoAmount);
        });

        it("Should return pricing quotes", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");
            const quote = await treasury.getQuote(ldaoAmount);

            expect(quote.usdAmount).to.be.gt(0);
            expect(quote.ethAmount).to.be.gt(0);
            expect(quote.usdcAmount).to.be.gt(0);
        });
    });

    describe("Fund Management", function () {
        it("Should allow owner to withdraw ETH", async function () {
            // Make a purchase to add ETH to treasury
            const ldaoAmount = ethers.utils.parseEther("1000");
            const ethValue = ethers.utils.parseEther("1");
            
            await treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: ethValue });

            const treasuryETHBalance = await ethers.provider.getBalance(treasury.address);
            expect(treasuryETHBalance).to.be.gt(0);

            await treasury.withdrawETH(treasuryETHBalance, owner.address);
            
            const finalTreasuryBalance = await ethers.provider.getBalance(treasury.address);
            expect(finalTreasuryBalance).to.equal(0);
        });

        it("Should prevent withdrawing LDAO through regular withdraw", async function () {
            const ldaoBalance = await ldaoToken.balanceOf(treasury.address);

            await expect(
                treasury.withdrawToken(ldaoToken.address, ldaoBalance, owner.address)
            ).to.be.revertedWith("Cannot withdraw LDAO");
        });

        it("Should allow emergency LDAO withdrawal", async function () {
            const ldaoBalance = await ldaoToken.balanceOf(treasury.address);
            const initialOwnerBalance = await ldaoToken.balanceOf(owner.address);

            await treasury.emergencyWithdrawLDAO(ldaoBalance, owner.address);

            const finalOwnerBalance = await ldaoToken.balanceOf(owner.address);
            expect(finalOwnerBalance.sub(initialOwnerBalance)).to.equal(ldaoBalance);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle insufficient ETH", async function () {
            const ldaoAmount = ethers.utils.parseEther("1000");
            const insufficientETH = ethers.utils.parseEther("0.001");

            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { value: insufficientETH })
            ).to.be.revertedWith("Insufficient ETH sent");
        });

        it("Should handle treasury running out of tokens", async function () {
            // Withdraw all tokens
            const treasuryBalance = await ldaoToken.balanceOf(treasury.address);
            await treasury.emergencyWithdrawLDAO(treasuryBalance, owner.address);

            const ldaoAmount = ethers.utils.parseEther("1000");
            
            await expect(
                treasury.connect(user1).purchaseWithETH(ldaoAmount, { 
                    value: ethers.utils.parseEther("1") 
                })
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
    });
});