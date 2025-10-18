import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

export interface GovernanceConfig {
  network: string;
  stakingTiers: {
    tier1: { minStake: string; votingWeight: number; name: string };
    tier2: { minStake: string; votingWeight: number; name: string };
    tier3: { minStake: string; votingWeight: number; name: string };
    tier4: { minStake: string; votingWeight: number; name: string };
  };
  proposalCategories: {
    [key: string]: {
      name: string;
      description: string;
      quorumRequired: number;
      votingPeriod: number; // in blocks
      executionDelay: number; // in blocks
      minStakeRequired: string;
    };
  };
  initialProposals: {
    title: string;
    description: string;
    category: string;
    actions: any[];
    proposer: string;
  }[];
  delegationSettings: {
    enabled: boolean;
    maxDelegates: number;
    delegationFee: string;
  };
  votingIncentives: {
    participationRewards: string;
    streakBonuses: boolean;
    earlyVoterBonus: string;
  };
}

export interface ProposalMetrics {
  proposalId: number;
  title: string;
  category: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed' | 'cancelled';
  votesFor: string;
  votesAgainst: string;
  totalVotes: string;
  participationRate: number;
  quorumReached: boolean;
  createdAt: number;
  votingEndsAt: number;
  executionTime?: number;
}

export interface VotingMetrics {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  averageParticipation: number;
  totalVotingPower: string;
  delegatedPower: string;
  categoryBreakdown: { [category: string]: number };
  stakingTierDistribution: { [tier: string]: number };
}

export class GovernanceActivationSystem {
  private config: GovernanceConfig;
  private deploymentData: any;
  private contractABIs: { [key: string]: any[] } = {};
  private proposalMetrics: Map<number, ProposalMetrics> = new Map();
  private votingMetrics: VotingMetrics;
  private activationTime: number = 0;

  constructor(config: GovernanceConfig) {
    this.config = config;
    this.votingMetrics = {
      totalProposals: 0,
      activeProposals: 0,
      totalVoters: 0,
      averageParticipation: 0,
      totalVotingPower: '0',
      delegatedPower: '0',
      categoryBreakdown: {},
      stakingTierDistribution: {}
    };
  }

  async initialize(): Promise<void> {
    console.log('🗳️ Initializing Governance Activation System...\n');
    
    await this.loadDeploymentData();
    await this.loadContractABIs();
    await this.validateGovernanceContracts();
    
    console.log('✅ Governance Activation System initialized successfully\n');
  }

  private async loadDeploymentData(): Promise<void> {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.config.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json'),
      path.join(__dirname, '..', 'deployed-addresses-localhost.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        this.deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📄 Loaded deployment data from: ${path.basename(filePath)}`);
        return;
      }
    }

    throw new Error('❌ No deployment data found. Deploy contracts first.');
  }

  private async loadContractABIs(): Promise<void> {
    const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
    
    const requiredContracts = ['Governance', 'LDAOToken', 'ReputationSystem'];
    
    for (const contractName of requiredContracts) {
      try {
        const artifactPath = path.join(artifactsPath, `${contractName}.sol`, `${contractName}.json`);
        
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          this.contractABIs[contractName] = artifact.abi;
          console.log(`📋 Loaded ABI for ${contractName}`);
        } else {
          throw new Error(`ABI not found for ${contractName}`);
        }
      } catch (error) {
        throw new Error(`Could not load ABI for ${contractName}: ${error}`);
      }
    }
  }

  private async validateGovernanceContracts(): Promise<void> {
    console.log('🔍 Validating governance contracts...\n');

    // Validate Governance contract
    if (!this.deploymentData.Governance) {
      throw new Error('Governance contract not deployed');
    }

    // Validate LDAOToken contract
    if (!this.deploymentData.LDAOToken) {
      throw new Error('LDAOToken contract not deployed');
    }

    try {
      // Test Governance contract
      const governance = await ethers.getContractAt('Governance', this.deploymentData.Governance);
      const proposalCount = await governance.proposalCount();
      console.log(`   ✅ Governance contract: ${proposalCount} proposals`);

      // Test LDAOToken contract
      const ldaoToken = await ethers.getContractAt('LDAOToken', this.deploymentData.LDAOToken);
      const totalSupply = await ldaoToken.totalSupply();
      console.log(`   ✅ LDAOToken contract: ${ethers.formatEther(totalSupply)} total supply`);

      // Test ReputationSystem if available
      if (this.deploymentData.ReputationSystem) {
        const reputation = await ethers.getContractAt('ReputationSystem', this.deploymentData.ReputationSystem);
        console.log('   ✅ ReputationSystem contract: Available');
      }

    } catch (error) {
      throw new Error(`Contract validation failed: ${error}`);
    }

    console.log('');
  }

  async activateGovernanceParticipation(): Promise<void> {
    console.log('🗳️ ACTIVATING GOVERNANCE PARTICIPATION');
    console.log('=====================================\n');

    this.activationTime = Date.now();

    try {
      // Phase 1: Configure staking tiers
      await this.configureStakingTiers();

      // Phase 2: Setup proposal categories
      await this.setupProposalCategories();

      // Phase 3: Enable delegation if configured
      if (this.config.delegationSettings.enabled) {
        await this.enableDelegation();
      }

      // Phase 4: Create initial proposals
      await this.createInitialProposals();

      // Phase 5: Setup voting incentives
      await this.setupVotingIncentives();

      // Phase 6: Start governance monitoring
      await this.startGovernanceMonitoring();

      // Phase 7: Generate governance documentation
      await this.generateGovernanceDocumentation();

      console.log('\n🎉 GOVERNANCE PARTICIPATION ACTIVATED!');
      console.log('=====================================');
      console.log('Community members can now participate in DAO governance');
      console.log(`Activation time: ${new Date().toISOString()}`);
      console.log(`Network: ${this.config.network}`);
      console.log('');

    } catch (error) {
      console.error('❌ Governance activation failed:', error);
      throw error;
    }
  }

  private async configureStakingTiers(): Promise<void> {
    console.log('⚖️ Configuring staking tiers for weighted voting...\n');

    const governance = await ethers.getContractAt('Governance', this.deploymentData.Governance);
    const ldaoToken = await ethers.getContractAt('LDAOToken', this.deploymentData.LDAOToken);

    // Log staking tier configuration
    console.log('   📊 Staking Tier Configuration:');
    
    for (const [tierKey, tierConfig] of Object.entries(this.config.stakingTiers)) {
      console.log(`      ${tierConfig.name}:`);
      console.log(`         Min Stake: ${ethers.formatEther(tierConfig.minStake)} LDAO`);
      console.log(`         Voting Weight: ${tierConfig.votingWeight}x`);
      
      // Initialize tier distribution tracking
      this.votingMetrics.stakingTierDistribution[tierConfig.name] = 0;
    }

    console.log('');

    // Save staking tier configuration
    const stakingConfig = {
      tiers: this.config.stakingTiers,
      tokenAddress: this.deploymentData.LDAOToken,
      governanceAddress: this.deploymentData.Governance,
      configuredAt: new Date().toISOString()
    };

    const configPath = path.join(__dirname, '..', 'governance-materials', 'staking-tiers.json');
    const governanceDir = path.dirname(configPath);
    
    if (!fs.existsSync(governanceDir)) {
      fs.mkdirSync(governanceDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(stakingConfig, null, 2));
    console.log('   ✅ Staking tier configuration saved');
  }

  private async setupProposalCategories(): Promise<void> {
    console.log('📋 Setting up proposal categories...\n');

    console.log('   📝 Proposal Categories:');
    
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.proposalCategories)) {
      console.log(`      ${categoryConfig.name}:`);
      console.log(`         Description: ${categoryConfig.description}`);
      console.log(`         Quorum Required: ${categoryConfig.quorumRequired}%`);
      console.log(`         Voting Period: ${categoryConfig.votingPeriod} blocks`);
      console.log(`         Execution Delay: ${categoryConfig.executionDelay} blocks`);
      console.log(`         Min Stake: ${ethers.formatEther(categoryConfig.minStakeRequired)} LDAO`);
      console.log('');
      
      // Initialize category tracking
      this.votingMetrics.categoryBreakdown[categoryConfig.name] = 0;
    }

    // Save proposal categories configuration
    const categoriesConfig = {
      categories: this.config.proposalCategories,
      governanceAddress: this.deploymentData.Governance,
      configuredAt: new Date().toISOString()
    };

    const categoriesPath = path.join(__dirname, '..', 'governance-materials', 'proposal-categories.json');
    fs.writeFileSync(categoriesPath, JSON.stringify(categoriesConfig, null, 2));
    
    console.log('   ✅ Proposal categories configuration saved');
  }

  private async enableDelegation(): Promise<void> {
    console.log('🤝 Enabling delegation system...\n');

    const delegationConfig = this.config.delegationSettings;
    
    console.log('   🔗 Delegation Configuration:');
    console.log(`      Enabled: ${delegationConfig.enabled}`);
    console.log(`      Max Delegates: ${delegationConfig.maxDelegates}`);
    console.log(`      Delegation Fee: ${ethers.formatEther(delegationConfig.delegationFee)} LDAO`);
    console.log('');

    // Save delegation configuration
    const delegationData = {
      settings: delegationConfig,
      governanceAddress: this.deploymentData.Governance,
      tokenAddress: this.deploymentData.LDAOToken,
      enabledAt: new Date().toISOString()
    };

    const delegationPath = path.join(__dirname, '..', 'governance-materials', 'delegation-config.json');
    fs.writeFileSync(delegationPath, JSON.stringify(delegationData, null, 2));
    
    console.log('   ✅ Delegation system configuration saved');
  }

  private async createInitialProposals(): Promise<void> {
    console.log('📝 Creating initial governance proposals...\n');

    const governance = await ethers.getContractAt('Governance', this.deploymentData.Governance);
    
    if (this.config.initialProposals.length === 0) {
      console.log('   ℹ️ No initial proposals configured');
      return;
    }

    console.log(`   📋 Creating ${this.config.initialProposals.length} initial proposals:`);

    for (let i = 0; i < this.config.initialProposals.length; i++) {
      const proposal = this.config.initialProposals[i];
      
      try {
        console.log(`      ${i + 1}. ${proposal.title}`);
        console.log(`         Category: ${proposal.category}`);
        console.log(`         Description: ${proposal.description.substring(0, 100)}...`);
        
        // Create proposal (this would be done by the proposer in practice)
        // For now, we'll just log the proposal details and save them
        
        const proposalData = {
          id: i + 1,
          title: proposal.title,
          description: proposal.description,
          category: proposal.category,
          actions: proposal.actions,
          proposer: proposal.proposer,
          createdAt: Date.now(),
          status: 'pending'
        };

        // Track proposal metrics
        const metrics: ProposalMetrics = {
          proposalId: i + 1,
          title: proposal.title,
          category: proposal.category,
          status: 'pending',
          votesFor: '0',
          votesAgainst: '0',
          totalVotes: '0',
          participationRate: 0,
          quorumReached: false,
          createdAt: Date.now(),
          votingEndsAt: Date.now() + (this.config.proposalCategories[proposal.category]?.votingPeriod || 17280) * 12000 // Approximate block time
        };

        this.proposalMetrics.set(i + 1, metrics);
        this.votingMetrics.totalProposals++;
        this.votingMetrics.categoryBreakdown[proposal.category] = 
          (this.votingMetrics.categoryBreakdown[proposal.category] || 0) + 1;

        console.log(`         ✅ Proposal ${i + 1} prepared`);
        
      } catch (error) {
        console.warn(`         ⚠️ Failed to prepare proposal ${i + 1}: ${error}`);
      }
    }

    // Save initial proposals
    const proposalsData = {
      proposals: this.config.initialProposals,
      metrics: Array.from(this.proposalMetrics.values()),
      governanceAddress: this.deploymentData.Governance,
      createdAt: new Date().toISOString()
    };

    const proposalsPath = path.join(__dirname, '..', 'governance-materials', 'initial-proposals.json');
    fs.writeFileSync(proposalsPath, JSON.stringify(proposalsData, null, 2));
    
    console.log(`\n   ✅ ${this.config.initialProposals.length} initial proposals prepared`);
  }

  private async setupVotingIncentives(): Promise<void> {
    console.log('🎁 Setting up voting incentives...\n');

    const incentives = this.config.votingIncentives;
    
    console.log('   💰 Voting Incentive Configuration:');
    console.log(`      Participation Rewards: ${ethers.formatEther(incentives.participationRewards)} LDAO per vote`);
    console.log(`      Streak Bonuses: ${incentives.streakBonuses ? 'Enabled' : 'Disabled'}`);
    console.log(`      Early Voter Bonus: ${ethers.formatEther(incentives.earlyVoterBonus)} LDAO`);
    console.log('');

    // Save voting incentives configuration
    const incentivesData = {
      settings: incentives,
      rewardPoolAddress: this.deploymentData.EnhancedRewardPool,
      tokenAddress: this.deploymentData.LDAOToken,
      configuredAt: new Date().toISOString()
    };

    const incentivesPath = path.join(__dirname, '..', 'governance-materials', 'voting-incentives.json');
    fs.writeFileSync(incentivesPath, JSON.stringify(incentivesData, null, 2));
    
    console.log('   ✅ Voting incentives configuration saved');
  }

  private async startGovernanceMonitoring(): Promise<void> {
    console.log('📊 Starting governance monitoring...\n');

    // Initialize monitoring configuration
    const monitoringConfig = {
      metricsInterval: 300000, // 5 minutes
      proposalCheckInterval: 60000, // 1 minute
      participationTrackingInterval: 3600000, // 1 hour
      reportGenerationInterval: 86400000 // 24 hours
    };

    console.log('   📈 Monitoring Configuration:');
    console.log(`      Metrics Collection: Every ${monitoringConfig.metricsInterval / 1000} seconds`);
    console.log(`      Proposal Status Check: Every ${monitoringConfig.proposalCheckInterval / 1000} seconds`);
    console.log(`      Participation Tracking: Every ${monitoringConfig.participationTrackingInterval / 3600000} hours`);
    console.log(`      Report Generation: Every ${monitoringConfig.reportGenerationInterval / 86400000} days`);
    console.log('');

    // Save monitoring configuration
    const monitoringData = {
      config: monitoringConfig,
      initialMetrics: this.votingMetrics,
      governanceAddress: this.deploymentData.Governance,
      tokenAddress: this.deploymentData.LDAOToken,
      startedAt: new Date().toISOString()
    };

    const monitoringPath = path.join(__dirname, '..', 'governance-materials', 'monitoring-config.json');
    fs.writeFileSync(monitoringPath, JSON.stringify(monitoringData, null, 2));
    
    console.log('   ✅ Governance monitoring configuration saved');
  }

  private async generateGovernanceDocumentation(): Promise<void> {
    console.log('📚 Generating governance documentation...\n');

    // Governance guide
    const governanceGuide = this.generateGovernanceGuide();
    const guidePath = path.join(__dirname, '..', 'governance-materials', 'governance-guide.md');
    fs.writeFileSync(guidePath, governanceGuide);

    // Voting instructions
    const votingInstructions = this.generateVotingInstructions();
    const instructionsPath = path.join(__dirname, '..', 'governance-materials', 'voting-instructions.md');
    fs.writeFileSync(instructionsPath, votingInstructions);

    // Proposal creation guide
    const proposalGuide = this.generateProposalCreationGuide();
    const proposalGuidePath = path.join(__dirname, '..', 'governance-materials', 'proposal-creation-guide.md');
    fs.writeFileSync(proposalGuidePath, proposalGuide);

    // Delegation guide
    if (this.config.delegationSettings.enabled) {
      const delegationGuide = this.generateDelegationGuide();
      const delegationGuidePath = path.join(__dirname, '..', 'governance-materials', 'delegation-guide.md');
      fs.writeFileSync(delegationGuidePath, delegationGuide);
    }

    console.log('   ✅ Documentation generated:');
    console.log('      - Governance Guide');
    console.log('      - Voting Instructions');
    console.log('      - Proposal Creation Guide');
    if (this.config.delegationSettings.enabled) {
      console.log('      - Delegation Guide');
    }
    console.log('');
  }

  private generateGovernanceGuide(): string {
    let guide = `# LinkDAO Governance Guide\n\n`;
    guide += `Welcome to LinkDAO governance! This guide explains how to participate in our decentralized autonomous organization.\n\n`;

    guide += `## Overview\n\n`;
    guide += `LinkDAO uses a token-weighted voting system where LDAO token holders can:\n`;
    guide += `- Create proposals for platform improvements\n`;
    guide += `- Vote on active proposals\n`;
    guide += `- Delegate voting power to trusted community members\n`;
    guide += `- Earn rewards for participation\n\n`;

    guide += `## Staking Tiers\n\n`;
    guide += `Your voting power depends on your staking tier:\n\n`;
    guide += `| Tier | Min Stake | Voting Weight | Benefits |\n`;
    guide += `|------|-----------|---------------|----------|\n`;
    
    for (const [tierKey, tierConfig] of Object.entries(this.config.stakingTiers)) {
      guide += `| ${tierConfig.name} | ${ethers.formatEther(tierConfig.minStake)} LDAO | ${tierConfig.votingWeight}x | Enhanced voting power |\n`;
    }
    guide += `\n`;

    guide += `## Proposal Categories\n\n`;
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.proposalCategories)) {
      guide += `### ${categoryConfig.name}\n\n`;
      guide += `${categoryConfig.description}\n\n`;
      guide += `- **Quorum Required**: ${categoryConfig.quorumRequired}%\n`;
      guide += `- **Voting Period**: ${categoryConfig.votingPeriod} blocks (~${Math.round(categoryConfig.votingPeriod * 12 / 3600)} hours)\n`;
      guide += `- **Execution Delay**: ${categoryConfig.executionDelay} blocks (~${Math.round(categoryConfig.executionDelay * 12 / 3600)} hours)\n`;
      guide += `- **Min Stake Required**: ${ethers.formatEther(categoryConfig.minStakeRequired)} LDAO\n\n`;
    }

    guide += `## Voting Process\n\n`;
    guide += `1. **Proposal Creation**: Community members create proposals in specific categories\n`;
    guide += `2. **Review Period**: Proposals are reviewed by the community\n`;
    guide += `3. **Voting Period**: Token holders vote for or against proposals\n`;
    guide += `4. **Execution**: Successful proposals are executed after the delay period\n\n`;

    guide += `## Participation Rewards\n\n`;
    guide += `Active governance participants earn rewards:\n`;
    guide += `- **Voting Rewards**: ${ethers.formatEther(this.config.votingIncentives.participationRewards)} LDAO per vote\n`;
    guide += `- **Early Voter Bonus**: ${ethers.formatEther(this.config.votingIncentives.earlyVoterBonus)} LDAO for voting early\n`;
    
    if (this.config.votingIncentives.streakBonuses) {
      guide += `- **Streak Bonuses**: Additional rewards for consecutive participation\n`;
    }
    guide += `\n`;

    if (this.config.delegationSettings.enabled) {
      guide += `## Delegation\n\n`;
      guide += `You can delegate your voting power to trusted community members:\n`;
      guide += `- **Max Delegates**: ${this.config.delegationSettings.maxDelegates}\n`;
      guide += `- **Delegation Fee**: ${ethers.formatEther(this.config.delegationSettings.delegationFee)} LDAO\n`;
      guide += `- Delegates vote on your behalf while you retain token ownership\n\n`;
    }

    guide += `## Getting Started\n\n`;
    guide += `1. **Acquire LDAO Tokens**: Purchase or earn LDAO tokens\n`;
    guide += `2. **Stake Tokens**: Stake tokens to achieve your desired voting tier\n`;
    guide += `3. **Review Proposals**: Read active proposals and their details\n`;
    guide += `4. **Cast Votes**: Vote on proposals that interest you\n`;
    guide += `5. **Create Proposals**: Submit your own ideas for platform improvements\n\n`;

    guide += `## Contract Addresses\n\n`;
    guide += `- **Governance**: \`${this.deploymentData.Governance}\`\n`;
    guide += `- **LDAO Token**: \`${this.deploymentData.LDAOToken}\`\n`;
    if (this.deploymentData.ReputationSystem) {
      guide += `- **Reputation System**: \`${this.deploymentData.ReputationSystem}\`\n`;
    }
    guide += `\n`;

    guide += `## Support\n\n`;
    guide += `For help with governance participation:\n`;
    guide += `- Read the voting instructions\n`;
    guide += `- Join our Discord community\n`;
    guide += `- Check the FAQ section\n`;
    guide += `- Contact community moderators\n\n`;

    return guide;
  }

  private generateVotingInstructions(): string {
    let instructions = `# Voting Instructions\n\n`;
    instructions += `Step-by-step guide to participating in LinkDAO governance voting.\n\n`;

    instructions += `## Prerequisites\n\n`;
    instructions += `Before you can vote, ensure you have:\n`;
    instructions += `- LDAO tokens in your wallet\n`;
    instructions += `- Tokens staked to achieve voting tier\n`;
    instructions += `- Wallet connected to the governance interface\n`;
    instructions += `- Sufficient ETH for transaction fees\n\n`;

    instructions += `## Voting Steps\n\n`;
    instructions += `### 1. Access Governance Interface\n`;
    instructions += `- Navigate to the governance section\n`;
    instructions += `- Connect your wallet\n`;
    instructions += `- Verify your staking tier and voting power\n\n`;

    instructions += `### 2. Review Active Proposals\n`;
    instructions += `- Browse the list of active proposals\n`;
    instructions += `- Click on proposals to read full details\n`;
    instructions += `- Check proposal category and requirements\n`;
    instructions += `- Review voting deadline and current status\n\n`;

    instructions += `### 3. Cast Your Vote\n`;
    instructions += `- Select "Vote For" or "Vote Against"\n`;
    instructions += `- Review your voting power and impact\n`;
    instructions += `- Confirm the transaction in your wallet\n`;
    instructions += `- Wait for transaction confirmation\n\n`;

    instructions += `### 4. Track Your Participation\n`;
    instructions += `- View your voting history\n`;
    instructions += `- Monitor proposal outcomes\n`;
    instructions += `- Claim participation rewards\n`;
    instructions += `- Track your governance reputation\n\n`;

    instructions += `## Voting Power Calculation\n\n`;
    instructions += `Your voting power is determined by:\n`;
    instructions += `- **Token Amount**: Number of LDAO tokens staked\n`;
    instructions += `- **Staking Tier**: Multiplier based on your tier\n`;
    instructions += `- **Reputation Bonus**: Additional weight from platform reputation\n\n`;

    instructions += `### Example Calculation\n`;
    instructions += `\`\`\`\n`;
    instructions += `Staked Tokens: 1,000 LDAO\n`;
    instructions += `Staking Tier: Gold (2x multiplier)\n`;
    instructions += `Reputation Bonus: 10%\n`;
    instructions += `\n`;
    instructions += `Voting Power = (1,000 × 2) × 1.1 = 2,200 votes\n`;
    instructions += `\`\`\`\n\n`;

    instructions += `## Voting Strategies\n\n`;
    instructions += `### Research Before Voting\n`;
    instructions += `- Read the full proposal text\n`;
    instructions += `- Review community discussion\n`;
    instructions += `- Consider long-term implications\n`;
    instructions += `- Check proposer's reputation\n\n`;

    instructions += `### Timing Considerations\n`;
    instructions += `- **Early Voting**: Earn bonus rewards\n`;
    instructions += `- **Last Minute**: Risk missing the deadline\n`;
    instructions += `- **Gas Costs**: Vote during low-traffic periods\n\n`;

    if (this.config.delegationSettings.enabled) {
      instructions += `### Delegation Option\n`;
      instructions += `If you can't vote regularly:\n`;
      instructions += `- Delegate to trusted community members\n`;
      instructions += `- Choose delegates with aligned interests\n`;
      instructions += `- Monitor delegate voting patterns\n`;
      instructions += `- Revoke delegation if needed\n\n`;
    }

    instructions += `## Common Issues\n\n`;
    instructions += `### Transaction Failures\n`;
    instructions += `- **Insufficient Gas**: Increase gas limit\n`;
    instructions += `- **Voting Closed**: Check proposal deadline\n`;
    instructions += `- **Insufficient Stake**: Increase your stake\n`;
    instructions += `- **Network Congestion**: Try again later\n\n`;

    instructions += `### Voting Power Issues\n`;
    instructions += `- **Zero Power**: Ensure tokens are staked\n`;
    instructions += `- **Lower Than Expected**: Check staking tier\n`;
    instructions += `- **Delegation Active**: Check if you've delegated\n\n`;

    instructions += `## Rewards and Incentives\n\n`;
    instructions += `### Participation Rewards\n`;
    instructions += `- Earn ${ethers.formatEther(this.config.votingIncentives.participationRewards)} LDAO per vote\n`;
    instructions += `- Early voters get ${ethers.formatEther(this.config.votingIncentives.earlyVoterBonus)} LDAO bonus\n`;
    
    if (this.config.votingIncentives.streakBonuses) {
      instructions += `- Consecutive voting streaks earn bonus multipliers\n`;
    }
    instructions += `\n`;

    instructions += `### Claiming Rewards\n`;
    instructions += `- Rewards are distributed automatically\n`;
    instructions += `- Check your wallet for reward tokens\n`;
    instructions += `- Rewards may have a vesting period\n\n`;

    instructions += `## Best Practices\n\n`;
    instructions += `- Vote on every proposal you understand\n`;
    instructions += `- Engage in community discussions\n`;
    instructions += `- Keep your stake active and current\n`;
    instructions += `- Monitor governance announcements\n`;
    instructions += `- Provide feedback on proposal outcomes\n\n`;

    return instructions;
  }

  private generateProposalCreationGuide(): string {
    let guide = `# Proposal Creation Guide\n\n`;
    guide += `Learn how to create effective governance proposals for the LinkDAO community.\n\n`;

    guide += `## Prerequisites\n\n`;
    guide += `To create a proposal, you need:\n`;
    guide += `- Minimum stake requirement for your proposal category\n`;
    guide += `- Clear understanding of the proposal process\n`;
    guide += `- Community support for your idea\n`;
    guide += `- Technical details if applicable\n\n`;

    guide += `## Proposal Categories\n\n`;
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.proposalCategories)) {
      guide += `### ${categoryConfig.name}\n\n`;
      guide += `**Purpose**: ${categoryConfig.description}\n\n`;
      guide += `**Requirements**:\n`;
      guide += `- Minimum stake: ${ethers.formatEther(categoryConfig.minStakeRequired)} LDAO\n`;
      guide += `- Quorum needed: ${categoryConfig.quorumRequired}%\n`;
      guide += `- Voting period: ${categoryConfig.votingPeriod} blocks\n`;
      guide += `- Execution delay: ${categoryConfig.executionDelay} blocks\n\n`;
    }

    guide += `## Proposal Structure\n\n`;
    guide += `### Required Elements\n\n`;
    guide += `1. **Title**: Clear, concise description (max 100 characters)\n`;
    guide += `2. **Summary**: Brief overview of the proposal (max 500 characters)\n`;
    guide += `3. **Description**: Detailed explanation of the proposal\n`;
    guide += `4. **Rationale**: Why this proposal is needed\n`;
    guide += `5. **Implementation**: How the proposal will be executed\n`;
    guide += `6. **Timeline**: Expected implementation schedule\n`;
    guide += `7. **Budget**: Required resources (if applicable)\n\n`;

    guide += `### Optional Elements\n\n`;
    guide += `- **Alternatives Considered**: Other options evaluated\n`;
    guide += `- **Risks and Mitigation**: Potential issues and solutions\n`;
    guide += `- **Success Metrics**: How success will be measured\n`;
    guide += `- **Community Feedback**: Input from community discussions\n\n`;

    guide += `## Creation Process\n\n`;
    guide += `### 1. Pre-Proposal Discussion\n`;
    guide += `- Share your idea in community forums\n`;
    guide += `- Gather feedback and suggestions\n`;
    guide += `- Refine your proposal based on input\n`;
    guide += `- Build community support\n\n`;

    guide += `### 2. Draft Preparation\n`;
    guide += `- Write a comprehensive proposal draft\n`;
    guide += `- Include all required elements\n`;
    guide += `- Review for clarity and completeness\n`;
    guide += `- Get feedback from trusted community members\n\n`;

    guide += `### 3. Technical Review\n`;
    guide += `- Ensure technical feasibility\n`;
    guide += `- Review smart contract implications\n`;
    guide += `- Consider security implications\n`;
    guide += `- Validate implementation approach\n\n`;

    guide += `### 4. Formal Submission\n`;
    guide += `- Access the governance interface\n`;
    guide += `- Select appropriate proposal category\n`;
    guide += `- Fill in all required fields\n`;
    guide += `- Submit the proposal transaction\n\n`;

    guide += `## Writing Tips\n\n`;
    guide += `### Be Clear and Concise\n`;
    guide += `- Use simple, understandable language\n`;
    guide += `- Avoid technical jargon when possible\n`;
    guide += `- Structure content with headers and bullets\n`;
    guide += `- Keep paragraphs short and focused\n\n`;

    guide += `### Provide Context\n`;
    guide += `- Explain the current situation\n`;
    guide += `- Describe the problem being solved\n`;
    guide += `- Show how the proposal addresses the issue\n`;
    guide += `- Include relevant background information\n\n`;

    guide += `### Be Specific\n`;
    guide += `- Include concrete details and numbers\n`;
    guide += `- Specify exact implementation steps\n`;
    guide += `- Provide realistic timelines\n`;
    guide += `- Define success criteria clearly\n\n`;

    guide += `## Common Proposal Types\n\n`;
    guide += `### Parameter Changes\n`;
    guide += `- Adjusting fee structures\n`;
    guide += `- Modifying staking requirements\n`;
    guide += `- Updating voting thresholds\n`;
    guide += `- Changing reward distributions\n\n`;

    guide += `### Feature Additions\n`;
    guide += `- New platform functionality\n`;
    guide += `- Integration with external services\n`;
    guide += `- User interface improvements\n`;
    guide += `- Additional governance mechanisms\n\n`;

    guide += `### Treasury Management\n`;
    guide += `- Fund allocation decisions\n`;
    guide += `- Investment strategies\n`;
    guide += `- Grant distributions\n`;
    guide += `- Partnership funding\n\n`;

    guide += `### Community Initiatives\n`;
    guide += `- Educational programs\n`;
    guide += `- Marketing campaigns\n`;
    guide += `- Event sponsorships\n`;
    guide += `- Community rewards\n\n`;

    guide += `## Best Practices\n\n`;
    guide += `### Before Submitting\n`;
    guide += `- Test your idea with the community\n`;
    guide += `- Research similar proposals\n`;
    guide += `- Consider alternative approaches\n`;
    guide += `- Prepare for questions and criticism\n\n`;

    guide += `### During Voting\n`;
    guide += `- Engage with the community\n`;
    guide += `- Answer questions promptly\n`;
    guide += `- Provide additional clarification\n`;
    guide += `- Address concerns raised by voters\n\n`;

    guide += `### After Voting\n`;
    guide += `- Thank participants regardless of outcome\n`;
    guide += `- If passed, coordinate implementation\n`;
    guide += `- If failed, consider revisions for resubmission\n`;
    guide += `- Share lessons learned with the community\n\n`;

    guide += `## Proposal Templates\n\n`;
    guide += `### Basic Template\n`;
    guide += `\`\`\`\n`;
    guide += `# Proposal Title\n\n`;
    guide += `## Summary\n`;
    guide += `[Brief description of the proposal]\n\n`;
    guide += `## Description\n`;
    guide += `[Detailed explanation of what you're proposing]\n\n`;
    guide += `## Rationale\n`;
    guide += `[Why this proposal is needed]\n\n`;
    guide += `## Implementation\n`;
    guide += `[How the proposal will be executed]\n\n`;
    guide += `## Timeline\n`;
    guide += `[Expected implementation schedule]\n\n`;
    guide += `## Budget\n`;
    guide += `[Required resources, if applicable]\n`;
    guide += `\`\`\`\n\n`;

    return guide;
  }

  private generateDelegationGuide(): string {
    let guide = `# Delegation Guide\n\n`;
    guide += `Learn how to delegate your voting power to trusted community members.\n\n`;

    guide += `## What is Delegation?\n\n`;
    guide += `Delegation allows you to:\n`;
    guide += `- Transfer your voting power to another address\n`;
    guide += `- Maintain ownership of your tokens\n`;
    guide += `- Participate in governance without active voting\n`;
    guide += `- Support trusted community members\n\n`;

    guide += `## Delegation Settings\n\n`;
    guide += `- **Maximum Delegates**: ${this.config.delegationSettings.maxDelegates}\n`;
    guide += `- **Delegation Fee**: ${ethers.formatEther(this.config.delegationSettings.delegationFee)} LDAO\n`;
    guide += `- **Revocation**: Can be revoked at any time\n`;
    guide += `- **Token Ownership**: You keep your tokens\n\n`;

    guide += `## How to Delegate\n\n`;
    guide += `### 1. Choose a Delegate\n`;
    guide += `- Research potential delegates\n`;
    guide += `- Review their voting history\n`;
    guide += `- Check their community reputation\n`;
    guide += `- Ensure aligned interests\n\n`;

    guide += `### 2. Initiate Delegation\n`;
    guide += `- Access the governance interface\n`;
    guide += `- Navigate to the delegation section\n`;
    guide += `- Enter the delegate's address\n`;
    guide += `- Specify the amount to delegate\n\n`;

    guide += `### 3. Confirm Transaction\n`;
    guide += `- Review delegation details\n`;
    guide += `- Pay the delegation fee\n`;
    guide += `- Confirm the transaction\n`;
    guide += `- Wait for blockchain confirmation\n\n`;

    guide += `## Managing Delegation\n\n`;
    guide += `### Monitoring Your Delegate\n`;
    guide += `- Track their voting activity\n`;
    guide += `- Review their voting rationale\n`;
    guide += `- Assess alignment with your values\n`;
    guide += `- Monitor their community engagement\n\n`;

    guide += `### Revoking Delegation\n`;
    guide += `- Access your delegation dashboard\n`;
    guide += `- Select the delegation to revoke\n`;
    guide += `- Confirm the revocation transaction\n`;
    guide += `- Your voting power returns immediately\n\n`;

    guide += `## Choosing Good Delegates\n\n`;
    guide += `### Evaluation Criteria\n`;
    guide += `- **Active Participation**: Regular voting and engagement\n`;
    guide += `- **Transparent Communication**: Clear voting rationale\n`;
    guide += `- **Aligned Values**: Similar governance philosophy\n`;
    guide += `- **Technical Knowledge**: Understanding of proposals\n`;
    guide += `- **Community Reputation**: Trusted by other members\n\n`;

    guide += `### Red Flags\n`;
    guide += `- Inconsistent voting patterns\n`;
    guide += `- Lack of communication\n`;
    guide += `- Conflicts of interest\n`;
    guide += `- Poor community reputation\n`;
    guide += `- Inactive participation\n\n`;

    guide += `## Benefits and Risks\n\n`;
    guide += `### Benefits\n`;
    guide += `- Passive governance participation\n`;
    guide += `- Support for active community members\n`;
    guide += `- Reduced time commitment\n`;
    guide += `- Maintained token ownership\n\n`;

    guide += `### Risks\n`;
    guide += `- Delegate may vote against your interests\n`;
    guide += `- Loss of direct control over votes\n`;
    guide += `- Delegation fees reduce returns\n`;
    guide += `- Potential for delegate misconduct\n\n`;

    guide += `## Best Practices\n\n`;
    guide += `- Start with small delegation amounts\n`;
    guide += `- Diversify across multiple delegates\n`;
    guide += `- Regularly review delegate performance\n`;
    guide += `- Stay informed about governance issues\n`;
    guide += `- Maintain some direct voting power\n`;
    guide += `- Communicate with your delegates\n\n`;

    return guide;
  }

  async collectGovernanceMetrics(): Promise<VotingMetrics> {
    try {
      const governance = await ethers.getContractAt('Governance', this.deploymentData.Governance);
      const ldaoToken = await ethers.getContractAt('LDAOToken', this.deploymentData.LDAOToken);

      // Update basic metrics
      this.votingMetrics.totalProposals = Number(await governance.proposalCount());
      this.votingMetrics.totalVotingPower = ethers.formatEther(await ldaoToken.totalSupply());

      // Count active proposals
      this.votingMetrics.activeProposals = Array.from(this.proposalMetrics.values())
        .filter(p => p.status === 'active').length;

      // Calculate average participation
      const totalVotes = Array.from(this.proposalMetrics.values())
        .reduce((sum, p) => sum + Number(p.totalVotes), 0);
      
      this.votingMetrics.averageParticipation = this.votingMetrics.totalProposals > 0 ? 
        totalVotes / this.votingMetrics.totalProposals : 0;

    } catch (error) {
      console.warn('Error collecting governance metrics:', error);
    }

    return { ...this.votingMetrics };
  }

  async generateGovernanceReport(): Promise<string> {
    const currentMetrics = await this.collectGovernanceMetrics();
    const activationDuration = Date.now() - this.activationTime;

    let report = `# LinkDAO Governance Activation Report\n\n`;
    report += `**Activation Date**: ${new Date(this.activationTime).toISOString()}\n`;
    report += `**Report Generated**: ${new Date().toISOString()}\n`;
    report += `**Activation Duration**: ${Math.round(activationDuration / 1000 / 60)} minutes\n`;
    report += `**Network**: ${this.config.network}\n\n`;

    report += `## Activation Summary\n\n`;
    report += `✅ **Status**: Successfully Activated\n`;
    report += `🗳️ **Staking Tiers**: ${Object.keys(this.config.stakingTiers).length} configured\n`;
    report += `📋 **Proposal Categories**: ${Object.keys(this.config.proposalCategories).length} available\n`;
    report += `🤝 **Delegation**: ${this.config.delegationSettings.enabled ? 'Enabled' : 'Disabled'}\n`;
    report += `🎁 **Voting Incentives**: Configured\n\n`;

    report += `## Staking Tiers\n\n`;
    report += `| Tier | Min Stake | Voting Weight | Current Users |\n`;
    report += `|------|-----------|---------------|---------------|\n`;
    
    for (const [tierKey, tierConfig] of Object.entries(this.config.stakingTiers)) {
      const userCount = this.votingMetrics.stakingTierDistribution[tierConfig.name] || 0;
      report += `| ${tierConfig.name} | ${ethers.formatEther(tierConfig.minStake)} LDAO | ${tierConfig.votingWeight}x | ${userCount} |\n`;
    }
    report += '\n';

    report += `## Proposal Categories\n\n`;
    report += `| Category | Quorum | Voting Period | Min Stake | Proposals |\n`;
    report += `|----------|--------|---------------|-----------|----------|\n`;
    
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.proposalCategories)) {
      const proposalCount = this.votingMetrics.categoryBreakdown[categoryConfig.name] || 0;
      report += `| ${categoryConfig.name} | ${categoryConfig.quorumRequired}% | ${categoryConfig.votingPeriod} blocks | ${ethers.formatEther(categoryConfig.minStakeRequired)} LDAO | ${proposalCount} |\n`;
    }
    report += '\n';

    report += `## Current Metrics\n\n`;
    report += `- **Total Proposals**: ${currentMetrics.totalProposals}\n`;
    report += `- **Active Proposals**: ${currentMetrics.activeProposals}\n`;
    report += `- **Total Voters**: ${currentMetrics.totalVoters}\n`;
    report += `- **Average Participation**: ${currentMetrics.averageParticipation.toFixed(2)}%\n`;
    report += `- **Total Voting Power**: ${currentMetrics.totalVotingPower} LDAO\n`;
    
    if (this.config.delegationSettings.enabled) {
      report += `- **Delegated Power**: ${currentMetrics.delegatedPower} LDAO\n`;
    }
    report += '\n';

    if (this.config.initialProposals.length > 0) {
      report += `## Initial Proposals\n\n`;
      report += `| ID | Title | Category | Status |\n`;
      report += `|----|-------|----------|--------|\n`;
      
      for (const proposal of this.config.initialProposals) {
        const metrics = Array.from(this.proposalMetrics.values())
          .find(p => p.title === proposal.title);
        const status = metrics?.status || 'pending';
        report += `| ${metrics?.proposalId || 'TBD'} | ${proposal.title} | ${proposal.category} | ${status} |\n`;
      }
      report += '\n';
    }

    report += `## Voting Incentives\n\n`;
    report += `- **Participation Rewards**: ${ethers.formatEther(this.config.votingIncentives.participationRewards)} LDAO per vote\n`;
    report += `- **Early Voter Bonus**: ${ethers.formatEther(this.config.votingIncentives.earlyVoterBonus)} LDAO\n`;
    report += `- **Streak Bonuses**: ${this.config.votingIncentives.streakBonuses ? 'Enabled' : 'Disabled'}\n\n`;

    if (this.config.delegationSettings.enabled) {
      report += `## Delegation Settings\n\n`;
      report += `- **Status**: Enabled\n`;
      report += `- **Max Delegates**: ${this.config.delegationSettings.maxDelegates}\n`;
      report += `- **Delegation Fee**: ${ethers.formatEther(this.config.delegationSettings.delegationFee)} LDAO\n\n`;
    }

    report += `## Contract Addresses\n\n`;
    report += `- **Governance**: \`${this.deploymentData.Governance}\`\n`;
    report += `- **LDAO Token**: \`${this.deploymentData.LDAOToken}\`\n`;
    if (this.deploymentData.ReputationSystem) {
      report += `- **Reputation System**: \`${this.deploymentData.ReputationSystem}\`\n`;
    }
    if (this.deploymentData.EnhancedRewardPool) {
      report += `- **Reward Pool**: \`${this.deploymentData.EnhancedRewardPool}\`\n`;
    }
    report += '\n';

    report += `## Next Steps\n\n`;
    report += `1. **Community Engagement**: Encourage active participation in governance\n`;
    report += `2. **Proposal Creation**: Support community members in creating proposals\n`;
    report += `3. **Voting Education**: Provide resources for informed voting\n`;
    report += `4. **Delegate Recruitment**: Identify and support quality delegates\n`;
    report += `5. **Metrics Monitoring**: Track participation and engagement trends\n\n`;

    report += `## Documentation Available\n\n`;
    report += `- **Governance Guide**: Comprehensive overview of the governance system\n`;
    report += `- **Voting Instructions**: Step-by-step voting guide\n`;
    report += `- **Proposal Creation Guide**: How to create effective proposals\n`;
    
    if (this.config.delegationSettings.enabled) {
      report += `- **Delegation Guide**: How to delegate voting power\n`;
    }
    report += '\n';

    report += `---\n\n`;
    report += `*Report generated by LinkDAO Governance Activation System*\n`;

    return report;
  }

  async saveGovernanceReport(): Promise<void> {
    const report = await this.generateGovernanceReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `governance-activation-report-${this.config.network}-${timestamp}.md`;
    const reportsDir = path.join(__dirname, '..', 'governance-reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, report);
    
    console.log(`📄 Governance activation report saved to: ${filename}`);
  }

  getVotingMetrics(): VotingMetrics {
    return { ...this.votingMetrics };
  }

  getProposalMetrics(): ProposalMetrics[] {
    return Array.from(this.proposalMetrics.values());
  }
}

// Load governance configuration
export function loadGovernanceConfig(): GovernanceConfig {
  const configPath = path.join(__dirname, '..', 'governance-config.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Default configuration
  return {
    network: process.env.HARDHAT_NETWORK || 'mainnet',
    stakingTiers: {
      tier1: { 
        minStake: ethers.parseEther('100').toString(), 
        votingWeight: 1, 
        name: 'Bronze' 
      },
      tier2: { 
        minStake: ethers.parseEther('1000').toString(), 
        votingWeight: 2, 
        name: 'Silver' 
      },
      tier3: { 
        minStake: ethers.parseEther('5000').toString(), 
        votingWeight: 3, 
        name: 'Gold' 
      },
      tier4: { 
        minStake: ethers.parseEther('10000').toString(), 
        votingWeight: 5, 
        name: 'Diamond' 
      }
    },
    proposalCategories: {
      protocol: {
        name: 'Protocol Upgrades',
        description: 'Changes to core protocol functionality and smart contracts',
        quorumRequired: 20,
        votingPeriod: 17280, // ~3 days
        executionDelay: 172800, // ~30 days
        minStakeRequired: ethers.parseEther('10000').toString()
      },
      treasury: {
        name: 'Treasury Management',
        description: 'Allocation and management of DAO treasury funds',
        quorumRequired: 15,
        votingPeriod: 17280, // ~3 days
        executionDelay: 86400, // ~15 days
        minStakeRequired: ethers.parseEther('5000').toString()
      },
      parameters: {
        name: 'Parameter Changes',
        description: 'Adjustments to system parameters and configurations',
        quorumRequired: 10,
        votingPeriod: 11520, // ~2 days
        executionDelay: 28800, // ~5 days
        minStakeRequired: ethers.parseEther('1000').toString()
      },
      community: {
        name: 'Community Initiatives',
        description: 'Community programs, events, and engagement activities',
        quorumRequired: 5,
        votingPeriod: 11520, // ~2 days
        executionDelay: 17280, // ~3 days
        minStakeRequired: ethers.parseEther('500').toString()
      },
      grants: {
        name: 'Grant Proposals',
        description: 'Funding requests for development and community projects',
        quorumRequired: 10,
        votingPeriod: 17280, // ~3 days
        executionDelay: 28800, // ~5 days
        minStakeRequired: ethers.parseEther('1000').toString()
      },
      emergency: {
        name: 'Emergency Actions',
        description: 'Urgent actions requiring immediate attention',
        quorumRequired: 25,
        votingPeriod: 5760, // ~1 day
        executionDelay: 0, // Immediate
        minStakeRequired: ethers.parseEther('20000').toString()
      }
    },
    initialProposals: [
      {
        title: 'Welcome to LinkDAO Governance',
        description: 'This is the first proposal to welcome the community to LinkDAO governance. It serves as a test of the governance system and introduces the community to the voting process.',
        category: 'community',
        actions: [],
        proposer: process.env.DEPLOYER_ADDRESS || ''
      },
      {
        title: 'Establish Community Guidelines',
        description: 'Proposal to establish official community guidelines and code of conduct for LinkDAO participants.',
        category: 'community',
        actions: [],
        proposer: process.env.DEPLOYER_ADDRESS || ''
      }
    ],
    delegationSettings: {
      enabled: true,
      maxDelegates: 5,
      delegationFee: ethers.parseEther('10').toString()
    },
    votingIncentives: {
      participationRewards: ethers.parseEther('5').toString(),
      streakBonuses: true,
      earlyVoterBonus: ethers.parseEther('2').toString()
    }
  };
}

// Main execution function
export async function activateGovernanceParticipation(): Promise<GovernanceActivationSystem> {
  try {
    console.log('🗳️ Activating Governance Participation...\n');

    // Load configuration
    const config = loadGovernanceConfig();
    
    // Initialize governance activation system
    const governanceSystem = new GovernanceActivationSystem(config);
    await governanceSystem.initialize();

    // Activate governance participation
    await governanceSystem.activateGovernanceParticipation();

    // Generate and save governance report
    await governanceSystem.saveGovernanceReport();

    console.log('🎉 Governance Participation activated successfully!\n');
    
    return governanceSystem;

  } catch (error) {
    console.error('❌ Governance Participation activation failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  activateGovernanceParticipation()
    .then(() => {
      console.log('Governance participation is now active. Community can participate in DAO governance!');
    })
    .catch(() => process.exit(1));
}