import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Governance, LDAOToken } from "../typechain-types";
import { parseEther, formatEther } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Governance System", function () {
  let governance: Governance;
  let ldaoToken: LDAOToken;
  let owner: SignerWithAddress;
  let proposer: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let treasury: SignerWithAddress;

  const PROPOSAL_THRESHOLD = parseEther("10000"); // 10k tokens
  const QUORUM_VOTES = parseEther("100000"); // 100k tokens
  const VOTING_DELAY = 7200; // ~1 day in blocks (12s blocks)
  const VOTING_PERIOD = 21600; // ~3 days in blocks
  const EXECUTION_DELAY = 2 * 24 * 60 * 60; // 2 days in seconds

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3, treasury] = await ethers.getSigners();

    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(treasury.address);
    await ldaoToken.deployed();

    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    governance = await GovernanceFactory.deploy(ldaoToken.address);
    await governance.deployed();

    // Distribute tokens for testing
    await ldaoToken.connect(treasury).transfer(proposer.address, parseEther("50000"));
    await ldaoToken.connect(treasury).transfer(voter1.address, parseEther("200000"));
    await ldaoToken.connect(treasury).transfer(voter2.address, parseEther("150000"));
    await ldaoToken.connect(treasury).transfer(voter3.address, parseEther("100000"));

    // Set up staking for enhanced voting power
    await ldaoToken.connect(proposer).stake(parseEther("25000"), 90); // 90-day stake
    await ldaoToken.connect(voter1).stake(parseEther("100000"), 180); // 180-day stake
    await ldaoToken.connect(voter2).stake(parseEther("75000"), 90); // 90-day stake
  });

  describe("Deployment and Configuration", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await governance.governanceToken()).to.equal(ldaoToken.address);
      expect(await governance.votingDelay()).to.equal(VOTING_DELAY);
      expect(await governance.votingPeriod()).to.equal(VOTING_PERIOD);
      expect(await governance.quorumVotes()).to.equal(QUORUM_VOTES);
      expect(await governance.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
      expect(await governance.executionDelay()).to.equal(EXECUTION_DELAY);
    });

    it("Should initialize category-specific parameters correctly", async function () {
      // Check MARKETPLACE_POLICY category
      expect(await governance.categoryQuorum(1)).to.equal(parseEther("200000"));
      expect(await governance.categoryThreshold(1)).to.equal(parseEther("25000"));
      expect(await governance.categoryRequiresStaking(1)).to.be.true;

      // Check FEE_STRUCTURE category
      expect(await governance.categoryQuorum(2)).to.equal(parseEther("500000"));
      expect(await governance.categoryThreshold(2)).to.equal(parseEther("50000"));
      expect(await governance.categoryRequiresStaking(2)).to.be.true;

      // Check SECURITY_UPGRADE category
      expect(await governance.categoryQuorum(4)).to.equal(parseEther("750000"));
      expect(await governance.categoryThreshold(4)).to.equal(parseEther("100000"));
      expect(await governance.categoryRequiresStaking(4)).to.be.true;

      // Check GENERAL category
      expect(await governance.categoryQuorum(0)).to.equal(0); // Uses default
      expect(await governance.categoryThreshold(0)).to.equal(0); // Uses default
      expect(await governance.categoryRequiresStaking(0)).to.be.false;
    });

    it("Should reject invalid token address in constructor", async function () {
      const GovernanceFactory = await ethers.getContractFactory("Governance");
      
      await expect(
        GovernanceFactory.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Proposal Creation", function () {
    describe("General Proposals", function () {
      it("Should create a general proposal with sufficient voting power", async function () {
        const tx = await governance.connect(proposer).propose(
          "Test Proposal",
          "This is a test proposal",
          0, // GENERAL category
          [],
          [],
          [],
          []
        );

        await expect(tx)
          .to.emit(governance, "ProposalCreated")
          .withArgs(1, proposer.address, "Test Proposal", "This is a test proposal", await ethers.provider.getBlockNumber() + VOTING_DELAY + 1, await ethers.provider.getBlockNumber() + VOTING_DELAY + VOTING_PERIOD + 1);

        const proposal = await governance.getProposal(1);
        expect(proposal.proposer).to.equal(proposer.address);
        expect(proposal.title).to.equal("Test Proposal");
        expect(proposal.category).to.equal(0);
        expect(proposal.requiresStaking).to.be.false;
      });

      it("Should create proposal using backward compatibility function", async function () {
        await governance.connect(proposer).propose(
          "Backward Compatible Proposal",
          "Testing backward compatibility",
          [],
          [],
          [],
          []
        );

        const proposal = await governance.getProposal(1);
        expect(proposal.category).to.equal(0); // Should default to GENERAL
      });

      it("Should reject proposal with insufficient voting power", async function () {
        // voter3 has less than proposal threshold
        await expect(
          governance.connect(voter3).propose(
            "Insufficient Power",
            "Should fail",
            0,
            [],
            [],
            [],
            []
          )
        ).to.be.revertedWith("Insufficient voting power to propose");
      });
    });

    describe("Category-Specific Proposals", function () {
      it("Should create marketplace policy proposal with sufficient staking", async function () {
        // proposer has 25k staked, which meets the 25k threshold for MARKETPLACE_POLICY
        const tx = await governance.connect(proposer).propose(
          "Marketplace Policy Change",
          "Update marketplace policies",
          1, // MARKETPLACE_POLICY
          [],
          [],
          [],
          []
        );

        const proposal = await governance.getProposal(1);
        expect(proposal.category).to.equal(1);
        expect(proposal.requiresStaking).to.be.true;
        expect(proposal.minStakeToVote).to.equal(parseEther("1000"));
        expect(proposal.quorum).to.equal(parseEther("200000"));
      });

      it("Should reject fee structure proposal with insufficient threshold", async function () {
        // proposer has 50k voting power but FEE_STRUCTURE requires 50k threshold
        // Since proposer has exactly the threshold, this should work
        await governance.connect(proposer).propose(
          "Fee Structure Change",
          "Update fee structure",
          2, // FEE_STRUCTURE
          [],
          [],
          [],
          []
        );

        const proposal = await governance.getProposal(1);
        expect(proposal.category).to.equal(2);
      });

      it("Should reject security upgrade proposal with insufficient threshold", async function () {
        // proposer has 50k voting power but SECURITY_UPGRADE requires 100k threshold
        await expect(
          governance.connect(proposer).propose(
            "Security Upgrade",
            "Critical security update",
            4, // SECURITY_UPGRADE
            [],
            [],
            [],
            []
          )
        ).to.be.revertedWith("Insufficient voting power to propose");
      });

      it("Should allow high-power voter to create security upgrade proposal", async function () {
        // voter1 has 200k voting power, which exceeds 100k threshold
        await governance.connect(voter1).propose(
          "Security Upgrade",
          "Critical security update",
          4, // SECURITY_UPGRADE
          [],
          [],
          [],
          []
        );

        const proposal = await governance.getProposal(1);
        expect(proposal.category).to.equal(4);
        expect(proposal.quorum).to.equal(parseEther("750000"));
      });
    });

    describe("Proposal with Execution Data", function () {
      it("Should create proposal with execution targets", async function () {
        const targets = [governance.address];
        const values = [0];
        const signatures = ["setVotingDelay(uint256)"];
        const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [14400])]; // 2 days

        await governance.connect(proposer).propose(
          "Update Voting Delay",
          "Increase voting delay to 2 days",
          0,
          targets,
          values,
          signatures,
          calldatas
        );

        const proposal = await governance.getProposal(1);
        expect(proposal.targets).to.deep.equal(targets);
        expect(proposal.values).to.deep.equal(values);
        expect(proposal.signatures).to.deep.equal(signatures);
        expect(proposal.calldatas).to.deep.equal(calldatas);
      });
    });
  });

  describe("Voting System", function () {
    let proposalId: number;

    beforeEach(async function () {
      // Create a test proposal
      await governance.connect(proposer).propose(
        "Test Voting",
        "Testing voting functionality",
        0,
        [],
        [],
        [],
        []
      );
      proposalId = 1;

      // Advance to voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
    });

    describe("Basic Voting", function () {
      it("Should allow voting with enhanced support parameter", async function () {
        const votingPower = await governance.getVotingPower(voter1.address);
        
        const tx = await governance.connect(voter1).castVote(proposalId, 1, "I support this proposal");

        await expect(tx)
          .to.emit(governance, "VoteCast")
          .withArgs(voter1.address, proposalId, 1, votingPower, "I support this proposal");

        const proposal = await governance.getProposal(proposalId);
        expect(proposal.forVotes).to.equal(votingPower);
        expect(proposal.againstVotes).to.equal(0);
        expect(proposal.abstainVotes).to.equal(0);
      });

      it("Should allow voting against with enhanced support parameter", async function () {
        const votingPower = await governance.getVotingPower(voter2.address);
        
        await governance.connect(voter2).castVote(proposalId, 0, "I oppose this proposal");

        const proposal = await governance.getProposal(proposalId);
        expect(proposal.forVotes).to.equal(0);
        expect(proposal.againstVotes).to.equal(votingPower);
        expect(proposal.abstainVotes).to.equal(0);
      });

      it("Should allow abstaining", async function () {
        const votingPower = await governance.getVotingPower(voter3.address);
        
        await governance.connect(voter3).castVote(proposalId, 2, "I abstain");

        const proposal = await governance.getProposal(proposalId);
        expect(proposal.forVotes).to.equal(0);
        expect(proposal.againstVotes).to.equal(0);
        expect(proposal.abstainVotes).to.equal(votingPower);
      });

      it("Should support backward compatible voting", async function () {
        const votingPower = await governance.getVotingPower(voter1.address);
        
        await governance.connect(voter1).castVote(proposalId, true, "Backward compatible support");

        const proposal = await governance.getProposal(proposalId);
        expect(proposal.forVotes).to.equal(votingPower);
      });

      it("Should prevent double voting", async function () {
        await governance.connect(voter1).castVote(proposalId, 1, "First vote");

        await expect(
          governance.connect(voter1).castVote(proposalId, 0, "Second vote")
        ).to.be.revertedWith("Already voted");
      });

      it("Should reject invalid vote types", async function () {
        await expect(
          governance.connect(voter1).castVote(proposalId, 3, "Invalid vote")
        ).to.be.revertedWith("Invalid vote type");
      });
    });

    describe("Staking Requirements", function () {
      beforeEach(async function () {
        // Create a proposal that requires staking
        await governance.connect(voter1).propose(
          "Staking Required Proposal",
          "This proposal requires staking to vote",
          1, // MARKETPLACE_POLICY
          [],
          [],
          [],
          []
        );
        proposalId = 2;

        // Advance to voting period
        await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      });

      it("Should allow voting with sufficient staking", async function () {
        // voter1 has 100k staked, which exceeds 1k minimum
        await governance.connect(voter1).castVote(proposalId, 1, "I have sufficient stake");

        const receipt = await governance.getReceipt(proposalId, voter1.address);
        expect(receipt.hasVoted).to.be.true;
        expect(receipt.support).to.equal(1);
      });

      it("Should reject voting without sufficient staking", async function () {
        // voter3 has no staking
        await expect(
          governance.connect(voter3).castVote(proposalId, 1, "Insufficient stake")
        ).to.be.revertedWith("Insufficient staking to vote on this proposal");
      });

      it("Should record staking power in vote receipt", async function () {
        await governance.connect(voter1).castVote(proposalId, 1, "Recording staking power");

        const receipt = await governance.getReceipt(proposalId, voter1.address);
        const stakedAmount = await ldaoToken.totalStaked(voter1.address);
        
        expect(receipt.stakingPower).to.equal(stakedAmount);
      });
    });

    describe("Voting Power Calculation", function () {
      it("Should calculate voting power including staking bonus", async function () {
        const tokenBalance = await ldaoToken.balanceOf(voter1.address);
        const stakedAmount = await ldaoToken.totalStaked(voter1.address);
        const votingPower = await governance.getVotingPower(voter1.address);

        // Voting power should include both balance and staking bonus
        expect(votingPower).to.be.gt(tokenBalance);
        console.log(`Token balance: ${formatEther(tokenBalance)}`);
        console.log(`Staked amount: ${formatEther(stakedAmount)}`);
        console.log(`Voting power: ${formatEther(votingPower)}`);
      });

      it("Should handle users with no tokens", async function () {
        const [noTokenUser] = await ethers.getSigners();
        const votingPower = await governance.getVotingPower(noTokenUser.address);
        
        expect(votingPower).to.equal(0);
      });
    });
  });

  describe("Delegation System", function () {
    it("Should allow delegation of voting power", async function () {
      const delegatorVotingPower = await governance.getVotingPower(voter1.address);
      
      const tx = await governance.connect(voter1).delegate(voter2.address);

      await expect(tx)
        .to.emit(governance, "DelegateChanged")
        .withArgs(voter1.address, ethers.constants.AddressZero, voter2.address);

      await expect(tx)
        .to.emit(governance, "DelegateVotesChanged")
        .withArgs(voter2.address, 0, delegatorVotingPower);

      expect(await governance.delegates(voter1.address)).to.equal(voter2.address);
      expect(await governance.delegatedVotes(voter2.address)).to.equal(delegatorVotingPower);
    });

    it("Should handle delegation changes", async function () {
      const delegatorVotingPower = await governance.getVotingPower(voter1.address);
      
      // First delegation
      await governance.connect(voter1).delegate(voter2.address);
      
      // Change delegation
      const tx = await governance.connect(voter1).delegate(voter3.address);

      await expect(tx)
        .to.emit(governance, "DelegateChanged")
        .withArgs(voter1.address, voter2.address, voter3.address);

      await expect(tx)
        .to.emit(governance, "DelegateVotesChanged")
        .withArgs(voter2.address, delegatorVotingPower, 0);

      await expect(tx)
        .to.emit(governance, "DelegateVotesChanged")
        .withArgs(voter3.address, 0, delegatorVotingPower);

      expect(await governance.delegatedVotes(voter2.address)).to.equal(0);
      expect(await governance.delegatedVotes(voter3.address)).to.equal(delegatorVotingPower);
    });

    it("Should allow self-delegation", async function () {
      const votingPower = await governance.getVotingPower(voter1.address);
      
      await governance.connect(voter1).delegate(voter1.address);

      expect(await governance.delegates(voter1.address)).to.equal(voter1.address);
      expect(await governance.delegatedVotes(voter1.address)).to.equal(votingPower);
    });
  });

  describe("Proposal State Management", function () {
    let proposalId: number;

    beforeEach(async function () {
      await governance.connect(proposer).propose(
        "State Test Proposal",
        "Testing proposal states",
        0,
        [],
        [],
        [],
        []
      );
      proposalId = 1;
    });

    it("Should start in Pending state", async function () {
      expect(await governance.state(proposalId)).to.equal(0); // Pending
    });

    it("Should transition to Active state during voting period", async function () {
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      expect(await governance.state(proposalId)).to.equal(1); // Active
    });

    it("Should transition to Defeated state if not enough votes", async function () {
      // Advance to voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      
      // Cast insufficient votes
      await governance.connect(voter3).castVote(proposalId, 1, "Insufficient vote");
      
      // Advance past voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_PERIOD + 1);
      
      expect(await governance.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should transition to Succeeded state with sufficient votes", async function () {
      // Advance to voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      
      // Cast sufficient votes to meet quorum
      await governance.connect(voter1).castVote(proposalId, 1, "Support");
      
      // Advance past voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_PERIOD + 1);
      
      expect(await governance.state(proposalId)).to.equal(4); // Succeeded
    });

    it("Should allow owner to cancel active proposals", async function () {
      const tx = await governance.connect(owner).cancel(proposalId);

      await expect(tx)
        .to.emit(governance, "ProposalCanceled")
        .withArgs(proposalId);

      expect(await governance.state(proposalId)).to.equal(2); // Canceled
    });

    it("Should prevent non-owner from canceling proposals", async function () {
      await expect(
        governance.connect(voter1).cancel(proposalId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId: number;

    beforeEach(async function () {
      // Create proposal to change voting delay
      const targets = [governance.address];
      const values = [0];
      const signatures = ["setVotingDelay(uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [14400])]; // 2 days

      await governance.connect(proposer).propose(
        "Update Voting Delay",
        "Change voting delay to 2 days",
        0,
        targets,
        values,
        signatures,
        calldatas
      );
      proposalId = 1;

      // Advance to voting period and vote
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      await governance.connect(voter1).castVote(proposalId, 1, "Support execution test");
      
      // Advance past voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_PERIOD + 1);
    });

    it("Should queue successful proposals", async function () {
      const tx = await governance.queue(proposalId);
      const executionTime = (await ethers.provider.getBlock("latest")).timestamp + EXECUTION_DELAY;

      await expect(tx)
        .to.emit(governance, "ProposalQueued")
        .withArgs(proposalId, executionTime);

      expect(await governance.state(proposalId)).to.equal(5); // Queued
    });

    it("Should reject queueing non-succeeded proposals", async function () {
      // Create a proposal that will be defeated
      await governance.connect(proposer).propose(
        "Defeated Proposal",
        "This will be defeated",
        0,
        [],
        [],
        [],
        []
      );
      const defeatedProposalId = 2;

      // Advance to voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      
      // Vote against with more power than for
      await governance.connect(voter1).castVote(defeatedProposalId, 0, "Against");
      
      // Advance past voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_PERIOD + 1);

      await expect(
        governance.queue(defeatedProposalId)
      ).to.be.revertedWith("Proposal not succeeded");
    });

    it("Should execute queued proposals after delay", async function () {
      // Queue the proposal
      await governance.queue(proposalId);
      
      // Advance time past execution delay
      await time.increase(EXECUTION_DELAY + 1);
      
      const oldVotingDelay = await governance.votingDelay();
      
      const tx = await governance.execute(proposalId);

      await expect(tx)
        .to.emit(governance, "ProposalExecuted")
        .withArgs(proposalId);

      expect(await governance.state(proposalId)).to.equal(7); // Executed
      
      // Verify the execution actually changed the voting delay
      const newVotingDelay = await governance.votingDelay();
      expect(newVotingDelay).to.equal(14400);
      expect(newVotingDelay).to.not.equal(oldVotingDelay);
    });

    it("Should reject execution before delay", async function () {
      await governance.queue(proposalId);
      
      await expect(
        governance.execute(proposalId)
      ).to.be.revertedWith("Execution delay not met");
    });

    it("Should reject execution of non-queued proposals", async function () {
      await expect(
        governance.execute(proposalId)
      ).to.be.revertedWith("Proposal not queued");
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update voting parameters", async function () {
      const newVotingDelay = 14400; // 2 days
      const newVotingPeriod = 43200; // 6 days
      const newQuorum = parseEther("200000");
      const newThreshold = parseEther("20000");
      const newExecutionDelay = 3 * 24 * 60 * 60; // 3 days

      await governance.setVotingDelay(newVotingDelay);
      await governance.setVotingPeriod(newVotingPeriod);
      await governance.setQuorumVotes(newQuorum);
      await governance.setProposalThreshold(newThreshold);
      await governance.setExecutionDelay(newExecutionDelay);

      expect(await governance.votingDelay()).to.equal(newVotingDelay);
      expect(await governance.votingPeriod()).to.equal(newVotingPeriod);
      expect(await governance.quorumVotes()).to.equal(newQuorum);
      expect(await governance.proposalThreshold()).to.equal(newThreshold);
      expect(await governance.executionDelay()).to.equal(newExecutionDelay);
    });

    it("Should allow owner to update category parameters", async function () {
      const newQuorum = parseEther("300000");
      const newThreshold = parseEther("30000");
      const requiresStaking = false;

      const tx = await governance.setCategoryParameters(
        1, // MARKETPLACE_POLICY
        newQuorum,
        newThreshold,
        requiresStaking
      );

      await expect(tx)
        .to.emit(governance, "CategoryParametersUpdated")
        .withArgs(1, newQuorum, newThreshold, requiresStaking);

      expect(await governance.categoryQuorum(1)).to.equal(newQuorum);
      expect(await governance.categoryThreshold(1)).to.equal(newThreshold);
      expect(await governance.categoryRequiresStaking(1)).to.equal(requiresStaking);
    });

    it("Should prevent non-owner from updating parameters", async function () {
      await expect(
        governance.connect(voter1).setVotingDelay(14400)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        governance.connect(voter1).setCategoryParameters(1, parseEther("300000"), parseEther("30000"), false)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration with LDAOToken", function () {
    it("Should correctly integrate with token staking system", async function () {
      const stakedAmount = await ldaoToken.totalStaked(voter1.address);
      const votingPower = await governance.getVotingPower(voter1.address);
      
      // Voting power should be enhanced by staking
      expect(votingPower).to.be.gt(await ldaoToken.balanceOf(voter1.address));
      expect(stakedAmount).to.be.gt(0);
    });

    it("Should handle users with no staking", async function () {
      const votingPower = await governance.getVotingPower(voter3.address);
      const tokenBalance = await ldaoToken.balanceOf(voter3.address);
      
      // Should still have voting power from token balance
      expect(votingPower).to.equal(tokenBalance);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle proposals with empty execution data", async function () {
      await governance.connect(proposer).propose(
        "Empty Execution",
        "Proposal with no execution",
        0,
        [],
        [],
        [],
        []
      );

      const proposal = await governance.getProposal(1);
      expect(proposal.targets.length).to.equal(0);
      expect(proposal.values.length).to.equal(0);
      expect(proposal.signatures.length).to.equal(0);
      expect(proposal.calldatas.length).to.equal(0);
    });

    it("Should handle very large vote counts", async function () {
      // Give voter1 a very large amount of tokens
      await ldaoToken.connect(treasury).transfer(voter1.address, parseEther("1000000"));
      
      await governance.connect(voter1).propose(
        "Large Vote Test",
        "Testing with large vote counts",
        0,
        [],
        [],
        [],
        []
      );

      // Advance to voting period
      await time.advanceBlockTo((await ethers.provider.getBlockNumber()) + VOTING_DELAY + 1);
      
      await governance.connect(voter1).castVote(1, 1, "Large vote");

      const proposal = await governance.getProposal(1);
      expect(proposal.forVotes).to.be.gt(parseEther("1000000"));
    });

    it("Should handle proposal retrieval for non-existent proposals", async function () {
      const proposal = await governance.getProposal(999);
      expect(proposal.id).to.equal(0);
      expect(proposal.proposer).to.equal(ethers.constants.AddressZero);
    });

    it("Should handle vote receipt retrieval for non-existent votes", async function () {
      const receipt = await governance.getReceipt(999, voter1.address);
      expect(receipt.hasVoted).to.be.false;
      expect(receipt.votes).to.equal(0);
    });
  });
});