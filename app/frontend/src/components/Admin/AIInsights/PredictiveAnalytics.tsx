import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Prediction {
  id: string;
  description: string;
  details: string;
  confidence: number;
  impact: number;
  category: string;
  timeline: string;
}

type PredictionCategory = 'user' | 'content' | 'system' | 'engagement';

interface PredictiveAnalyticsProps {
  predictions: Prediction[];
  loading: boolean;
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ predictions, loading }) => {
  const [categoryFilter, setCategoryFilter] = useState<PredictionCategory | 'all'>('all');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact'>('confidence');

  // Filter and sort predictions
  const filteredPredictions = predictions
    .filter(prediction => categoryFilter === 'all' || prediction.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      return b.impact - a.impact;
    });

  // Group predictions by category for charting
  const predictionsByCategory = predictions.reduce((acc, prediction) => {
    if (!acc[prediction.category]) {
      acc[prediction.category] = 0;
    }
    acc[prediction.category]++;
    return acc;
  }, {} as Record<PredictionCategory, number>);

  const categoryData = Object.entries(predictionsByCategory).map(([category, count]) => ({
    category,
    count
  }));

  // Generate trend data based on timeframe
  const generateTrendData = () => {
    const data = [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      data.push({
        date: `Day ${i + 1}`,
        predicted: Math.floor(Math.random() * 100),
        actual: Math.floor(Math.random() * 100),
        accuracy: Math.floor(Math.random() * 100)
      });
    }
    return data;
  };

  const trendData = generateTrendData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Category</label>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as PredictionCategory | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="user">User Behavior</SelectItem>
              <SelectItem value="content">Content Performance</SelectItem>
              <SelectItem value="system">System Performance</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Timeframe</label>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as '7d' | '30d' | '90d')}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Sort By</label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'confidence' | 'impact')}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="impact">Impact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Prediction Accuracy Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="accuracy" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Predictions by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Predictions by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Prediction List */}
      <Card>
        <CardHeader>
          <CardTitle>Top Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPredictions.length > 0 ? (
              filteredPredictions.map((prediction, index) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{prediction.description}</h3>
                        <Badge variant="outline">{prediction.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{prediction.details}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={prediction.confidence > 0.8 ? "default" : prediction.confidence > 0.6 ? "secondary" : "destructive"}>
                          Confidence: {(prediction.confidence * 100).toFixed(1)}%
                        </Badge>
                        <Badge variant={prediction.impact > 0.8 ? "default" : prediction.impact > 0.6 ? "secondary" : "destructive"}>
                          Impact: {(prediction.impact * 100).toFixed(1)}%
                        </Badge>
                        <Badge variant="secondary">
                          Timeline: {prediction.timeline}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="small">
                        View Details
                      </Button>
                      <Button size="small">
                        Take Action
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No predictions match the current filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};