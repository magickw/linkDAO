import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '../../../../design-system';

interface WalletConnectStepProps {
  onComplete: (data: any) => void;
  onConnect?: () => void;
}

export function WalletConnectStep({ onComplete, onConnect }: WalletConnectStepProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  React.useEffect(() => {
    if (isConnected && address) {
      onComplete({ walletAddress: address });
      if (onConnect) {
        onConnect();
      }
    }
  }, [isConnected, address, onComplete, onConnect]);

  if (isConnected) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Wallet Connected!</h3>
          <p className="text-gray-300 mb-4">
            Your wallet is successfully connected to the marketplace.
          </p>
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-400 mb-1">Connected Address:</p>
            <p className="text-white font-mono text-sm break-all">{address}</p>
          </div>
        </div>
        
        <div className="flex justify-center space-x-3">
          <Button onClick={() => disconnect()} variant="outline" size="sm">
            Disconnect
          </Button>
          <Button onClick={() => onComplete({ walletAddress: address })} variant="primary">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-300 mb-6">
          Choose a wallet to connect to the Web3 Marketplace. Your wallet will be used for:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-white font-medium">Identity</h4>
            </div>
            <p className="text-gray-400 text-sm">Your unique seller identity on the blockchain</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h4 className="text-white font-medium">Payments</h4>
            </div>
            <p className="text-gray-400 text-sm">Receive crypto payments directly to your wallet</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-white font-medium">Smart Contracts</h4>
            </div>
            <p className="text-gray-400 text-sm">Interact with escrow and marketplace contracts</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-white font-medium">DAO Participation</h4>
            </div>
            <p className="text-gray-400 text-sm">Vote on governance proposals and earn reputation</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error.message}</p>
        </div>
      )}

      <div className="space-y-3">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            variant="outline"
            className="w-full justify-between"
            disabled={!connector.ready || isPending}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mr-3 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span>{connector.name}</span>
              {!connector.ready && ' (unsupported)'}
            </div>
            {isPending && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </Button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-left">
            <h4 className="text-blue-300 font-medium text-sm mb-1">New to Web3?</h4>
            <p className="text-blue-200 text-sm">
              Don't have a wallet yet? We recommend <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">MetaMask</a> for beginners. 
              It's free, secure, and easy to set up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}