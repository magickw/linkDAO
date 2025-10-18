import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network, Database, Server, Globe } from 'lucide-react';

interface ComponentDependencyMapProps {
  isLoading: boolean;
}

export const ComponentDependencyMap: React.FC<ComponentDependencyMapProps> = ({ isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2" />
          Component Dependency Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dependency Visualization</h3>
          <p className="text-gray-600">Interactive component dependency map will be displayed here</p>
        </div>
      </CardContent>
    </Card>
  );
};