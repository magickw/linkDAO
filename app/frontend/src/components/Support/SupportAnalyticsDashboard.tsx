import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  Bar, 
  Line, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Calendar,
  Clock,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';

// Since we don't have the actual charting libraries installed, I'll create a simplified version
// In a real implementation, you would use libraries like Recharts or Chart.js

interface TicketDataPoint {
  date: string;
  count: number;
  resolved: number;
  pending: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface SupportAgent {
  id: string;
  name: string;
  ticketsHandled: number;
  avgResponseTime: string;
  satisfaction: number;
}

const SupportAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [ticketData, setTicketData] = useState<TicketDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topAgents, setTopAgents] = useState<SupportAgent[]>([]);

  // Mock data - in a real implementation, this would come from an API
  useEffect(() => {
    // Generate mock ticket data
    const mockTicketData: TicketDataPoint[] = [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      mockTicketData.push({
        date: dateStr,
        count: Math.floor(Math.random() * 50) + 10,
        resolved: Math.floor(Math.random() * 40) + 5,
        pending: Math.floor(Math.random() * 20) + 1
      });
    }
    
    setTicketData(mockTicketData);
    
    // Mock category data
    setCategoryData([
      { name: 'Technical Issues', value: 35, color: '#3b82f6' },
      { name: 'Account Access', value: 25, color: '#10b981' },
      { name: 'Token Questions', value: 20, color: '#f59e0b' },
      { name: 'Marketplace', value: 15, color: '#8b5cf6' },
      { name: 'Other', value: 5, color: '#6b7280' }
    ]);
    
    // Mock top agents
    setTopAgents([
      { id: '1', name: 'Alex Johnson', ticketsHandled: 124, avgResponseTime: '2.1h', satisfaction: 94 },
      { id: '2', name: 'Maria Garcia', ticketsHandled: 98, avgResponseTime: '1.8h', satisfaction: 96 },
      { id: '3', name: 'James Wilson', ticketsHandled: 87, avgResponseTime: '2.3h', satisfaction: 92 },
      { id: '4', name: 'Sarah Chen', ticketsHandled: 76, avgResponseTime: '1.9h', satisfaction: 95 },
      { id: '5', name: 'Robert Davis', ticketsHandled: 65, avgResponseTime: '2.5h', satisfaction: 90 }
    ]);
  }, [timeRange]);

  // Simple chart components for demonstration
  const SimpleBarChart = () => (
    <div className="h-64">
      <div className="flex items-end h-48 border-b border-l border-gray-200 pb-4 pl-4">
        {ticketData.slice(-7).map((data, index) => (
          <div key={index} className="flex flex-col items-center flex-1 px-1">
            <div 
              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
              style={{ height: `${(data.count / 60) * 100}%` }}
            ></div>
            <div className="text-xs text-gray-500 mt-2">
              {new Date(data.date).getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        Ticket Volume (Last 7 Days)
      </div>
    </div>
  );

  const SimplePieChart = () => (
    <div className="h-64 flex items-center justify-center">
      <div className="relative w-48 h-48 rounded-full border-8 border-gray-200">
        {categoryData.map((cat, index) => {
          const startAngle = index * (360 / categoryData.length);
          const endAngle = (index + 1) * (360 / categoryData.length);
          return (
            <div
              key={cat.name}
              className="absolute inset-0 rounded-full"
              style={{
                clipPath: `conic-gradient(from ${startAngle}deg, ${cat.color} 0deg ${endAngle - startAngle}deg, transparent ${endAngle - startAngle}deg 360deg)`
              }}
            ></div>
          );
        })}
        <div className="absolute inset-4 bg-white rounded-full"></div>
      </div>
    </div>
  );

  const SimpleLineChart = () => (
    <div className="h-64">
      <div className="h-48 border-b border-l border-gray-200 pb-4 pl-4 relative">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <div 
            key={y} 
            className="absolute left-0 right-0 h-px bg-gray-100"
            style={{ bottom: `${y}%` }}
          ></div>
        ))}
        
        {/* Line */}
        <svg className="absolute inset-0 w-full h-full">
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={ticketData.slice(-7).map((data, index) => {
              const x = (index / 6) * 100;
              const y = 100 - (data.resolved / 50) * 100;
              return `${x}%,${y}%`;
            }).join(' ')}
          />
        </svg>
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        Resolution Rate (Last 7 Days)
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Support Analytics</h2>
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">1,248</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">1,124</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Response</p>
              <p className="text-2xl font-bold text-gray-900">2.1h</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">92%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Ticket Volume
          </h3>
          <SimpleBarChart />
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-600" />
            Ticket Categories
          </h3>
          <SimplePieChart />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: cat.color }}
                ></div>
                <span className="text-sm text-gray-600">{cat.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <LineChart className="w-5 h-5 mr-2 text-purple-600" />
            Resolution Rate
          </h3>
          <SimpleLineChart />
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-yellow-600" />
            Top Support Agents
          </h3>
          <div className="space-y-4">
            {topAgents.map((agent, index) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.ticketsHandled} tickets</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.avgResponseTime}</p>
                  <p className="text-xs text-gray-500">⭐ {agent.satisfaction}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Peak Support Hours</h4>
            <p className="text-sm text-blue-700 mt-1">10AM - 2PM (Mon-Fri)</p>
            <p className="text-xs text-blue-600 mt-2">40% of tickets created during this time</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900">Highest Resolution Rate</h4>
            <p className="text-sm text-green-700 mt-1">Technical Issues (95%)</p>
            <p className="text-xs text-green-600 mt-2">Well-documented solutions</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900">Improvement Opportunity</h4>
            <p className="text-sm text-yellow-700 mt-1">Account Access (82%)</p>
            <p className="text-xs text-yellow-600 mt-2">Need better self-service options</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportAnalyticsDashboard;