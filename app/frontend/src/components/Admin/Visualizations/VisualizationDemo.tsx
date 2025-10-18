import React, { useState, useEffect } from 'react';
import {
  LineChart,
  BarChart,
  PieChart,
  DoughnutChart,
  HeatmapChart,
  TreemapChart,
  NetworkGraph,
  InteractiveChart,
  RealTimeChart,
  CrossFilterManager,
  ChartDataCacheProvider,
} from './index';
import { InteractionConfig, HeatmapData, TreemapData, NetworkNode, NetworkLink } from './types';
import { adminColors } from './theme';

const VisualizationDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('line');

  // Sample data for different chart types
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Users',
        data: [65, 59, 80, 81, 56, 55],
        borderColor: adminColors.primary[0],
        backgroundColor: `${adminColors.primary[0]}20`,
        tension: 0.4,
      },
      {
        label: 'Revenue',
        data: [28, 48, 40, 19, 86, 27],
        borderColor: adminColors.primary[1],
        backgroundColor: `${adminColors.primary[1]}20`,
        tension: 0.4,
      },
    ],
  };

  const barData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Sales',
        data: [12, 19, 3, 5],
        backgroundColor: adminColors.primary[0],
      },
      {
        label: 'Profit',
        data: [2, 3, 20, 5],
        backgroundColor: adminColors.primary[1],
      },
    ],
  };

  const pieData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: [300, 50, 100],
        backgroundColor: adminColors.primary.slice(0, 3),
      },
    ],
  };

  const heatmapData: HeatmapData[] = [
    { x: 'Mon', y: 'Morning', value: 10, label: 'Monday Morning' },
    { x: 'Mon', y: 'Afternoon', value: 15, label: 'Monday Afternoon' },
    { x: 'Mon', y: 'Evening', value: 8, label: 'Monday Evening' },
    { x: 'Tue', y: 'Morning', value: 12, label: 'Tuesday Morning' },
    { x: 'Tue', y: 'Afternoon', value: 18, label: 'Tuesday Afternoon' },
    { x: 'Tue', y: 'Evening', value: 6, label: 'Tuesday Evening' },
    { x: 'Wed', y: 'Morning', value: 14, label: 'Wednesday Morning' },
    { x: 'Wed', y: 'Afternoon', value: 20, label: 'Wednesday Afternoon' },
    { x: 'Wed', y: 'Evening', value: 9, label: 'Wednesday Evening' },
  ];

  const treemapData: TreemapData = {
    name: 'Root',
    children: [
      {
        name: 'Frontend',
        value: 100,
        children: [
          { name: 'React', value: 60 },
          { name: 'Vue', value: 25 },
          { name: 'Angular', value: 15 },
        ],
      },
      {
        name: 'Backend',
        value: 80,
        children: [
          { name: 'Node.js', value: 40 },
          { name: 'Python', value: 25 },
          { name: 'Java', value: 15 },
        ],
      },
      {
        name: 'Database',
        value: 60,
        children: [
          { name: 'PostgreSQL', value: 30 },
          { name: 'MongoDB', value: 20 },
          { name: 'Redis', value: 10 },
        ],
      },
    ],
  };

  const networkNodes: NetworkNode[] = [
    { id: 'user1', label: 'Alice', group: 'admin', size: 15, color: adminColors.primary[0] },
    { id: 'user2', label: 'Bob', group: 'user', size: 10, color: adminColors.primary[1] },
    { id: 'user3', label: 'Charlie', group: 'user', size: 10, color: adminColors.primary[1] },
    { id: 'user4', label: 'Diana', group: 'moderator', size: 12, color: adminColors.primary[2] },
    { id: 'user5', label: 'Eve', group: 'user', size: 8, color: adminColors.primary[1] },
  ];

  const networkLinks: NetworkLink[] = [
    { source: 'user1', target: 'user2', value: 3 },
    { source: 'user1', target: 'user4', value: 2 },
    { source: 'user2', target: 'user3', value: 1 },
    { source: 'user3', target: 'user4', value: 2 },
    { source: 'user4', target: 'user5', value: 1 },
  ];

  const interactionConfig: InteractionConfig = {
    zoom: true,
    pan: true,
    drill: true,
    filter: true,
    crossFilter: true,
    tooltip: {
      enabled: true,
      position: 'top',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      textColor: '#374151',
    },
  };

  // Real-time data simulation
  const [realTimeData, setRealTimeData] = useState<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }>;
  }>({
    labels: [],
    datasets: [
      {
        label: 'Live Metrics',
        data: [],
        borderColor: adminColors.primary[0],
        backgroundColor: `${adminColors.primary[0]}20`,
        tension: 0.4,
      },
    ],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const value = Math.floor(Math.random() * 100) + 50;
      
      setRealTimeData(prev => ({
        ...prev,
        labels: [...prev.labels, now.toLocaleTimeString()].slice(-20),
        datasets: [
          {
            ...prev.datasets[0],
            data: [...prev.datasets[0].data, value].slice(-20),
          },
        ],
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const demos = [
    { id: 'line', name: 'Line Chart', component: LineChart },
    { id: 'bar', name: 'Bar Chart', component: BarChart },
    { id: 'pie', name: 'Pie Chart', component: PieChart },
    { id: 'doughnut', name: 'Doughnut Chart', component: DoughnutChart },
    { id: 'heatmap', name: 'Heatmap', component: HeatmapChart },
    { id: 'treemap', name: 'Treemap', component: TreemapChart },
    { id: 'network', name: 'Network Graph', component: NetworkGraph },
    { id: 'interactive', name: 'Interactive Chart', component: InteractiveChart },
    { id: 'realtime', name: 'Real-time Chart', component: RealTimeChart },
  ];

  const renderChart = () => {
    const commonProps = {
      width: 800,
      height: 400,
      className: 'border border-gray-200 rounded-lg',
    };

    switch (selectedDemo) {
      case 'line':
        return <LineChart data={lineData} {...commonProps} />;
      
      case 'bar':
        return <BarChart data={barData} stacked={false} {...commonProps} />;
      
      case 'pie':
        return <PieChart data={pieData} showPercentages={true} {...commonProps} />;
      
      case 'doughnut':
        return (
          <DoughnutChart 
            data={pieData} 
            centerText="Total" 
            centerValue="450" 
            {...commonProps} 
          />
        );
      
      case 'heatmap':
        return (
          <HeatmapChart 
            data={heatmapData} 
            onCellClick={(data) => console.log('Heatmap cell clicked:', data)}
            {...commonProps} 
          />
        );
      
      case 'treemap':
        return (
          <TreemapChart 
            data={treemapData} 
            onNodeClick={(node: any) => console.log('Treemap node clicked:', node)}
            {...commonProps} 
          />
        );
      
      case 'network':
        return (
          <NetworkGraph 
            nodes={networkNodes} 
            links={networkLinks}
            onNodeClick={(node: any) => console.log('Network node clicked:', node)}
            {...commonProps} 
          />
        );
      
      case 'interactive':
        return (
          <InteractiveChart 
            type="line"
            data={lineData}
            interactions={interactionConfig}
            onDrillDown={(dataPoint, breadcrumbs) => console.log('Drill down:', dataPoint, breadcrumbs)}
            onFilter={(filters) => console.log('Filter applied:', filters)}
            {...commonProps} 
          />
        );
      
      case 'realtime':
        return (
          <RealTimeChart 
            type="line"
            data={realTimeData}
            updateInterval={2000}
            maxDataPoints={20}
            onDataUpdate={(data) => console.log('Real-time update:', data)}
            {...commonProps} 
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <ChartDataCacheProvider>
      <CrossFilterManager>
        <div className="visualization-demo p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Admin Visualization Components Demo
            </h1>

            {/* Demo Selection */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                {demos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setSelectedDemo(demo.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedDemo === demo.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {demo.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Display */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {demos.find(d => d.id === selectedDemo)?.name}
              </h2>
              
              <div className="flex justify-center">
                {renderChart()}
              </div>

              {/* Feature Description */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Features:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedDemo === 'line' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Smooth curves with configurable tension</li>
                      <li>Multi-axis support for different data scales</li>
                      <li>Area fill options with gradient support</li>
                      <li>Interactive hover effects and tooltips</li>
                    </ul>
                  )}
                  {selectedDemo === 'bar' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Horizontal and vertical orientations</li>
                      <li>Stacked and grouped bar configurations</li>
                      <li>Data labels and value display options</li>
                      <li>Rounded corners and custom styling</li>
                    </ul>
                  )}
                  {selectedDemo === 'pie' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Automatic percentage calculations</li>
                      <li>Interactive legend with click-to-hide</li>
                      <li>Hover effects with segment highlighting</li>
                      <li>Custom color schemes and gradients</li>
                    </ul>
                  )}
                  {selectedDemo === 'doughnut' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Center text and value display</li>
                      <li>Configurable inner radius</li>
                      <li>Animated transitions and hover effects</li>
                      <li>Custom center content rendering</li>
                    </ul>
                  )}
                  {selectedDemo === 'heatmap' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>D3.js powered with smooth color transitions</li>
                      <li>Interactive cells with click and hover events</li>
                      <li>Automatic color scaling and legend</li>
                      <li>Responsive grid layout with labels</li>
                    </ul>
                  )}
                  {selectedDemo === 'treemap' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Hierarchical data visualization</li>
                      <li>Proportional area representation</li>
                      <li>Interactive nodes with drill-down capability</li>
                      <li>Automatic text wrapping and sizing</li>
                    </ul>
                  )}
                  {selectedDemo === 'network' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Force-directed graph layout</li>
                      <li>Draggable nodes with physics simulation</li>
                      <li>Zoom and pan interactions</li>
                      <li>Group-based coloring and sizing</li>
                    </ul>
                  )}
                  {selectedDemo === 'interactive' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Zoom and pan with mouse/touch support</li>
                      <li>Drill-down navigation with breadcrumbs</li>
                      <li>Data point selection and filtering</li>
                      <li>Cross-chart filtering capabilities</li>
                    </ul>
                  )}
                  {selectedDemo === 'realtime' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Live data updates with WebSocket support</li>
                      <li>Configurable update intervals and buffering</li>
                      <li>Play/pause controls and data export</li>
                      <li>Performance optimized rendering</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CrossFilterManager>
    </ChartDataCacheProvider>
  );
};

export default VisualizationDemo;