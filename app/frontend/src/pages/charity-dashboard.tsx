import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { 
  useReadCharityGovernanceGetProposal,
  useReadCharityVerificationSystemIsCharityVerified,
  useReadProofOfDonationNftDonations,
  useWriteCharityVerificationSystemAddCharity,
  useWriteProofOfDonationNftRecordDonation
} from '../generated';
import Link from 'next/link';

const CharityDashboard = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('proposals');
  
  // Handle hash changes for direct navigation to sections
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['proposals', 'charities', 'donations'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  // Example contract addresses from deployedAddresses-sepolia.json
  const charityGovernanceAddress = '0x25b39592AA8da0be424734E0F143E5371396dd61';
  const charityVerificationAddress = '0x4e2F69c11897771e443A3EA03E207DC402496eb0';
  const proofOfDonationNFTAddress = '0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4';

  // Read contract data - temporarily commented out to test build
  // const { data: proposalData } = useReadCharityGovernanceGetProposal({
  //   address: charityGovernanceAddress,
  //   args: [1] // Example proposal ID
  // });

  // const { data: isCharityVerified } = useReadCharityVerificationSystemIsCharityVerified({
  //   address: charityVerificationAddress,
  //   args: [address || '0x0000000000000000000000000000000000000000'] // Example charity address
  // });

  // const { data: donationData } = useReadProofOfDonationNftDonations({
  //   address: proofOfDonationNFTAddress,
  //   args: [1] // Example donation ID
  // });

  // Write contract functions
  const { writeContract: proposeCharityDonation } = useWriteContract();
  const { writeContract: addCharity } = useWriteCharityVerificationSystemAddCharity();
  const { writeContract: recordDonation } = useWriteProofOfDonationNftRecordDonation();

  const handleCreateProposal = () => {
    if (!isConnected) return;
    
    // Since we're using the generic useWriteContract hook, we need to provide the full ABI
    // But for now, we'll just show a console log to indicate the function would be called
    console.log('Creating charity proposal');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Charity Governance Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Manage charity proposals, verify organizations, and track donations
              </p>
            </div>
            <Link 
              href="/governance#charity" 
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              ← Back to Governance
            </Link>
          </div>
        </div>

        {/* Tabs with section anchors */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              id="proposals"
              onClick={() => {
                setActiveTab('proposals');
                window.location.hash = 'proposals';
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'proposals'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Proposals
            </button>
            <button
              id="charities"
              onClick={() => {
                setActiveTab('charities');
                window.location.hash = 'charities';
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'charities'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verified Charities
            </button>
            <button
              id="donations"
              onClick={() => {
                setActiveTab('donations');
                window.location.hash = 'donations';
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'donations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Donations
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'proposals' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Charity Proposals</h2>
              <button
                onClick={handleCreateProposal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create Proposal
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">Support Local Food Bank</h3>
                    <p className="text-sm text-gray-600 mt-1">Proposal to donate 5,000 LDAO tokens to the local food bank</p>
                    <div className="flex items-center mt-2 text-sm">
                      <span className="text-gray-500">Charity: </span>
                      <span className="ml-1 text-indigo-600">Local Food Bank</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Active
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-4 text-sm">
                    <div>
                      <span className="text-gray-500">For: </span>
                      <span className="font-medium">12,450 LDAO</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Against: </span>
                      <span className="font-medium">321 LDAO</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Vote For
                    </button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      Vote Against
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">Community Education Fund</h3>
                    <p className="text-sm text-gray-600 mt-1">Proposal to allocate funds for local school supplies and programs</p>
                    <div className="flex items-center mt-2 text-sm">
                      <span className="text-gray-500">Charity: </span>
                      <span className="ml-1 text-indigo-600">Community Education Foundation</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Succeeded
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-4 text-sm">
                    <div>
                      <span className="text-gray-500">For: </span>
                      <span className="font-medium">8,760 LDAO</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Against: </span>
                      <span className="font-medium">234 LDAO</span>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charities' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Verified Charities</h2>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Add Charity
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Local Food Bank</h3>
                    <p className="text-sm text-gray-600">Providing meals to families in need</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Donations: </span>
                    <span className="font-medium">24,500 LDAO</span>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800">
                    View Details
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Community Education Foundation</h3>
                    <p className="text-sm text-gray-600">Supporting local schools and education</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Donations: </span>
                    <span className="font-medium">18,200 LDAO</span>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800">
                    View Details
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Environmental Conservation Group</h3>
                    <p className="text-sm text-gray-600">Protecting local wildlife and habitats</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Donations: </span>
                    <span className="font-medium">0 LDAO</span>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Donation Records</h2>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Record Donation
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Nov 10, 2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Local Food Bank
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      5,000 LDAO
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      1,000 meals provided
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Nov 5, 2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Community Education Foundation
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      3,000 LDAO
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      500 school supplies distributed
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Oct 28, 2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Animal Shelter
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2,500 LDAO
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      200 animals cared for
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharityDashboard;