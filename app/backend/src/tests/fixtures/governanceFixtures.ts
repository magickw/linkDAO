/**
 * Governance Test Fixtures
 * Provides realistic test data for DAO governance functionality
 */

import { TestDataFactory, TestDataOptions } from './testDataFactory';
import { faker } from '@faker-js/faker';

export interface ProposalFixture {
  id: string;
  title: string;
  description: string;
  proposer: string;
  communityId?: string;
  daoId: string;
  type: 'funding' | 'parameter' | 'upgrade' | 'membership' | 'general';
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'expired';
  createdAt: Date;
  startTime: Date;
  endTime: Date;
  executionTime?: Date;
  votingPower: {
    required: string;
    total: string;
    current: string;
  };
  votes: {
    for: string;
    against: string;
    abstain: string;
  };
  quorum: {
    required: string;
    current: string;
    reached: boolean;
  };
  actions?: ProposalActionFixture[];
  metadata: {
    ipfsHash: string;
    tags: string[];
    category: string;
  };
}

export interface ProposalActionFixture {
  id: string;
  target: string;
  value: string;
  signature: string;
  calldata: string;
  description: string;
}

export interface VoteFixture {
  id: string;
  proposalId: string;
  voter: string;
  choice: 'for' | 'against' | 'abstain';
  votingPower: string;
  reason?: string;
  timestamp: Date;
  txHash: string;
}

export interface DAOFixture {
  id: string;
  name: string;
  description: string;
  governanceToken: string;
  treasuryAddress: string;
  memberCount: number;
  totalProposals: number;
  activeProposals: number;
  treasuryValue: string;
  createdAt: Date;
  settings: {
    votingDelay: number; // blocks
    votingPeriod: number; // blocks
    proposalThreshold: string;
    quorumThreshold: string;
    executionDelay: number; // seconds
  };
  metadata: {
    avatar?: string;
    banner?: string;
    website?: string;
    social: {
      twitter?: string;
      discord?: string;
      github?: string;
    };
  };
}

export interface TreasuryDataFixture {
  daoId: string;
  totalValue: string;
  assets: TreasuryAssetFixture[];
  transactions: TreasuryTransactionFixture[];
  allocations: TreasuryAllocationFixture[];
}

export interface TreasuryAssetFixture {
  tokenAddress: string;
  symbol: string;
  name: string;
  balance: string;
  value: string;
  percentage: number;
}

export interface TreasuryTransactionFixture {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: string;
  tokenSymbol: string;
  from: string;
  to: string;
  timestamp: Date;
  txHash: string;
  description?: string;
}

export interface TreasuryAllocationFixture {
  category: string;
  amount: string;
  percentage: number;
  description: string;
}

export interface VotingPowerFixture {
  userId: string;
  daoId: string;
  tokenBalance: string;
  delegatedPower: string;
  totalVotingPower: string;
  delegatedTo?: string;
  delegatedFrom: string[];
}

export class GovernanceFixtures {
  /**
   * Create a single proposal fixture
   */
  static createProposal(overrides: Partial<ProposalFixture> = {}): ProposalFixture {
    const type = faker.helpers.arrayElement(['funding', 'parameter', 'upgrade', 'membership', 'general']);
    const status = faker.helpers.arrayElement(['draft', 'active', 'passed', 'rejected', 'executed', 'expired']);
    const startTime = TestDataFactory.generateTimestamp(30);
    const endTime = faker.date.future({ days: 7, refDate: startTime });
    
    const totalVotingPower = faker.number.float({ min: 1000000, max: 10000000, fractionDigits: 0 });
    const currentVotingPower = faker.number.float({ min: 0, max: totalVotingPower, fractionDigits: 0 });
    const requiredQuorum = totalVotingPower * 0.1; // 10% quorum
    
    const forVotes = faker.number.float({ min: 0, max: currentVotingPower * 0.8, fractionDigits: 0 });
    const againstVotes = faker.number.float({ min: 0, max: currentVotingPower - forVotes, fractionDigits: 0 });
    const abstainVotes = currentVotingPower - forVotes - againstVotes;

    return {
      id: faker.string.uuid(),
      title: this.generateProposalTitle(type),
      description: faker.lorem.paragraphs(3),
      proposer: TestDataFactory.generateWalletAddress(),
      communityId: faker.datatype.boolean({ probability: 0.6 }) ? faker.string.uuid() : undefined,
      daoId: faker.string.uuid(),
      type,
      status,
      createdAt: TestDataFactory.generateTimestamp(45),
      startTime,
      endTime,
      executionTime: status === 'executed' ? faker.date.recent({ days: 7 }) : undefined,
      votingPower: {
        required: requiredQuorum.toString(),
        total: totalVotingPower.toString(),
        current: currentVotingPower.toString(),
      },
      votes: {
        for: forVotes.toString(),
        against: againstVotes.toString(),
        abstain: abstainVotes.toString(),
      },
      quorum: {
        required: requiredQuorum.toString(),
        current: currentVotingPower.toString(),
        reached: currentVotingPower >= requiredQuorum,
      },
      actions: type === 'funding' || type === 'upgrade' ? this.createProposalActions({ count: faker.number.int({ min: 1, max: 3 }) }) : undefined,
      metadata: {
        ipfsHash: TestDataFactory.generateIPFSCid(),
        tags: TestDataFactory.generateTags(3),
        category: faker.helpers.arrayElement(['treasury', 'governance', 'community', 'technical', 'partnership']),
      },
      ...overrides
    };
  }

  /**
   * Create multiple proposal fixtures
   */
  static createProposals(options: TestDataOptions = {}): ProposalFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createProposal(options.overrides),
      options
    );
  }

  /**
   * Create a proposal action fixture
   */
  static createProposalAction(overrides: Partial<ProposalActionFixture> = {}): ProposalActionFixture {
    return {
      id: faker.string.uuid(),
      target: TestDataFactory.generateWalletAddress(),
      value: TestDataFactory.generateTokenAmount(0, 1000),
      signature: 'transfer(address,uint256)',
      calldata: `0x${faker.string.hexadecimal({ length: 128, prefix: '' })}`,
      description: faker.lorem.sentence(),
      ...overrides
    };
  }

  /**
   * Create multiple proposal action fixtures
   */
  static createProposalActions(options: TestDataOptions = {}): ProposalActionFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createProposalAction(options.overrides),
      options
    );
  }

  /**
   * Create a vote fixture
   */
  static createVote(overrides: Partial<VoteFixture> = {}): VoteFixture {
    return {
      id: faker.string.uuid(),
      proposalId: faker.string.uuid(),
      voter: TestDataFactory.generateWalletAddress(),
      choice: faker.helpers.arrayElement(['for', 'against', 'abstain']),
      votingPower: TestDataFactory.generateTokenAmount(100, 10000),
      reason: faker.datatype.boolean({ probability: 0.4 }) ? faker.lorem.sentence() : undefined,
      timestamp: TestDataFactory.generateTimestamp(7),
      txHash: TestDataFactory.generateTxHash(),
      ...overrides
    };
  }

  /**
   * Create multiple vote fixtures
   */
  static createVotes(options: TestDataOptions = {}): VoteFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createVote(options.overrides),
      options
    );
  }

  /**
   * Create a DAO fixture
   */
  static createDAO(overrides: Partial<DAOFixture> = {}): DAOFixture {
    const memberCount = faker.number.int({ min: 50, max: 50000 });
    const totalProposals = faker.number.int({ min: 5, max: 200 });
    const activeProposals = faker.number.int({ min: 0, max: Math.min(10, totalProposals) });

    return {
      id: faker.string.uuid(),
      name: `${faker.company.name()} DAO`,
      description: faker.lorem.paragraph(),
      governanceToken: TestDataFactory.generateWalletAddress(),
      treasuryAddress: TestDataFactory.generateWalletAddress(),
      memberCount,
      totalProposals,
      activeProposals,
      treasuryValue: faker.number.float({ min: 100000, max: 50000000, fractionDigits: 2 }).toString(),
      createdAt: TestDataFactory.generateTimestamp(365),
      settings: {
        votingDelay: faker.number.int({ min: 1, max: 7 }) * 7200, // 1-7 days in blocks
        votingPeriod: faker.number.int({ min: 3, max: 14 }) * 7200, // 3-14 days in blocks
        proposalThreshold: faker.number.float({ min: 1000, max: 100000, fractionDigits: 0 }).toString(),
        quorumThreshold: faker.number.int({ min: 5, max: 20 }).toString(), // percentage
        executionDelay: faker.number.int({ min: 1, max: 7 }) * 86400, // 1-7 days in seconds
      },
      metadata: {
        avatar: faker.image.avatar(),
        banner: faker.image.url({ width: 800, height: 200 }),
        website: faker.datatype.boolean({ probability: 0.6 }) ? faker.internet.url() : undefined,
        social: {
          twitter: faker.datatype.boolean({ probability: 0.7 }) ? faker.internet.userName() : undefined,
          discord: faker.datatype.boolean({ probability: 0.8 }) ? faker.internet.url() : undefined,
          github: faker.datatype.boolean({ probability: 0.4 }) ? faker.internet.userName() : undefined,
        },
      },
      ...overrides
    };
  }

  /**
   * Create multiple DAO fixtures
   */
  static createDAOs(options: TestDataOptions = {}): DAOFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createDAO(options.overrides),
      options
    );
  }

  /**
   * Create treasury data fixture
   */
  static createTreasuryData(overrides: Partial<TreasuryDataFixture> = {}): TreasuryDataFixture {
    const assets = this.createTreasuryAssets({ count: faker.number.int({ min: 3, max: 8 }) });
    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);

    return {
      daoId: faker.string.uuid(),
      totalValue: totalValue.toString(),
      assets,
      transactions: this.createTreasuryTransactions({ count: faker.number.int({ min: 10, max: 50 }) }),
      allocations: this.createTreasuryAllocations({ count: 4 }),
      ...overrides
    };
  }

  /**
   * Create treasury asset fixture
   */
  static createTreasuryAsset(overrides: Partial<TreasuryAssetFixture> = {}): TreasuryAssetFixture {
    const tokens = [
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'DAI', name: 'Dai Stablecoin' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
      { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'AAVE', name: 'Aave' },
    ];

    const token = faker.helpers.arrayElement(tokens);
    const balance = faker.number.float({ min: 100, max: 100000, fractionDigits: 6 });
    const price = faker.number.float({ min: 1, max: 5000, fractionDigits: 2 });
    const value = balance * price;

    return {
      tokenAddress: TestDataFactory.generateWalletAddress(),
      symbol: token.symbol,
      name: token.name,
      balance: balance.toString(),
      value: value.toString(),
      percentage: 0, // Will be calculated when creating treasury data
      ...overrides
    };
  }

  /**
   * Create multiple treasury asset fixtures
   */
  static createTreasuryAssets(options: TestDataOptions = {}): TreasuryAssetFixture[] {
    const assets = TestDataFactory.generateTestData(
      () => this.createTreasuryAsset(options.overrides),
      options
    );

    // Calculate percentages
    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
    return assets.map(asset => ({
      ...asset,
      percentage: (parseFloat(asset.value) / totalValue) * 100
    }));
  }

  /**
   * Create treasury transaction fixture
   */
  static createTreasuryTransaction(overrides: Partial<TreasuryTransactionFixture> = {}): TreasuryTransactionFixture {
    const type = faker.helpers.arrayElement(['incoming', 'outgoing']);
    const tokens = ['ETH', 'USDC', 'DAI', 'WBTC'];

    return {
      id: faker.string.uuid(),
      type,
      amount: TestDataFactory.generateTokenAmount(1, 10000),
      tokenSymbol: faker.helpers.arrayElement(tokens),
      from: TestDataFactory.generateWalletAddress(),
      to: TestDataFactory.generateWalletAddress(),
      timestamp: TestDataFactory.generateTimestamp(90),
      txHash: TestDataFactory.generateTxHash(),
      description: faker.datatype.boolean({ probability: 0.6 }) ? faker.lorem.sentence() : undefined,
      ...overrides
    };
  }

  /**
   * Create multiple treasury transaction fixtures
   */
  static createTreasuryTransactions(options: TestDataOptions = {}): TreasuryTransactionFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createTreasuryTransaction(options.overrides),
      options
    );
  }

  /**
   * Create treasury allocation fixture
   */
  static createTreasuryAllocation(overrides: Partial<TreasuryAllocationFixture> = {}): TreasuryAllocationFixture {
    const categories = [
      { category: 'Development', percentage: 40 },
      { category: 'Marketing', percentage: 25 },
      { category: 'Operations', percentage: 20 },
      { category: 'Reserve', percentage: 15 },
    ];

    const allocation = faker.helpers.arrayElement(categories);
    const amount = faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 });

    return {
      category: allocation.category,
      amount: amount.toString(),
      percentage: allocation.percentage,
      description: faker.lorem.sentence(),
      ...overrides
    };
  }

  /**
   * Create multiple treasury allocation fixtures
   */
  static createTreasuryAllocations(options: TestDataOptions = {}): TreasuryAllocationFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createTreasuryAllocation(options.overrides),
      options
    );
  }

  /**
   * Create voting power fixture
   */
  static createVotingPower(overrides: Partial<VotingPowerFixture> = {}): VotingPowerFixture {
    const tokenBalance = faker.number.float({ min: 100, max: 100000, fractionDigits: 6 });
    const delegatedPower = faker.number.float({ min: 0, max: 50000, fractionDigits: 6 });
    const totalVotingPower = tokenBalance + delegatedPower;

    return {
      userId: faker.string.uuid(),
      daoId: faker.string.uuid(),
      tokenBalance: tokenBalance.toString(),
      delegatedPower: delegatedPower.toString(),
      totalVotingPower: totalVotingPower.toString(),
      delegatedTo: faker.datatype.boolean({ probability: 0.3 }) ? TestDataFactory.generateWalletAddress() : undefined,
      delegatedFrom: TestDataFactory.generateTestData(
        () => TestDataFactory.generateWalletAddress(),
        { count: faker.number.int({ min: 0, max: 5 }) }
      ),
      ...overrides
    };
  }

  /**
   * Generate realistic proposal titles based on type
   */
  private static generateProposalTitle(type: string): string {
    const titles = {
      funding: [
        'Allocate funds for community development',
        'Grant proposal for marketing campaign',
        'Treasury allocation for new partnerships',
        'Funding request for technical infrastructure'
      ],
      parameter: [
        'Adjust voting period duration',
        'Update quorum threshold requirements',
        'Modify proposal submission requirements',
        'Change treasury allocation percentages'
      ],
      upgrade: [
        'Upgrade governance contract to v2',
        'Implement new voting mechanism',
        'Deploy enhanced treasury management',
        'Add multi-signature security features'
      ],
      membership: [
        'Add new core team member',
        'Grant moderator privileges',
        'Remove inactive council member',
        'Establish contributor recognition program'
      ],
      general: [
        'Community guidelines update',
        'Partnership with external protocol',
        'Establish working group structure',
        'Define community roadmap priorities'
      ]
    };

    return faker.helpers.arrayElement(titles[type] || titles.general);
  }

  /**
   * Create active proposals
   */
  static createActiveProposals(count = 5): ProposalFixture[] {
    return this.createProposals({
      count,
      overrides: {
        status: 'active',
        startTime: TestDataFactory.generateTimestamp(7),
        endTime: faker.date.future({ days: 7 })
      }
    });
  }

  /**
   * Create trending DAOs
   */
  static createTrendingDAOs(count = 8): DAOFixture[] {
    return this.createDAOs({
      count,
      overrides: {
        memberCount: faker.number.int({ min: 1000, max: 100000 }),
        activeProposals: faker.number.int({ min: 2, max: 8 }),
        treasuryValue: faker.number.float({ min: 1000000, max: 100000000, fractionDigits: 2 }).toString()
      }
    });
  }

  /**
   * Create a complete governance dataset
   */
  static createGovernanceData(): {
    daos: DAOFixture[];
    proposals: ProposalFixture[];
    votes: VoteFixture[];
    treasuryData: TreasuryDataFixture[];
    votingPowers: VotingPowerFixture[];
  } {
    const daos = this.createDAOs({ count: 10 });
    const proposals = this.createProposals({ count: 50 });
    const votes = this.createVotes({ count: 200 });
    const treasuryData = daos.map(dao => this.createTreasuryData({ daoId: dao.id }));
    const votingPowers = this.createVotingPowers({ count: 100 });

    return { daos, proposals, votes, treasuryData, votingPowers };
  }

  /**
   * Create multiple voting power fixtures
   */
  static createVotingPowers(options: TestDataOptions = {}): VotingPowerFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createVotingPower(options.overrides),
      options
    );
  }
}
