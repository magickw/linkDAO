import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { usePaymentRouter } from '@/hooks/usePaymentRouter';
import { useWeb3 } from '@/context/Web3Context';

export default function Wallet() {
  const { address, balance } = useWeb3();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('ETH');
  
  const {
    sendEthPayment,
    isSendingEth,
    isEthSent,
    sendTokenPayment,
    isSendingToken,
    isTokenSent
  } = usePaymentRouter();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }
    
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    
    if (token === 'ETH') {
      sendEthPayment?.({
        args: [recipient as `0x${string}`, amountInWei, ''],
        value: amountInWei,
      });
    } else {
      // For token payments, we would need the token address
      // This is a simplified example
      alert('Token payments not fully implemented in this example');
    }
  };

  return (
    <Layout title="Wallet - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Wallet</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium text-gray-900">ETH Balance</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">{balance} ETH</p>
              <p className="text-gray-500 text-sm mt-1">Ethereum</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium text-gray-900">USDC Balance</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">0.00</p>
              <p className="text-gray-500 text-sm mt-1">USD Coin</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium text-gray-900">USDT Balance</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">0.00</p>
              <p className="text-gray-500 text-sm mt-1">Tether</p>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Send Payment</h2>
            
            <form onSubmit={handleSend}>
              <div className="mb-4">
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                  Token
                </label>
                <select
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0x..."
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingEth || isSendingToken}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSendingEth || isSendingToken ? 'Sending...' : 'Send Payment'}
                </button>
              </div>
              
              {(isEthSent || isTokenSent) && (
                <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md">
                  Payment sent successfully!
                </div>
              )}
            </form>
          </div>
          
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Received from 0x1234...5678
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      +100 USDC
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2023-07-15
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Sent to 0x8765...4321
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -50 USDC
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2023-07-10
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}