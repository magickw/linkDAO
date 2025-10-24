import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { governanceService } from '@/services/governanceService';

interface DelegationPanelProps {
  communityId: string;
  userVotingPower: number;
  onDelegationChange?: () => void;
}

interface Delegation {
  delegateAddress: string;
  votingPower: number;
  isRevocable: boolean;
  expiryDate?: Date;
}

const DelegationPanel: React.FC<DelegationPanelProps> = ({ 
  communityId, 
  userVotingPower,
  onDelegationChange 
}) => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  
  const [delegateAddress, setDelegateAddress] = useState('');
  const [delegationAmount, setDelegationAmount] = useState(userVotingPower.toString());
  const [isDelegating, setIsDelegating] = useState(false);
  const [isRevocable, setIsRevocable] = useState(true);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }
    
    if (!delegateAddress) {
      addToast('Please enter a delegate address', 'error');
      return;
    }
    
    if (delegateAddress === address) {
      addToast('You cannot delegate to yourself', 'error');
      return;
    }
    
    const amount = parseFloat(delegationAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Please enter a valid delegation amount', 'error');
      return;
    }
    
    if (amount > userVotingPower) {
      addToast('Delegation amount cannot exceed your voting power', 'error');
      return;
    }
    
    try {
      setIsDelegating(true);
      addToast('Processing delegation...', 'info');
      
      const result = await governanceService.delegateVotingPower(
        address,
        delegateAddress,
        communityId,
        amount
      );
      
      if (result.success) {
        addToast('Voting power delegated successfully!', 'success');
        setDelegateAddress('');
        setDelegationAmount(userVotingPower.toString());
        
        // Refresh delegations
        fetchDelegations();
        
        // Notify parent component
        if (onDelegationChange) {
          onDelegationChange();
        }
      } else {
        addToast(`Delegation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error delegating voting power:', error);
      addToast('Failed to delegate voting power', 'error');
    } finally {
      setIsDelegating(false);
    }
  };
  
  const handleRevoke = async (delegateAddress: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      addToast('Revoking delegation...', 'info');
      
      const result = await governanceService.revokeDelegation(
        address,
        delegateAddress,
        communityId
      );
      
      if (result.success) {
        addToast('Delegation revoked successfully!', 'success');
        
        // Refresh delegations
        fetchDelegations();
        
        // Notify parent component
        if (onDelegationChange) {
          onDelegationChange();
        }
      } else {
        addToast(`Failed to revoke delegation: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error revoking delegation:', error);
      addToast('Failed to revoke delegation', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDelegations = async () => {
    // In a real implementation, this would fetch actual delegations
    // For now, we'll use mock data
    setDelegations([
      {
        delegateAddress: '0x1234...5678',
        votingPower: 500,
        isRevocable: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        delegateAddress: '0xabcd...ef01',
        votingPower: 250,
        isRevocable: true
      }
    ]);
  };
  
  const totalDelegated = delegations.reduce((sum, d) => sum + d.votingPower, 0);
  const availableVotingPower = userVotingPower - totalDelegated;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Voting Power Delegation</h3>
      
      {/* Voting Power Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
          <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{userVotingPower.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
          <div className="text-sm text-green-600 dark:text-green-400">Available</div>
          <div className="text-lg font-bold text-green-800 dark:text-green-200">{availableVotingPower.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
          <div className="text-sm text-purple-600 dark:text-purple-400">Delegated</div>
          <div className="text-lg font-bold text-purple-800 dark:text-purple-200">{totalDelegated.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Delegate Form */}
      <form onSubmit={handleDelegate} className="mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="delegateAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delegate To
            </label>
            <input
              type="text"
              id="delegateAddress"
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              disabled={isDelegating}
            />
          </div>
          
          <div>
            <label htmlFor="delegationAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount to Delegate
            </label>
            <div className="relative">
              <input
                type="number"
                id="delegationAmount"
                value={delegationAmount}
                onChange={(e) => setDelegationAmount(e.target.value)}
                min="0"
                max={availableVotingPower}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                disabled={isDelegating}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">tokens</span>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Available: {availableVotingPower.toFixed(2)} tokens
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              id="isRevocable"
              type="checkbox"
              checked={isRevocable}
              onChange={(e) => setIsRevocable(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={isDelegating}
            />
            <label htmlFor="isRevocable" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Allow revocation
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isDelegating || !isConnected}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isDelegating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Delegating...
              </>
            ) : (
              'Delegate Voting Power'
            )}
          </button>
        </div>
      </form>
      
      {/* Current Delegations */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Current Delegations</h4>
        
        {delegations.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p>No active delegations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {delegations.map((delegation, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {delegation.delegateAddress}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{delegation.votingPower.toFixed(2)} tokens</span>
                    {delegation.expiryDate && (
                      <span className="ml-2">
                        Expires: {delegation.expiryDate.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(delegation.delegateAddress)}
                  disabled={isLoading}
                  className="ml-2 px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex">
          <svg className="flex-shrink-0 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Delegation Info:</span> You can delegate your voting power to trusted community members. Delegated power can be revoked at any time if the delegation is revocable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelegationPanel;