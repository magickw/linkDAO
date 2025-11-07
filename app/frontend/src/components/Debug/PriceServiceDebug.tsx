import React, { useState, useEffect } from 'react';
import { cryptoPriceService } from '../../services/cryptoPriceService';
import { testCryptoPriceService, testTokenBalanceUpdate, runAllTests } from '../../utils/testCryptoPrices';

interface PriceServiceDebugProps {
  className?: string;
}

const PriceServiceDebug: React.FC<PriceServiceDebugProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [liveTokens, setLiveTokens] = useState<Map<string, any>>(new Map());

  // Subscribe to live price updates for demo tokens
  useEffect(() => {
    const demoTokens = ['ETH', 'USDC', 'LINK', 'UNI', 'AAVE'];
    
    const unsubscribe = cryptoPriceService.subscribe({
      tokens: demoTokens,
      callback: (prices) => {
        setLiveTokens(new Map(prices));
      }
    });

    return unsubscribe;
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getSupportedTokensCount = () => {
    return cryptoPriceService.getSupportedTokens().length;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${className}`}
        title="Open Price Service Debug Panel"
      >
        🔍 Debug Prices
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          🔍 Price Service Debug
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>
      
      <div className="p-3 space-y-3 overflow-y-auto max-h-80">
        {/* Service Status */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Service Status
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Supported Tokens: {getSupportedTokensCount()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Live Updates: {liveTokens.size > 0 ? '✅ Active' : '⏳ Waiting'}
          </div>
        </div>

        {/* Live Token Prices */}
        {liveTokens.size > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
              Live Prices ({liveTokens.size} tokens)
            </div>
            <div className="space-y-1">
              {Array.from(liveTokens.entries()).slice(0, 5).map(([symbol, data]) => (
                <div key={symbol} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{symbol}</span>
                  <span className="text-gray-900 dark:text-white">
                    ${data.current_price?.toFixed(2)} 
                    <span className={`ml-1 ${data.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({data.price_change_percentage_24h >= 0 ? '+' : ''}{data.price_change_percentage_24h?.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="space-y-2">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            {isRunning ? '🔄 Running Tests...' : '🧪 Run Price Tests'}
          </button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Results
            </div>
            <div className="space-y-1 text-xs">
              <div className={`${testResults.priceTest.success ? 'text-green-600' : 'text-red-600'}`}>
                Price Service: {testResults.priceTest.success ? '✅ PASS' : '❌ FAIL'}
              </div>
              <div className={`${testResults.balanceTest.success ? 'text-green-600' : 'text-red-600'}`}>
                Balance Update: {testResults.balanceTest.success ? '✅ PASS' : '❌ FAIL'}
              </div>
              {testResults.allPassed && (
                <div className="text-green-600 font-medium mt-1">
                  🎉 All systems working! Real market data is active.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            💡 How it works
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <div>• Fetches real prices from CoinGecko API</div>
            <div>• Updates wallet values automatically</div>
            <div>• Supports {getSupportedTokensCount()}+ tokens</div>
            <div>• Caches data to reduce API calls</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceServiceDebug;