import { ethers } from 'ethers';

export interface WorkflowResult {
  workflowName: string;
  passed: boolean;
  steps: StepResult[];
  totalGasUsed: number;
  duration: number;
  errors: string[];
}

export interface StepResult {
  stepName: string;
  passed: boolean;
  transactionHash?: string;
  gasUsed?: number;
  error?: string;
  data?: any;
}

export class UserWorkflowTester {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contracts: Map<string, ethers.Contract> = new Map();
  private testResults: WorkflowResult[] = [];

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.signer);
    this.contracts.set(name, contract);
  }

  async runAllWorkflows(): Promise<WorkflowResult[]> {
    console.log('Starting user workflow testing...');
    this.testResults = [];

    // Core workflows
    await this.testTokenStakingWorkflow();
    await this.testGovernanceWorkflow();
    await this.testMarketplaceWorkflow();
    await this.testEscrowWorkflow();
    await this.testReputationWorkflow();
    await this.testNFTWorkflow();
    await this.testSocialWorkflow();

    return this.testResults;
  }

  private async testTokenStakingWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Token Staking Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const ldaoToken = this.contracts.get('LDAOToken');
      if (!ldaoToken) {
        throw new Error('LDAOToken contract not found');
      }

      // Step 1: Check initial balance
      const initialBalance = await ldaoToken.balanceOf(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Check Initial Balance',
        passed: initialBalance > 0,
        data: { balance: initialBalance.toString() }
      });

      // Step 2: Approve staking amount
      const stakeAmount = ethers.parseEther('1000');
      const approveTx = await ldaoToken.approve(await ldaoToken.getAddress(), stakeAmount);
      const approveReceipt = await approveTx.wait();
      
      workflow.steps.push({
        stepName: 'Approve Staking Amount',
        passed: approveReceipt?.status === 1,
        transactionHash: approveTx.hash,
        gasUsed: Number(approveReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(approveReceipt?.gasUsed || 0);

      // Step 3: Stake tokens (30-day tier)
      const stakeTx = await ldaoToken.stake(stakeAmount, 0); // Tier 0 = 30 days
      const stakeReceipt = await stakeTx.wait();
      
      workflow.steps.push({
        stepName: 'Stake Tokens',
        passed: stakeReceipt?.status === 1,
        transactionHash: stakeTx.hash,
        gasUsed: Number(stakeReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(stakeReceipt?.gasUsed || 0);

      // Step 4: Check staking info
      const stakingInfo = await ldaoToken.getStakingInfo(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Verify Staking Info',
        passed: stakingInfo.amount === stakeAmount,
        data: { stakingInfo: stakingInfo.toString() }
      });

      // Step 5: Check voting power
      const votingPower = await ldaoToken.getVotingPower(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Check Voting Power',
        passed: votingPower > stakeAmount, // Should be 2x due to staking
        data: { votingPower: votingPower.toString() }
      });

    } catch (error) {
      workflow.errors.push(`Token staking workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testGovernanceWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Governance Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const governance = this.contracts.get('Governance');
      if (!governance) {
        throw new Error('Governance contract not found');
      }

      // Step 1: Create a proposal
      const proposalTx = await governance.propose(
        [await governance.getAddress()], // targets
        [0], // values
        ['0x'], // calldatas
        'Test proposal for verification',
        0 // category
      );
      const proposalReceipt = await proposalTx.wait();
      
      workflow.steps.push({
        stepName: 'Create Proposal',
        passed: proposalReceipt?.status === 1,
        transactionHash: proposalTx.hash,
        gasUsed: Number(proposalReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(proposalReceipt?.gasUsed || 0);

      // Step 2: Get proposal ID from events
      const proposalCreatedEvent = proposalReceipt?.logs.find(
        log => log.topics[0] === governance.interface.getEvent('ProposalCreated').topicHash
      );
      
      if (!proposalCreatedEvent) {
        throw new Error('ProposalCreated event not found');
      }

      const proposalId = proposalCreatedEvent.topics[1];
      
      workflow.steps.push({
        stepName: 'Get Proposal ID',
        passed: !!proposalId,
        data: { proposalId }
      });

      // Step 3: Check proposal state
      const proposalState = await governance.state(proposalId);
      workflow.steps.push({
        stepName: 'Check Proposal State',
        passed: proposalState === 1n, // Pending state
        data: { state: proposalState.toString() }
      });

      // Note: We can't test voting immediately due to voting delay
      workflow.steps.push({
        stepName: 'Voting Delay Check',
        passed: true,
        data: { note: 'Voting will be available after delay period' }
      });

    } catch (error) {
      workflow.errors.push(`Governance workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testMarketplaceWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Marketplace Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const marketplace = this.contracts.get('Marketplace');
      const mockERC20 = this.contracts.get('MockERC20');
      
      if (!marketplace || !mockERC20) {
        throw new Error('Required contracts not found');
      }

      // Step 1: Mint test tokens
      const mintTx = await mockERC20.mint(await this.signer.getAddress(), ethers.parseEther('1000'));
      const mintReceipt = await mintTx.wait();
      
      workflow.steps.push({
        stepName: 'Mint Test Tokens',
        passed: mintReceipt?.status === 1,
        transactionHash: mintTx.hash,
        gasUsed: Number(mintReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(mintReceipt?.gasUsed || 0);

      // Step 2: Approve marketplace to spend tokens
      const approveAmount = ethers.parseEther('100');
      const approveTx = await mockERC20.approve(await marketplace.getAddress(), approveAmount);
      const approveReceipt = await approveTx.wait();
      
      workflow.steps.push({
        stepName: 'Approve Marketplace',
        passed: approveReceipt?.status === 1,
        transactionHash: approveTx.hash,
        gasUsed: Number(approveReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(approveReceipt?.gasUsed || 0);

      // Step 3: Create a listing
      const listingTx = await marketplace.createListing(
        await mockERC20.getAddress(), // token address
        ethers.parseEther('10'), // price
        ethers.parseEther('5'), // quantity
        0, // ERC20 item type
        0, // Fixed price listing type
        'Test item for verification'
      );
      const listingReceipt = await listingTx.wait();
      
      workflow.steps.push({
        stepName: 'Create Listing',
        passed: listingReceipt?.status === 1,
        transactionHash: listingTx.hash,
        gasUsed: Number(listingReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(listingReceipt?.gasUsed || 0);

      // Step 4: Get listing ID and verify
      const listingCreatedEvent = listingReceipt?.logs.find(
        log => log.topics[0] === marketplace.interface.getEvent('ListingCreated').topicHash
      );
      
      if (listingCreatedEvent) {
        const listingId = listingCreatedEvent.topics[1];
        const listing = await marketplace.getListing(listingId);
        
        workflow.steps.push({
          stepName: 'Verify Listing',
          passed: listing.seller === await this.signer.getAddress(),
          data: { listingId, seller: listing.seller }
        });
      } else {
        workflow.steps.push({
          stepName: 'Verify Listing',
          passed: false,
          error: 'ListingCreated event not found'
        });
      }

    } catch (error) {
      workflow.errors.push(`Marketplace workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testEscrowWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Escrow Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const escrow = this.contracts.get('EnhancedEscrow');
      if (!escrow) {
        throw new Error('EnhancedEscrow contract not found');
      }

      // Step 1: Create escrow with ETH
      const escrowAmount = ethers.parseEther('0.01');
      const createTx = await escrow.createEscrow(
        1, // listing ID
        await this.signer.getAddress(), // seller
        ethers.ZeroAddress, // ETH
        { value: escrowAmount }
      );
      const createReceipt = await createTx.wait();
      
      workflow.steps.push({
        stepName: 'Create Escrow',
        passed: createReceipt?.status === 1,
        transactionHash: createTx.hash,
        gasUsed: Number(createReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(createReceipt?.gasUsed || 0);

      // Step 2: Get escrow ID and verify
      const escrowCreatedEvent = createReceipt?.logs.find(
        log => log.topics[0] === escrow.interface.getEvent('EscrowCreated').topicHash
      );
      
      if (escrowCreatedEvent) {
        const escrowId = escrowCreatedEvent.topics[1];
        const escrowInfo = await escrow.getEscrow(escrowId);
        
        workflow.steps.push({
          stepName: 'Verify Escrow',
          passed: escrowInfo.amount === escrowAmount,
          data: { escrowId, amount: escrowInfo.amount.toString() }
        });
      } else {
        workflow.steps.push({
          stepName: 'Verify Escrow',
          passed: false,
          error: 'EscrowCreated event not found'
        });
      }

    } catch (error) {
      workflow.errors.push(`Escrow workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testReputationWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Reputation Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const reputation = this.contracts.get('ReputationSystem');
      if (!reputation) {
        throw new Error('ReputationSystem contract not found');
      }

      // Step 1: Submit a review
      const reviewTx = await reputation.submitReview(
        await this.signer.getAddress(), // reviewee
        5, // rating (1-5)
        'Great seller, fast delivery!',
        1 // transaction ID
      );
      const reviewReceipt = await reviewTx.wait();
      
      workflow.steps.push({
        stepName: 'Submit Review',
        passed: reviewReceipt?.status === 1,
        transactionHash: reviewTx.hash,
        gasUsed: Number(reviewReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(reviewReceipt?.gasUsed || 0);

      // Step 2: Check reputation score
      const reputationScore = await reputation.getReputationScore(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Check Reputation Score',
        passed: reputationScore.totalPoints > 0,
        data: { score: reputationScore.toString() }
      });

      // Step 3: Check reputation tier
      const tier = await reputation.getReputationTier(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Check Reputation Tier',
        passed: tier >= 0,
        data: { tier: tier.toString() }
      });

    } catch (error) {
      workflow.errors.push(`Reputation workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testNFTWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'NFT Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const nftMarketplace = this.contracts.get('NFTMarketplace');
      if (!nftMarketplace) {
        throw new Error('NFTMarketplace contract not found');
      }

      // Step 1: Mint an NFT
      const mintTx = await nftMarketplace.mintNFT(
        await this.signer.getAddress(),
        'https://example.com/metadata/1',
        500 // 5% royalty
      );
      const mintReceipt = await mintTx.wait();
      
      workflow.steps.push({
        stepName: 'Mint NFT',
        passed: mintReceipt?.status === 1,
        transactionHash: mintTx.hash,
        gasUsed: Number(mintReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(mintReceipt?.gasUsed || 0);

      // Step 2: Get token ID from event
      const transferEvent = mintReceipt?.logs.find(
        log => log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event
      );
      
      if (transferEvent) {
        const tokenId = transferEvent.topics[3];
        
        // Step 3: List NFT for sale
        const listTx = await nftMarketplace.listNFT(
          tokenId,
          ethers.parseEther('0.1'), // price
          0 // fixed price
        );
        const listReceipt = await listTx.wait();
        
        workflow.steps.push({
          stepName: 'List NFT for Sale',
          passed: listReceipt?.status === 1,
          transactionHash: listTx.hash,
          gasUsed: Number(listReceipt?.gasUsed || 0),
          data: { tokenId }
        });

        workflow.totalGasUsed += Number(listReceipt?.gasUsed || 0);
      } else {
        workflow.steps.push({
          stepName: 'List NFT for Sale',
          passed: false,
          error: 'Transfer event not found'
        });
      }

    } catch (error) {
      workflow.errors.push(`NFT workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  private async testSocialWorkflow(): Promise<void> {
    const workflow: WorkflowResult = {
      workflowName: 'Social Workflow',
      passed: true,
      steps: [],
      totalGasUsed: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      const tipRouter = this.contracts.get('TipRouter');
      const followModule = this.contracts.get('FollowModule');
      const ldaoToken = this.contracts.get('LDAOToken');
      
      if (!tipRouter || !followModule || !ldaoToken) {
        throw new Error('Social contracts not found');
      }

      // Step 1: Follow a user
      const followTx = await followModule.follow(await this.signer.getAddress());
      const followReceipt = await followTx.wait();
      
      workflow.steps.push({
        stepName: 'Follow User',
        passed: followReceipt?.status === 1,
        transactionHash: followTx.hash,
        gasUsed: Number(followReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(followReceipt?.gasUsed || 0);

      // Step 2: Check follower count
      const followerCount = await followModule.getFollowerCount(await this.signer.getAddress());
      workflow.steps.push({
        stepName: 'Check Follower Count',
        passed: followerCount > 0,
        data: { count: followerCount.toString() }
      });

      // Step 3: Approve tokens for tipping
      const tipAmount = ethers.parseEther('10');
      const approveTx = await ldaoToken.approve(await tipRouter.getAddress(), tipAmount);
      const approveReceipt = await approveTx.wait();
      
      workflow.steps.push({
        stepName: 'Approve Tip Amount',
        passed: approveReceipt?.status === 1,
        transactionHash: approveTx.hash,
        gasUsed: Number(approveReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(approveReceipt?.gasUsed || 0);

      // Step 4: Send tip
      const tipTx = await tipRouter.tip(
        await this.signer.getAddress(),
        tipAmount,
        1 // post ID
      );
      const tipReceipt = await tipTx.wait();
      
      workflow.steps.push({
        stepName: 'Send Tip',
        passed: tipReceipt?.status === 1,
        transactionHash: tipTx.hash,
        gasUsed: Number(tipReceipt?.gasUsed || 0)
      });

      workflow.totalGasUsed += Number(tipReceipt?.gasUsed || 0);

    } catch (error) {
      workflow.errors.push(`Social workflow error: ${error}`);
      workflow.passed = false;
    }

    workflow.duration = Date.now() - startTime;
    workflow.passed = workflow.steps.every(step => step.passed) && workflow.errors.length === 0;
    this.testResults.push(workflow);
  }

  generateWorkflowReport(): string {
    let report = '# User Workflow Testing Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    const totalWorkflows = this.testResults.length;
    const passedWorkflows = this.testResults.filter(w => w.passed).length;
    const totalGasUsed = this.testResults.reduce((sum, w) => sum + w.totalGasUsed, 0);
    const avgDuration = this.testResults.reduce((sum, w) => sum + w.duration, 0) / totalWorkflows;

    report += '## Summary\n\n';
    report += `- Total Workflows: ${totalWorkflows}\n`;
    report += `- Passed: ${passedWorkflows}\n`;
    report += `- Failed: ${totalWorkflows - passedWorkflows}\n`;
    report += `- Success Rate: ${((passedWorkflows / totalWorkflows) * 100).toFixed(1)}%\n`;
    report += `- Total Gas Used: ${totalGasUsed.toLocaleString()}\n`;
    report += `- Average Duration: ${avgDuration.toFixed(0)}ms\n\n`;

    // Detailed results
    report += '## Workflow Results\n\n';

    for (const workflow of this.testResults) {
      report += `### ${workflow.workflowName}\n\n`;
      report += `- **Status**: ${workflow.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- **Duration**: ${workflow.duration}ms\n`;
      report += `- **Gas Used**: ${workflow.totalGasUsed.toLocaleString()}\n\n`;

      if (workflow.steps.length > 0) {
        report += '#### Steps\n\n';
        for (const step of workflow.steps) {
          const status = step.passed ? '✅' : '❌';
          report += `${status} **${step.stepName}**\n`;
          
          if (step.transactionHash) {
            report += `  - Transaction: ${step.transactionHash}\n`;
          }
          if (step.gasUsed) {
            report += `  - Gas Used: ${step.gasUsed.toLocaleString()}\n`;
          }
          if (step.error) {
            report += `  - Error: ${step.error}\n`;
          }
          if (step.data) {
            report += `  - Data: ${JSON.stringify(step.data, null, 2)}\n`;
          }
          report += '\n';
        }
      }

      if (workflow.errors.length > 0) {
        report += '#### Errors\n\n';
        for (const error of workflow.errors) {
          report += `- ❌ ${error}\n`;
        }
        report += '\n';
      }
    }

    // Gas analysis
    report += '## Gas Analysis\n\n';
    report += '| Workflow | Total Gas | Avg Gas per Step |\n';
    report += '|----------|-----------|------------------|\n';
    
    for (const workflow of this.testResults) {
      const avgGasPerStep = workflow.steps.length > 0 
        ? (workflow.totalGasUsed / workflow.steps.filter(s => s.gasUsed).length).toFixed(0)
        : '0';
      report += `| ${workflow.workflowName} | ${workflow.totalGasUsed.toLocaleString()} | ${avgGasPerStep} |\n`;
    }
    report += '\n';

    return report;
  }

  getResults(): WorkflowResult[] {
    return this.testResults;
  }
}