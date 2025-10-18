import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { RealTimeChartProps } from './types';
import { defaultAdminTheme, generateChartJsTheme, adminColors } from './theme';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RealTimeChartComponentProps extends RealTimeChartProps {
  type: 'line' | 'bar';
  webSocketUrl?: string;
  dataSource?: () => Promise<any>;
}

interface DataBuffer {
  timestamp: number;
  data: any;
}

const RealTimeChart: React.FC<RealTimeChartComponentProps> = ({
  type,
  data: initialData,
  options = {},
  updateInterval = 1000,
  maxDataPoints = 50,
  animationDuration = 300,
  bufferSize = 100,
  webSocketUrl,
  dataSource,
  onDataUpdate,
  width,
  height,
  className = '',
}) => {
  const chartRef = useRef<ChartJS>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataBufferRef = useRef<DataBuffer[]>([]);
  
  const [currentData, setCurrentData] = useState<ChartData<any>>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!webSocketUrl) return;

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(webSocketUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('Real-time chart WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          
          // Add to buffer
          dataBufferRef.current.push({
            timestamp: Date.now(),
            data: newData,
          });

          // Limit buffer size
          if (dataBufferRef.current.length > bufferSize) {
            dataBufferRef.current = dataBufferRef.current.slice(-bufferSize);
          }

          if (isPlaying) {
            processNewData(newData);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('Real-time chart WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        setConnectionStatus('error');
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to connect WebSocket:', error);
    }
  }, [webSocketUrl, isPlaying]);

  // Process new data and update chart
  const processNewData = useCallback((newData: any) => {
    setCurrentData(prevData => {
      const updatedData = { ...prevData };
      
      // Handle different data update patterns
      if (newData.datasets) {
        // Complete dataset replacement
        updatedData.datasets = newData.datasets;
      } else if (newData.values && Array.isArray(newData.values)) {
        // Append new values to existing datasets
        updatedData.datasets = updatedData.datasets.map((dataset, index) => {
          const newValue = newData.values[index];
          if (newValue !== undefined) {
            const newDataArray = [...(dataset.data || []), newValue];
            
            // Limit data points
            if (newDataArray.length > maxDataPoints) {
              newDataArray.splice(0, newDataArray.length - maxDataPoints);
            }
            
            return {
              ...dataset,
              data: newDataArray,
            };
          }
          return dataset;
        });
      } else if (newData.value !== undefined) {
        // Single value update for first dataset
        updatedData.datasets = updatedData.datasets.map((dataset, index) => {
          if (index === 0) {
            const newDataArray = [...(dataset.data || []), newData.value];
            
            if (newDataArray.length > maxDataPoints) {
              newDataArray.splice(0, newDataArray.length - maxDataPoints);
            }
            
            return {
              ...dataset,
              data: newDataArray,
            };
          }
          return dataset;
        });
      }

      // Update labels if provided
      if (newData.label) {
        const newLabels = [...(updatedData.labels || []), newData.label];
        if (newLabels.length > maxDataPoints) {
          newLabels.splice(0, newLabels.length - maxDataPoints);
        }
        updatedData.labels = newLabels;
      } else if (newData.labels) {
        updatedData.labels = newData.labels;
      }

      return updatedData;
    });

    setLastUpdate(new Date());
    setUpdateCount(prev => prev + 1);

    if (onDataUpdate) {
      onDataUpdate(newData);
    }
  }, [maxDataPoints, onDataUpdate]);

  // Polling data source
  const pollDataSource = useCallback(async () => {
    if (!dataSource || !isPlaying) return;

    try {
      const newData = await dataSource();
      processNewData(newData);
    } catch (error) {
      console.error('Error fetching data from source:', error);
    }
  }, [dataSource, isPlaying, processNewData]);

  // Setup data fetching
  useEffect(() => {
    if (webSocketUrl) {
      connectWebSocket();
    } else if (dataSource) {
      // Setup polling
      intervalRef.current = setInterval(pollDataSource, updateInterval);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [webSocketUrl, dataSource, updateInterval, connectWebSocket, pollDataSource]);

  // Chart configuration with real-time optimizations
  const chartConfig = useMemo(() => {
    const baseOptions: ChartOptions<any> = {
      ...generateChartJsTheme(defaultAdminTheme),
      ...options,
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: animationDuration,
        easing: 'easeInOutQuart',
      },
      transitions: {
        active: {
          animation: {
            duration: animationDuration / 2,
          },
        },
      },
      scales: {
        ...options.scales,
        x: {
          ...options.scales?.x,
          type: 'category',
          display: true,
          grid: {
            display: true,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
        },
        y: {
          ...options.scales?.y,
          type: 'linear',
          display: true,
          beginAtZero: true,
          grid: {
            display: true,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
        },
      },
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins?.legend,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          ...options.plugins?.tooltip,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            ...options.plugins?.tooltip?.callbacks,
            afterLabel: (context: any) => {
              return `Updated: ${lastUpdate.toLocaleTimeString()}`;
            },
          },
        },
      },
    };

    return {
      type,
      data: currentData,
      options: baseOptions,
    } as ChartConfiguration;
  }, [type, currentData, options, animationDuration, lastUpdate]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const clearData = useCallback(() => {
    setCurrentData(prevData => ({
      ...prevData,
      datasets: prevData.datasets.map(dataset => ({
        ...dataset,
        data: [],
      })),
      labels: [],
    }));
    setUpdateCount(0);
  }, []);

  const exportData = useCallback(() => {
    const dataToExport = {
      data: currentData,
      metadata: {
        updateCount,
        lastUpdate: lastUpdate.toISOString(),
        connectionStatus,
        bufferSize: dataBufferRef.current.length,
      },
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtime-chart-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentData, updateCount, lastUpdate, connectionStatus]);

  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '400px',
    position: 'relative' as const,
  };

  return (
    <div className={`real-time-chart-container ${className}`} style={containerStyle}>
      {/* Status Bar */}
      <div className="status-bar mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-400'
            }`} />
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>

          {/* Update Info */}
          <div className="text-sm text-gray-600">
            Updates: {updateCount} | Last: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayPause}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              isPlaying 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <button
            onClick={clearData}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
          
          <button
            onClick={exportData}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-wrapper" style={{ height: 'calc(100% - 80px)' }}>
        <Chart
          ref={chartRef}
          type={type}
          data={chartConfig.data}
          options={chartConfig.options}
        />
      </div>

      {/* Buffer Status */}
      {dataBufferRef.current.length > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Buffer: {dataBufferRef.current.length}/{bufferSize}
        </div>
      )}
    </div>
  );
};

export default RealTimeChart;