import React from 'react';
import { PostLaunchMonitoringDashboard } from '../components/LDAOAcquisition/PostLaunchMonitoringDashboard';

const LDAOMonitoringPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <PostLaunchMonitoringDashboard />
      </div>
    </div>
  );
};

export default LDAOMonitoringPage;