import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

interface Anomaly {
  id: string;
  description: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  type: string;
  timestamp: string;
}

interface AnomalyDetectionProps {
  anomalies: Anomaly[];
  loading: boolean;
}

export const AnomalyDetection: React.FC<AnomalyDetectionProps> = ({ anomalies, loading }) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'confidence'>('timestamp');

  // Get unique anomaly types for filter
  const anomalyTypes = Array.from(new Set(anomalies.map(a => a.type)));

  // Filter and sort anomalies
  const filteredAnomalies = anomalies
    .filter(anomaly => 
      (severityFilter === 'all' || anomaly.severity === severityFilter) &&
      (typeFilter === 'all' || anomaly.type === typeFilter)
    )
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === 'severity') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.confidence - a.confidence;
    });

  // Prepare data for severity distribution chart
  const severityData = anomalies.reduce((acc, anomaly) => {
    acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityChartData = Object.entries(severityData).map(([severity, count]) => ({
    severity,
    count
  }));

  // Prepare data for anomaly timeline
  const timelineData = anomalies.map(anomaly => ({
    timestamp: new Date(anomaly.timestamp).getTime(),
    severity: anomaly.severity,
    confidence: anomaly.confidence * 100,
    type: anomaly.type
  }));

  // Prepare data for type distribution
  const typeData = anomalies.reduce((acc, anomaly) => {
    acc[anomaly.type] = (acc[anomaly.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeData).map(([type, count]) => ({
    type,
    count
  }));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

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
          <label className="text-sm font-medium mb-1 block">Severity</label>
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as 'all' | 'low' | 'medium' | 'high' | 'critical')}>
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {anomalyTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Sort By</label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'timestamp' | 'severity' | 'confidence')}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timestamp">Timestamp</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="severity" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  name="Time"
                />
                <YAxis 
                  dataKey="confidence" 
                  name="Confidence" 
                  unit="%" 
                />
                <ZAxis range={[100, 1000]} dataKey="severity" name="Severity" />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === 'timestamp') {
                      return [new Date(value as number).toLocaleString(), 'Time'];
                    }
                    return [value, name];
                  }}
                />
                <Scatter 
                  dataKey="confidence" 
                  fill="#8884d8"
                  shape={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={typeof payload.confidence === 'number' ? payload.confidence / 10 : 5} 
                        fill={getSeverityColor(payload.severity)} 
                        fillOpacity={0.6}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly List */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAnomalies.length > 0 ? (
              filteredAnomalies.map((anomaly, index) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{anomaly.description}</h3>
                        <Badge 
                          variant={
                            anomaly.severity === 'critical' ? 'destructive' :
                            anomaly.severity === 'high' ? 'destructive' :
                            anomaly.severity === 'medium' ? 'secondary' : 'default'
                          }
                        >
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{anomaly.details}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{anomaly.type}</Badge>
                        <Badge variant="secondary">
                          Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                        </Badge>
                        <Badge variant="outline">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="small">
                        Investigate
                      </Button>
                      <Button size="small">
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No anomalies match the current filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};