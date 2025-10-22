import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  StarIcon,
  Cog6ToothIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import DEXTradingInterface from './DEXTradingInterface';

interface TradingDashboardProps {
  userAddress?: string;
}

interface PortfolioToken {
  symbol: string;
  name: string;
  balance: string;
  value: number;
  change24h: number;
  allocation: number;
}

interface TradeHistory {
  id: string;
  type: 'buy' | 'sell' | 'swap';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  price: number;
  timestamp: Date;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

interface LiquidityPool {
  id: string;
  name: string;
  tokens: string[];
  tvl: string;
  apr: number;
  volume24h: string;
  fees24h: string;
}

export default function TradingDashboard({ userAddress }: TradingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'trade' | 'portfolio' | 'history' | 'liquidity'>('trade');
  const [portfolio, setPortfolio] = useState<PortfolioToken[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolioChange24h, setPortfolioChange24h] = useState(0);
  const [showTradingInterface, setShowTradingInterface] = useState(false);

  useEffect(() => {
    if (userAddress) {
      loadPortfolioData();
      loadTradeHistory();
      loadLiquidityPools();
    }
  }, [userAddress]);

  const loadPortfolioData = async () => {
    try {
      // Mock portfolio data - in real implementation, fetch from blockchain/API
      const mockPortfolio: PortfolioToken[] = [
        {
          symbol: 'LDAO',
          name: 'LinkDAO Token',
          balance: '15000',
          value: 150,
          change24h: 5.2,
          allocation: 45
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '0.5',
          value: 1200,
          change24h: -2.1,
          allocation: 35
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '500',
          value: 500,
          change24h: 0.1,
          allocation: 15
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          balance: '0.01',
          value: 650,
          change24h: 3.8,
          allocation: 5
        }
      ];
      
      setPortfolio(mockPortfolio);
      
      const totalValue = mockPortfolio.reduce((sum, token) => sum + token.value, 0);
      setTotalPortfolioValue(totalValue);
      
      const weightedChange = mockPortfolio.reduce((sum, token) => 
        sum + (token.change24h * token.allocation / 100), 0
      );
      setPortfolioChange24h(weightedChange);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const loadTradeHistory = async () => {
    try {
      // Mock trade history - in real implementation, fetch from API
      const mockHistory: TradeHistory[] = [
        {
          id: '1',
          type: 'swap',
          fromToken: 'ETH',
          toToken: 'LDAO',
          fromAmount: '0.1',
          toAmount: '2400',
          price: 0.01,
          timestamp: new Date(Date.now() - 3600000),
          txHash: '0x1234...5678',
          status: 'completed'
        },
        {
          id: '2',
          type: 'buy',
          fromToken: 'USDC',
          toToken: 'LDAO',
          fromAmount: '100',
          toAmount: '10000',
          price: 0.01,
          timestamp: new Date(Date.now() - 7200000),
          txHash: '0x2345...6789',
          status: 'completed'
        },
        {
          id: '3',
          type: 'swap',
          fromToken: 'WBTC',
          toToken: 'ETH',
          fromAmount: '0.005',
          toAmount: '0.135',
          price: 27,
          timestamp: new Date(Date.now() - 86400000),
          txHash: '0x3456...7890',
          status: 'completed'
        }
      ];
      
      setTradeHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load trade history:', error);
    }
  };

  const loadLiquidityPools = async () => {
    try {
      // Mock liquidity pools - in real implementation, fetch from DEX APIs
      const mockPools: LiquidityPool[] = [
        {
          id: '1',
          name: 'LDAO/ETH',
          tokens: ['LDAO', 'ETH'],
          tvl: '$2.4M',
          apr: 24.5,
          volume24h: '$156K',
          fees24h: '$468'
        },
        {
          id: '2',
          name: 'LDAO/USDC',
          tokens: ['LDAO', 'USDC'],
          tvl: '$1.8M',
          apr: 18.2,
          volume24h: '$89K',
          fees24h: '$267'
        },
        {
          id: '3',
          name: 'ETH/USDC',
          tokens: ['ETH', 'USDC'],
          tvl: '$45M',
          apr: 12.8,
          volume24h: '$2.1M',
          fees24h: '$6.3K'
        }
      ];
      
      setLiquidityPools(mockPools);
    } catch (error) {
      console.error('Failed to load liquidity pools:', error);
    }
  };

  const PortfolioCard = ({ token }: { token: PortfolioToken }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="font-bold text-sm">{token.symbol[0]}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{token.symbol}</div>
            <div className="text-sm text-gray-500">{token.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">${token.value.toFixed(2)}</div>
          <div className={`text-sm flex items-center ${
            token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {token.change24h >= 0 ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            )}
            {Math.abs(token.change24h).toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Balance</span>
          <span className="font-medium">{parseFloat(token.balance).toLocaleString()} {token.symbol}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Allocation</span>
          <span className="font-medium">{token.allocation}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${token.allocation}%` }}
          />
        </div>
      </div>
    </div>
  );

  const TradeHistoryRow = ({ trade }: { trade: TradeHistory }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          trade.type === 'buy' ? 'bg-green-100 text-green-600' :
          trade.type === 'sell' ? 'bg-red-100 text-red-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          <ArrowsRightLeftIcon className="w-4 h-4" />
        </div>
        
        <div>
          <div className="font-medium text-gray-900">
            {trade.type === 'swap' ? 'Swap' : trade.type === 'buy' ? 'Buy' : 'Sell'}
          </div>
          <div className="text-sm text-gray-500">
            {trade.fromAmount} {trade.fromToken} → {trade.toAmount} {trade.toToken}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-medium text-gray-900">
          ${(parseFloat(trade.fromAmount) * trade.price).toFixed(2)}
        </div>
        <div className="text-sm text-gray-500">
          {trade.timestamp.toLocaleTimeString()}
        </div>
      </div>
      
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
        trade.status === 'completed' ? 'bg-green-100 text-green-800' :
        trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {trade.status}
      </div>
    </div>
  );

  const LiquidityPoolCard = ({ pool }: { pool: LiquidityPool }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{pool.name}</h3>
          <div className="text-sm text-gray-500">
            {pool.tokens.join(' / ')} Pool
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">{pool.apr}%</div>
          <div className="text-sm text-gray-500">APR</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600">TVL</div>
          <div className="font-medium">{pool.tvl}</div>
        </div>
        <div>
          <div className="text-gray-600">24h Volume</div>
          <div className="font-medium">{pool.volume24h}</div>
        </div>
        <div>
          <div className="text-gray-600">24h Fees</div>
          <div className="font-medium">{pool.fees24h}</div>
        </div>
        <div>
          <div className="text-gray-600">Your Share</div>
          <div className="font-medium">0%</div>
        </div>
      </div>
      
      <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
        Add Liquidity
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your LDAO trading and portfolio</p>
        </div>
        
        <button
          onClick={() => setShowTradingInterface(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Quick Trade
        </button>
      </div>

      {/* Portfolio Overview */}
      {userAddress && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${totalPortfolioValue.toLocaleString()}
              </div>
              <div className="text-gray-600">Total Portfolio Value</div>
            </div>
            
            <div className="text-center">
              <div className={`text-3xl font-bold mb-1 flex items-center justify-center ${
                portfolioChange24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioChange24h >= 0 ? (
                  <ArrowTrendingUpIcon className="w-8 h-8 mr-2" />
                ) : (
                  <ArrowTrendingDownIcon className="w-8 h-8 mr-2" />
                )}
                {Math.abs(portfolioChange24h).toFixed(1)}%
              </div>
              <div className="text-gray-600">24h Change</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {portfolio.length}
              </div>
              <div className="text-gray-600">Assets</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
        {[
          { id: 'trade', label: 'Trade', icon: ArrowsRightLeftIcon },
          { id: 'portfolio', label: 'Portfolio', icon: ChartBarIcon },
          { id: 'history', label: 'History', icon: ClockIcon },
          { id: 'liquidity', label: 'Liquidity', icon: StarIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <DEXTradingInterface userAddress={userAddress} />
          </div>
          
          <div className="space-y-6">
            {/* Market Overview */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">LDAO Price</span>
                  <div className="text-right">
                    <div className="font-semibold">$0.0102</div>
                    <div className="text-sm text-green-600">+2.4%</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">24h Volume</span>
                  <div className="font-semibold">$245K</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Market Cap</span>
                  <div className="font-semibold">$10.2M</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Circulating Supply</span>
                  <div className="font-semibold">1B LDAO</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="font-medium">Buy LDAO</div>
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔄</div>
                    <div className="font-medium">Swap Tokens</div>
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-medium">Stake LDAO</div>
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🌊</div>
                    <div className="font-medium">Add Liquidity</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div>
          {userAddress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((token) => (
                <PortfolioCard key={token.symbol} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👛</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-6">Connect your wallet to view your portfolio</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Trade History</h3>
          </div>
          
          {userAddress ? (
            <div>
              {tradeHistory.length > 0 ? (
                tradeHistory.map((trade) => (
                  <TradeHistoryRow key={trade.id} trade={trade} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trades yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-6">Connect your wallet to view your trade history</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'liquidity' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Liquidity Pools</h2>
            <p className="text-gray-600">Provide liquidity to earn fees and rewards</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liquidityPools.map((pool) => (
              <LiquidityPoolCard key={pool.id} pool={pool} />
            ))}
          </div>
        </div>
      )}

      {/* Trading Interface Modal */}
      {showTradingInterface && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md w-full mx-4">
            <DEXTradingInterface 
              userAddress={userAddress} 
              onClose={() => setShowTradingInterface(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}