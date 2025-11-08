import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

interface FraudRiskBadgeProps {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  flags?: string[];
}

export const FraudRiskBadge: React.FC<FraudRiskBadgeProps> = ({ riskLevel, riskScore, flags = [] }) => {
  const colors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colors[riskLevel]}`}>
      {riskLevel === 'low' ? <Shield className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      <span className="text-xs font-medium capitalize">{riskLevel} Risk ({riskScore})</span>
      {flags.length > 0 && (
        <span className="text-xs opacity-70">• {flags.length} flags</span>
      )}
    </div>
  );
};
