import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tooltip, Chip, IconButton, Collapse, Button } from '@mui/material';
import { ExpandMore, ExpandLess, Info, TrendingUp, AccountBalance, Groups, Api, Store, Gavel, Hub } from '@mui/icons-material';

interface RevenueStream {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  fee: string;
  description: string;
  flows: {
    destination: string;
    percentage: number;
    color: string;
  }[];
}

interface RevenueDestination {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  position: { x: number; y: number };
}

const MonetizationFlowDiagram: React.FC = () => {
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(new Set());
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [animatedFlows, setAnimatedFlows] = useState<boolean>(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setAnimatedFlows(true), 500);
  }, []);

  const revenueStreams: RevenueStream[] = [
    {
      id: 'tipping',
      name: 'Tipping & Awards',
      icon: <TrendingUp />,
      color: '#4CAF50',
      fee: '5%',
      description: 'Revenue from tips and awards on posts/comments',
      flows: [
        { destination: 'dao-treasury', percentage: 40, color: '#FF9800' },
        { destination: 'community-pool', percentage: 30, color: '#2196F3' },
        { destination: 'subdaos', percentage: 15, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 3, color: '#00BCD4' },
        { destination: 'reserves', percentage: 2, color: '#607D8B' }
      ]
    },
    {
      id: 'marketplace',
      name: 'Marketplace Fees',
      icon: <Store />,
      color: '#FF9800',
      fee: '3.5%',
      description: 'Transaction fees from marketplace activities',
      flows: [
        { destination: 'dao-treasury', percentage: 35, color: '#FF9800' },
        { destination: 'community-pool', percentage: 25, color: '#2196F3' },
        { destination: 'subdaos', percentage: 20, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'boosting',
      name: 'Post Boosting',
      icon: <TrendingUp />,
      color: '#E91E63',
      fee: '10%',
      description: 'Revenue from promoted posts and content boosting',
      flows: [
        { destination: 'dao-treasury', percentage: 30, color: '#FF9800' },
        { destination: 'community-pool', percentage: 30, color: '#2196F3' },
        { destination: 'subdaos', percentage: 20, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'governance',
      name: 'Governance Rewards',
      icon: <Gavel />,
      color: '#9C27B0',
      fee: '2%',
      description: 'Fees from governance participation and rewards',
      flows: [
        { destination: 'dao-treasury', percentage: 20, color: '#FF9800' },
        { destination: 'community-pool', percentage: 20, color: '#2196F3' },
        { destination: 'subdaos', percentage: 30, color: '#9C27B0' },
        { destination: 'rewards', percentage: 20, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'api-access',
      name: 'API Access',
      icon: <Api />,
      color: '#00BCD4',
      fee: '15%',
      description: 'Revenue from API subscriptions and usage fees',
      flows: [
        { destination: 'dao-treasury', percentage: 50, color: '#FF9800' },
        { destination: 'community-pool', percentage: 15, color: '#2196F3' },
        { destination: 'subdaos', percentage: 10, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 10, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'subdao-economy',
      name: 'SubDAO Economy',
      icon: <Groups />,
      color: '#795548',
      fee: 'Varies',
      description: 'Revenue from SubDAO operations and staking',
      flows: [
        { destination: 'dao-treasury', percentage: 20, color: '#FF9800' },
        { destination: 'community-pool', percentage: 15, color: '#2196F3' },
        { destination: 'subdaos', percentage: 40, color: '#9C27B0' },
        { destination: 'rewards', percentage: 15, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    }
  ];

  const destinations: RevenueDestination[] = [
    {
      id: 'dao-treasury',
      name: 'DAO Treasury',
      icon: <AccountBalance />,
      color: '#FF9800',
      description: 'Main treasury for DAO operations and strategic initiatives',
      position: { x: 50, y: 20 }
    },
    {
      id: 'community-pool',
      name: 'Community Pool',
      icon: <Groups />,
      color: '#2196F3',
      description: 'Funds for community rewards, events, and initiatives',
      position: { x: 20, y: 50 }
    },
    {
      id: 'subdaos',
      name: 'SubDAOs',
      icon: <Hub />,
      color: '#9C27B0',
      description: 'Revenue distribution to community SubDAOs',
      position: { x: 80, y: 50 }
    },
    {
      id: 'rewards',
      name: 'Rewards',
      icon: <TrendingUp />,
      color: '#F44336',
      description: 'Staking, governance, and participation rewards',
      position: { x: 20, y: 80 }
    },
    {
      id: 'development',
      name: 'Development',
      icon: <Api />,
      color: '#00BCD4',
      description: 'Platform development and maintenance',
      position: { x: 50, y: 80 }
    },
    {
      id: 'reserves',
      name: 'Reserves',
      icon: <AccountBalance />,
      color: '#607D8B',
      description: 'Emergency reserves and long-term sustainability',
      position: { x: 80, y: 80 }
    }
  ];

  const toggleStream = (streamId: string) => {
    const newExpanded = new Set(expandedStreams);
    if (newExpanded.has(streamId)) {
      newExpanded.delete(streamId);
    } else {
      newExpanded.add(streamId);
    }
    setExpandedStreams(newExpanded);
  };

  const renderFlowPath = (stream: RevenueStream, flow: any, index: number) => {
    const sourceEl = document.getElementById(`stream-${stream.id}`);
    const destEl = document.getElementById(`dest-${flow.destination}`);
    
    if (!sourceEl || !destEl) return null;

    const sourceRect = sourceEl.getBoundingClientRect();
    const destRect = destEl.getBoundingClientRect();
    
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.bottom;
    const endX = destRect.left + destRect.width / 2;
    const endY = destRect.top;
    
    const midY = (startY + endY) / 2;
    const controlX = startX + (endX - startX) * 0.3;

    return (
      <g key={`${stream.id}-${flow.destination}-${index}`}>
        <defs>
          <marker
            id={`arrowhead-${stream.id}-${flow.destination}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={flow.color}
              opacity="0.7"
            />
          </marker>
        </defs>
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${midY} ${endX} ${endY}`}
          stroke={flow.color}
          strokeWidth={Math.max(2, flow.percentage / 5)}
          fill="none"
          strokeOpacity={0.6}
          markerEnd={`url(#arrowhead-${stream.id}-${flow.destination})`}
          className={animatedFlows ? 'flow-animate' : ''}
          style={{
            animationDelay: `${index * 0.2}s`,
            strokeDasharray: '5, 5'
          }}
        />
        <text
          x={(startX + endX) / 2}
          y={midY - 10}
          fill={flow.color}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          opacity="0.8"
        >
          {flow.percentage}%
        </text>
      </g>
    );
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
        LinkDAO Monetization Flow
      </Typography>
      
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Comprehensive revenue distribution across the LinkDAO ecosystem
      </Typography>

      {/* Revenue Sources */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4, justifyContent: 'center' }}>
        {revenueStreams.map((stream) => (
          <Paper
            key={stream.id}
            id={`stream-${stream.id}`}
            sx={{
              p: 2,
              minWidth: 200,
              backgroundColor: stream.color,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: selectedStream === stream.id ? 'scale(1.05)' : 'scale(1)',
              boxShadow: selectedStream === stream.id ? 6 : 2
            }}
            onClick={() => setSelectedStream(stream.id === selectedStream ? null : stream.id)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {stream.icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {stream.name}
              </Typography>
            </Box>
            <Chip
              label={`${stream.fee} fee`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                mb: 1
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStream(stream.id);
                }}
                sx={{ color: 'white' }}
              >
                {expandedStreams.has(stream.id) ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
              <Tooltip title={stream.description}>
                <Info fontSize="small" sx={{ color: 'white' }} />
              </Tooltip>
            </Box>
            <Collapse in={expandedStreams.has(stream.id)}>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Revenue Distribution:
                </Typography>
                {stream.flows.map((flow, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">
                      {destinations.find(d => d.id === flow.destination)?.name}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {flow.percentage}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Paper>
        ))}
      </Box>

      {/* SVG for flow lines */}
      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        {selectedStream && revenueStreams
          .find(s => s.id === selectedStream)
          ?.flows.map((flow, index) => renderFlowPath(
            revenueStreams.find(s => s.id === selectedStream)!,
            flow,
            index
          ))}
      </svg>

      {/* Revenue Destinations */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mt: 4 }}>
        {destinations.map((dest) => (
          <Paper
            key={dest.id}
            id={`dest-${dest.id}`}
            sx={{
              p: 2,
              minWidth: 180,
              backgroundColor: dest.color,
              color: 'white',
              transition: 'all 0.3s ease',
              opacity: selectedStream && 
                !revenueStreams.find(s => s.id === selectedStream)?.flows.find(f => f.destination === dest.id)
                ? 0.3 : 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {dest.icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {dest.name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {dest.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Summary Statistics */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'white' }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Revenue Distribution Summary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {destinations.map((dest) => {
            const totalPercentage = revenueStreams.reduce((sum, stream) => {
              const flow = stream.flows.find(f => f.destination === dest.id);
              return sum + (flow ? flow.percentage : 0);
            }, 0);
            
            return (
              <Box key={dest.id} sx={{ minWidth: 150 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: dest.color,
                      borderRadius: '50%',
                      mr: 1
                    }}
                  />
                  <Typography variant="subtitle2" fontWeight="bold">
                    {dest.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Average: {(totalPercentage / revenueStreams.length).toFixed(1)}%
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mt: 2, backgroundColor: 'white' }}>
        <Typography variant="subtitle2" gutterBottom>
          How it works:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1. Revenue is generated from various streams across the ecosystem<br/>
          2. Each stream has a specific fee structure<br/>
          3. Revenue is automatically distributed according to predefined rules<br/>
          4. Funds flow to different destinations based on community needs and strategic priorities<br/>
          5. SubDAOs receive a portion to fund their local economies<br/>
          6. Rewards fund staking and participation incentives<br/>
          7. Development fund ensures platform growth and maintenance<br/>
          8. Reserves provide long-term sustainability and emergency funds
        </Typography>
      </Paper>

      <style jsx>{`
        @keyframes flow-animate {
          from {
            stroke-dashoffset: 10;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .flow-animate {
          animation: flow-animate 2s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default MonetizationFlowDiagram;