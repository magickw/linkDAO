import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tooltip, Chip, IconButton, Dialog, DialogTitle, DialogContent, Button } from '@mui/material';
import { Info, ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';

interface FlowNode {
  id: string;
  label: string;
  type: 'source' | 'processor' | 'distribution' | 'destination';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description: string;
  metrics?: {
    revenue?: string;
    percentage?: number;
    amount?: string;
  };
}

interface FlowConnection {
  from: string;
  to: string;
  label?: string;
  percentage?: number;
  color: string;
}

const MonetizationFlowDiagram: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const nodes: FlowNode[] = [
    // Revenue Sources
    {
      id: 'tipping',
      label: 'Content Tipping',
      type: 'source',
      x: 50,
      y: 50,
      width: 140,
      height: 80,
      color: '#4CAF50',
      description: '5% fee from all tips and awards on posts and comments',
      metrics: { revenue: '$125,000', percentage: 25 }
    },
    {
      id: 'boosting',
      label: 'Post Boosting',
      type: 'source',
      x: 50,
      y: 150,
      width: 140,
      height: 80,
      color: '#2196F3',
      description: 'Revenue from promoted posts and content boosting',
      metrics: { revenue: '$85,000', percentage: 17 }
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      type: 'source',
      x: 50,
      y: 250,
      width: 140,
      height: 80,
      color: '#FF9800',
      description: '3.5% transaction fees from marketplace activities',
      metrics: { revenue: '$150,000', percentage: 30 }
    },
    {
      id: 'governance',
      label: 'Governance',
      type: 'source',
      x: 50,
      y: 350,
      width: 140,
      height: 80,
      color: '#9C27B0',
      description: 'Fees from governance participation rewards',
      metrics: { revenue: '$45,000', percentage: 9 }
    },
    {
      id: 'api',
      label: 'API Access',
      type: 'source',
      x: 50,
      y: 450,
      width: 140,
      height: 80,
      color: '#F44336',
      description: 'Subscription fees and LDAO staking for API access',
      metrics: { revenue: '$95,000', percentage: 19 }
    },

    // Central Treasury
    {
      id: 'treasury',
      label: 'DAO Treasury',
      type: 'processor',
      x: 300,
      y: 250,
      width: 160,
      height: 100,
      color: '#607D8B',
      description: 'Central collection and distribution point for all revenue',
      metrics: { revenue: '$500,000', percentage: 100 }
    },

    // Distribution Destinations
    {
      id: 'dao_fund',
      label: 'DAO Operations',
      type: 'destination',
      x: 550,
      y: 50,
      width: 140,
      height: 80,
      color: '#795548',
      description: 'Core operations, team salaries, infrastructure',
      metrics: { amount: '$175,000', percentage: 35 }
    },
    {
      id: 'community',
      label: 'Community Pool',
      type: 'destination',
      x: 550,
      y: 150,
      width: 140,
      height: 80,
      color: '#009688',
      description: 'Community rewards, events, and initiatives',
      metrics: { amount: '$125,000', percentage: 25 }
    },
    {
      id: 'subdaos',
      label: 'SubDAOs',
      type: 'destination',
      x: 550,
      y: 250,
      width: 140,
      height: 80,
      color: '#3F51B5',
      description: 'Revenue distribution to community SubDAOs',
      metrics: { amount: '$100,000', percentage: 20 }
    },
    {
      id: 'rewards',
      label: 'Staking Rewards',
      type: 'destination',
      x: 550,
      y: 350,
      width: 140,
      height: 80,
      color: '#00BCD4',
      description: 'Rewards for LDAO stakers and liquidity providers',
      metrics: { amount: '$75,000', percentage: 15 }
    },
    {
      id: 'development',
      label: 'Development',
      type: 'destination',
      x: 550,
      y: 450,
      width: 140,
      height: 80,
      color: '#FF5722',
      description: 'Platform development and feature updates',
      metrics: { amount: '$25,000', percentage: 5 }
    }
  ];

  const connections: FlowConnection[] = [
    // Sources to Treasury
    { from: 'tipping', to: 'treasury', color: '#4CAF50' },
    { from: 'boosting', to: 'treasury', color: '#2196F3' },
    { from: 'marketplace', to: 'treasury', color: '#FF9800' },
    { from: 'governance', to: 'treasury', color: '#9C27B0' },
    { from: 'api', to: 'treasury', color: '#F44336' },

    // Treasury to Destinations
    { from: 'treasury', to: 'dao_fund', percentage: 35, color: '#795548' },
    { from: 'treasury', to: 'community', percentage: 25, color: '#009688' },
    { from: 'treasury', to: 'subdaos', percentage: 20, color: '#3F51B5' },
    { from: 'treasury', to: 'rewards', percentage: 15, color: '#00BCD4' },
    { from: 'treasury', to: 'development', percentage: 5, color: '#FF5722' }
  ];

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
    setDetailsOpen(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderNode = (node: FlowNode) => {
    const nodeStyle = {
      position: 'absolute' as const,
      left: `${node.x}px`,
      top: `${node.y}px`,
      width: `${node.width}px`,
      height: `${node.height}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      cursor: 'pointer'
    };

    const getNodeBorderRadius = () => {
      switch (node.type) {
        case 'source': return '20px 5px';
        case 'processor': return '10px';
        case 'destination': return '5px 20px';
        default: return '10px';
      }
    };

    return (
      <Tooltip
        key={node.id}
        title={`${node.label}: ${node.description}`}
        arrow
        placement="top"
      >
        <Paper
          style={nodeStyle}
          sx={{
            backgroundColor: node.color,
            borderRadius: getNodeBorderRadius(),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 1,
            boxShadow: 3,
            border: '2px solid rgba(255,255,255,0.2)',
            '&:hover': {
              boxShadow: 6,
              transform: `scale(${scale * 1.05})`,
              zIndex: 10
            },
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNodeClick(node)}
        >
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
            {node.label}
          </Typography>
          {node.metrics && (
            <Box sx={{ mt: 1 }}>
              {node.metrics.revenue && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '10px' }}>
                  {node.metrics.revenue}
                </Typography>
              )}
              {node.metrics.percentage && (
                <Chip
                  label={`${node.metrics.percentage}%`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '10px',
                    height: '20px',
                    mt: 0.5
                  }}
                />
              )}
            </Box>
          )}
        </Paper>
      </Tooltip>
    );
  };

  const renderConnection = (connection: FlowConnection, index: number) => {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    const fromX = (fromNode.x + fromNode.width / 2) * scale + offset.x;
    const fromY = (fromNode.y + fromNode.height / 2) * scale + offset.y;
    const toX = (toNode.x + toNode.width / 2) * scale + offset.x;
    const toY = (toNode.y + toNode.height / 2) * scale + offset.y;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return (
      <g key={index}>
        <defs>
          <marker
            id={`arrowhead-${index}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={connection.color}
            />
          </marker>
        </defs>
        <line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke={connection.color}
          strokeWidth={2 * scale}
          markerEnd={`url(#arrowhead-${index})`}
          opacity={0.6}
        />
        {connection.percentage && (
          <text
            x={midX}
            y={midY - 5}
            fill="white"
            fontSize={12 * scale}
            fontWeight="bold"
            textAnchor="middle"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
            }}
          >
            {connection.percentage}%
          </text>
        )}
      </g>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '600px',
        backgroundColor: '#f5f5f5',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 100,
          display: 'flex',
          gap: 1,
          backgroundColor: 'white',
          padding: 1,
          borderRadius: 1,
          boxShadow: 2
        }}
      >
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset View">
          <IconButton size="small" onClick={handleReset}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        <Tooltip title="About Monetization Flow">
          <IconButton size="small">
            <Info />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Title */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 100,
          backgroundColor: 'white',
          padding: 1,
          borderRadius: 1,
          boxShadow: 2
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
          LinkDAO Monetization Flow
        </Typography>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Total Monthly Revenue: $500,000
        </Typography>
      </Box>

      {/* SVG Canvas for Connections */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {connections.map((connection, index) => renderConnection(connection, index))}
      </svg>

      {/* Nodes Container */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
      >
        {nodes.map(node => renderNode(node))}
      </Box>

      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          backgroundColor: 'white',
          padding: 1,
          borderRadius: 1,
          boxShadow: 2,
          zIndex: 100
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Legend
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: '#4CAF50', borderRadius: '10px 2px' }} />
          <Typography variant="caption">Revenue Sources</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: '#607D8B', borderRadius: 2 }} />
          <Typography variant="caption">Treasury</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: '#009688', borderRadius: '2px 10px' }} />
          <Typography variant="caption">Distribution Destinations</Typography>
        </Box>
      </Box>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedNode?.label}
          <Chip
            label={selectedNode?.type}
            size="small"
            sx={{ ml: 1, backgroundColor: selectedNode?.color, color: 'white' }}
          />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedNode?.description}
          </Typography>
          {selectedNode?.metrics && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Metrics
              </Typography>
              {selectedNode.metrics.revenue && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Revenue: {selectedNode.metrics.revenue}
                </Typography>
              )}
              {selectedNode.metrics.amount && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Amount: {selectedNode.metrics.amount}
                </Typography>
              )}
              {selectedNode.metrics.percentage && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Percentage: {selectedNode.metrics.percentage}%
                </Typography>
              )}
            </Box>
          )}
          <Button onClick={() => setDetailsOpen(false)} sx={{ mt: 2 }}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MonetizationFlowDiagram;