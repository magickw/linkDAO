import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ProgressBar, Button, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { ldaoApi } from '../services/ldaoApi';

interface LDAOStakingInfo {
  totalStaked: string;
  stakingTier: number;
  votingPower: string;
  rewardsEarned: string;
  rewardsClaimed: string;
  nextRewardPayout: string;
  discountPercentage: number;
  stakingBenefits: {
    name: string;
    value: string;
    description: string;
  }[];
}

interface LDAOMarketplaceBenefits {
  currentTier: string;
  tierBenefits: string[];
  transactionVolume: string;
  rewardsEarned: string;
  discountPercentage: number;
  feeReductionPercentage: number;
  ldaoPaymentDiscount: number;
  marketplaceStats: {
    totalTransactions: number;
    totalVolume: number;
    totalRewardsEarned: number;
    averageTransactionValue: number;
  };
}

interface LDAOAcquisitionOptions {
  purchaseWithETH: {
    exchangeRate: string;
    minimumPurchase: string;
    maximumPurchase: string;
  };
  earnThroughActivity: {
    currentBalance: string;
    earnableTokens: string;
    availableTasks: {
      name: string;
      potentialReward: string;
      completionRate: string;
    }[];
  };
  stakingRewards: {
    currentAPR: string;
    estimatedAnnualEarnings: string;
    claimableRewards: string;
  };
}

interface LDAORecentActivity {
  id: string;
  type: 'staking' | 'marketplace' | 'rewards' | 'discount';
  description: string;
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface LDAODashboardData {
  stakingInfo: LDAOStakingInfo;
  marketplaceBenefits: LDAOMarketplaceBenefits;
  acquisitionOptions: LDAOAcquisitionOptions;
  recentActivity: LDAORecentActivity[];
  nextMilestone: {
    name: string;
    description: string;
    progress: number;
    reward: string;
  } | null;
}

const LDAODashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<LDAODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await ldaoApi.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching LDAO dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading LDAO benefits dashboard...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Card>
          <Card.Body>
            <Card.Title>Error</Card.Title>
            <Card.Text>{error}</Card.Text>
            <Button variant="primary" onClick={fetchDashboardData}>
              Retry
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container className="py-4">
        <Card>
          <Card.Body>
            <Card.Title>No Data</Card.Title>
            <Card.Text>No dashboard data available.</Card.Text>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const { stakingInfo, marketplaceBenefits, acquisitionOptions, recentActivity, nextMilestone } = dashboardData;

  // Get tier display info
  const getTierInfo = (tier: number) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const colors = ['text-warning', 'text-secondary', 'text-warning', 'text-info'];
    return { name: tiers[tier] || 'Bronze', color: colors[tier] || 'text-warning' };
  };

  const tierInfo = getTierInfo(stakingInfo.stakingTier);

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>LDAO Benefits Dashboard</h1>
          <p className="text-muted">Manage your LDAO tokens and track your benefits</p>
        </Col>
      </Row>

      {/* Next Milestone Card */}
      {nextMilestone && (
        <Row className="mb-4">
          <Col>
            <Card className="border-primary">
              <Card.Body>
                <Card.Title className="text-primary">Next Milestone: {nextMilestone.name}</Card.Title>
                <Card.Text>{nextMilestone.description}</Card.Text>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Progress: {nextMilestone.progress.toFixed(1)}%</span>
                  <span className="text-success">Reward: {nextMilestone.reward}</span>
                </div>
                <ProgressBar 
                  now={nextMilestone.progress} 
                  variant="primary" 
                  className="mb-2" 
                />
                <Button variant="outline-primary" size="sm">
                  View Details
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Tabs defaultActiveKey="overview" id="ldao-dashboard-tabs" className="mb-4">
        <Tab eventKey="overview" title="Overview">
          <Row>
            {/* Staking Info Card */}
            <Col md={6} lg={4} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Staking Information</Card.Title>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Tier:</span>
                      <span className={`fw-bold ${tierInfo.color}`}>{tierInfo.name}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total Staked:</span>
                      <span>{stakingInfo.totalStaked} LDAO</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Voting Power:</span>
                      <span>{stakingInfo.votingPower}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Rewards Earned:</span>
                      <span>{stakingInfo.rewardsEarned} LDAO</span>
                    </div>
                  </div>
                  <Button variant="primary" className="w-100">
                    Stake LDAO Tokens
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Marketplace Benefits Card */}
            <Col md={6} lg={4} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Marketplace Benefits</Card.Title>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Current Tier:</span>
                      <span className="fw-bold">{marketplaceBenefits.currentTier}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">LDAO Payment Discount:</span>
                      <span className="text-success">-{marketplaceBenefits.discountPercentage}%</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Fee Reduction:</span>
                      <span className="text-success">-{marketplaceBenefits.feeReductionPercentage}%</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Rewards Earned:</span>
                      <span>{marketplaceBenefits.rewardsEarned} LDAO</span>
                    </div>
                  </div>
                  <Button variant="success" className="w-100">
                    Browse Marketplace
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Token Acquisition Card */}
            <Col md={6} lg={4} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Acquire LDAO Tokens</Card.Title>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Current Balance:</span>
                      <span>{acquisitionOptions.earnThroughActivity.currentBalance} LDAO</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Earnable Tokens:</span>
                      <span className="text-info">{acquisitionOptions.earnThroughActivity.earnableTokens} LDAO</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Current APR:</span>
                      <span className="text-success">{acquisitionOptions.stakingRewards.currentAPR}</span>
                    </div>
                  </div>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary">Buy with ETH</Button>
                    <Button variant="outline-success">Earn Tokens</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="staking" title="Staking">
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Staking Benefits</Card.Title>
                  <div className="row">
                    {stakingInfo.stakingBenefits.map((benefit, index) => (
                      <div key={index} className="col-md-6 mb-3">
                        <div className="p-3 border rounded">
                          <h6 className="mb-1">{benefit.name}</h6>
                          <p className="text-success mb-1">{benefit.value}</p>
                          <small className="text-muted">{benefit.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Body>
                  <Card.Title>Tier Progress</Card.Title>
                  <div className="text-center mb-3">
                    <h2 className={`mb-0 ${tierInfo.color}`}>{tierInfo.name}</h2>
                    <p className="text-muted mb-0">LDAO Staking Tier</p>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Voting Power</small>
                    <h5>{stakingInfo.votingPower}</h5>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Rewards Earned</small>
                    <h5>{stakingInfo.rewardsEarned} LDAO</h5>
                  </div>
                  <Button variant="primary" className="w-100">
                    Increase Stake
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="marketplace" title="Marketplace">
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Marketplace Statistics</Card.Title>
                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <div className="p-3 border rounded text-center">
                        <h4>{marketplaceBenefits.marketplaceStats.totalTransactions}</h4>
                        <small className="text-muted">Total Transactions</small>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="p-3 border rounded text-center">
                        <h4>{marketplaceBenefits.marketplaceStats.totalVolume}</h4>
                        <small className="text-muted">Total Volume</small>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="p-3 border rounded text-center">
                        <h4>{marketplaceBenefits.marketplaceStats.totalRewardsEarned}</h4>
                        <small className="text-muted">Rewards Earned</small>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="p-3 border rounded text-center">
                        <h4>{marketplaceBenefits.marketplaceStats.averageTransactionValue}</h4>
                        <small className="text-muted">Avg Value</small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body>
                  <Card.Title>Tier Benefits</Card.Title>
                  <ul className="list-group list-group-flush">
                    {marketplaceBenefits.tierBenefits.map((benefit, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        {benefit}
                        <span className="badge bg-success rounded-pill">Active</span>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Body>
                  <Card.Title>Marketplace Actions</Card.Title>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>Payment Discount:</span>
                      <span className="text-success fw-bold">-{marketplaceBenefits.discountPercentage}%</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Fee Reduction:</span>
                      <span className="text-success fw-bold">-{marketplaceBenefits.feeReductionPercentage}%</span>
                    </div>
                  </div>
                  <Button variant="success" className="w-100 mb-2">Shop with LDAO Discount</Button>
                  <Button variant="outline-primary" className="w-100">Sell with Fee Reduction</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="activity" title="Activity">
          <Row>
            <Col>
              <Card>
                <Card.Body>
                  <Card.Title>Recent Activity</Card.Title>
                  {recentActivity.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="list-group-item d-flex justify-content-between align-items-start">
                          <div className="ms-2 me-auto">
                            <div className="fw-bold">{activity.description}</div>
                            <small className="text-muted">
                              {new Date(activity.timestamp).toLocaleDateString()} 
                              {' '}• {activity.type}
                            </small>
                          </div>
                          <div className="d-flex flex-column align-items-end">
                            <span className={`badge ${activity.status === 'completed' ? 'bg-success' : activity.status === 'pending' ? 'bg-warning' : 'bg-danger'}`}>
                              {activity.status}
                            </span>
                            <small className="text-end">{activity.amount} LDAO</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center my-4">No recent activity</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default LDAODashboard;