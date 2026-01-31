import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { Gavel, Scale, Info, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';

interface DAOJuryPanelProps {
  disputeId: string;
  onVoteCast?: (vote: string) => void;
}

export const DAOJuryPanel: React.FC<DAOJuryPanelProps> = ({ disputeId, onVoteCast }) => {
  const { address } = useAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isQualified, setIsQualified] = useState(false);
  const [stakingWeight, setStakingWeight] = useState(0);
  const [currentVote, setCurrentVote] = useState<'buyer' | 'seller' | 'split' | null>(null);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    // Check qualification status
    const checkQualification = async () => {
      // Mock qualification check
      if (address) {
        setIsQualified(true);
        setStakingWeight(1250);
      }
    };
    checkQualification();
  }, [address]);

  const handleVote = async (vote: 'buyer' | 'seller' | 'split') => {
    if (!isQualified) {
      addToast('You are not qualified to vote on this jury.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Mock API call to cast vote
      console.log(`Casting jury vote for ${vote} in dispute ${disputeId}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCurrentVote(vote);
      addToast(`Vote for ${vote} cast successfully with ${stakingWeight} weight!`, 'success');
      if (onVoteCast) onVoteCast(vote);
    } catch (error) {
      addToast('Failed to cast vote. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel variant="secondary" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Gavel className="text-purple-400" />
          DAO Jury Intervention
        </h3>
        <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/30">
          <Scale size={14} className="text-purple-300" />
          <span className="text-xs font-medium text-purple-200">Governance Mode</span>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-400 mt-0.5" />
          <div className="text-sm text-white/70">
            <p className="font-medium text-white mb-1">Decentralized Arbitration</p>
            <p>This dispute has been escalated to the DAO. Qualified LDAO stakers review evidence and determine the outcome. Your vote weight is based on your staked amount and reputation.</p>
          </div>
        </div>
      </div>

      {isQualified ? (
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Your Staking Weight:</span>
            <span className="text-emerald-400 font-bold">{stakingWeight.toLocaleString()} LDAO</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Arbitration Decision</label>
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant={currentVote === 'buyer' ? 'primary' : 'outline'}
                className={currentVote === 'buyer' ? 'bg-blue-600 border-blue-400' : 'border-white/20'}
                onClick={() => handleVote('buyer')}
                disabled={loading || !!currentVote}
              >
                In favor of Buyer
              </Button>
              <Button 
                variant={currentVote === 'seller' ? 'primary' : 'outline'}
                className={currentVote === 'seller' ? 'bg-orange-600 border-orange-400' : 'border-white/20'}
                onClick={() => handleVote('seller')}
                disabled={loading || !!currentVote}
              >
                In favor of Seller
              </Button>
              <Button 
                variant={currentVote === 'split' ? 'primary' : 'outline'}
                className={currentVote === 'split' ? 'bg-gray-600 border-gray-400' : 'border-white/20'}
                onClick={() => handleVote('split')}
                disabled={loading || !!currentVote}
              >
                Split / Refund
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Justification (Optional)</label>
            <textarea 
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Provide reasoning for your decision based on the evidence..."
              rows={3}
              disabled={!!currentVote}
            />
          </div>

          {currentVote && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <CheckCircle size={16} />
              <span>You have cast your weighted vote. Results will be finalized once quorum is reached.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
          <AlertTriangle className="text-red-400" />
          <div className="text-sm">
            <p className="text-red-200 font-medium">Not Qualified for Jury</p>
            <p className="text-red-300/70">You need to stake at least 500 LDAO to participate in marketplace arbitration.</p>
          </div>
        </div>
      )}
    </GlassPanel>
  );
};
