import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { 
  useReadCharityGovernanceGetProposal,
  useReadCharityVerificationSystemIsCharityVerified,
  useReadProofOfDonationNftDonations,
  useWriteBaseSubDaoCreateCharityProposal,
  useWriteCharityVerificationSystemAddCharity,
  useWriteProofOfDonationNftRecordDonation
} from '../generated';

const CharityDashboard = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('proposals');
  const [proposals, setProposals] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  
  // Example contract addresses from deployedAddresses-sepolia.json
  const charityGovernanceAddress = '0x25b39592AA8da0be424734E0F143E5371396dd61';
  const charityVerificationAddress = '0x4e2F69c11897771e443A3EA03E207DC402496eb0';
  const proofOfDonationNFTAddress = '0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4';

  // Read contract data
  const { data: proposalData } = useReadCharityGovernanceGetProposal({
    address: charityGovernanceAddress,
    args: [1n] // Example proposal ID
  });

  const { data: isCharityVerified } = useReadCharityVerificationSystemIsCharityVerified({
    address: charityVerificationAddress,
    args: [address] // Example charity address
  });

  const { data: donationData } = useReadProofOfDonationNftDonations({
    address: proofOfDonationNFTAddress,
    args: [1n] // Example donation ID
  });

  // Write contract functions
  const { writeContract: proposeCharityDonation } = useWriteBaseSubDaoCreateCharityProposal();
  const { writeContract: addCharity } = useWriteCharityVerificationSystemAddCharity();
  const { writeContract: recordDonation } = useWriteProofOfDonationNftRecordDonation();

  // Watch contract events
  useWatchContractEvent({
    address: charityGovernanceAddress,
    abi: [
      {
        type: 'event',
        anonymous: false,
        inputs: [
          { name: 'id', type: 'uint256', indexed: false },
          { name: 'proposer', type: 'address', indexed: false },
          { name: 'title', type: 'string', indexed: false },
          { name: 'charityRecipient', type: 'address', indexed: false },
          { name: 'donationAmount', type: 'uint256', indexed: false },
          { name: 'charityName', type: 'string', indexed: false }
        ],
        name: 'CharityProposalCreated'
      }
    ],
    eventName: 'CharityProposalCreated',
    onLogs: (logs) => {
      console.log('New charity proposal created:', logs);
      // Update proposals list
    }
  });

  const handleCreateProposal = () => {
    if (!isConnected) return;
    
    proposeCharityDonation({
      address: charityGovernanceAddress,
      args: [
        'Support Local Food Bank',
        'Proposal to donate to the local food bank',
        '0x1234567890123456789012345678901234567890', // charity recipient
        1000n, // donation amount
        'Local Food Bank',
        'Providing food assistance to families in need',
        'ipfs://Qm...', // proof of verification
        '1000 meals provided' // impact metrics
      ]
    });
  };

  const handleAddCharity = () => {
    if (!isConnected) return;
    
    addCharity({
      address: charityVerificationAddress,
      args: [
        '0x1234567890123456789012345678901234567890', // charity address
        'Local Food Bank',
        'Providing food assistance to families in need',
        'ipfs://Qm...' // documentation
      ]
    });
  };

  const handleRecordDonation = () => {
    if (!isConnected) return;
    
    recordDonation({
      address: proofOfDonationNFTAddress,
      args: [
        address, // donor
        '0x1234567890123456789012345678901234567890', // charity
        100n, // amount
        'Provided 100 meals to families in need' // impact story
      ]
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Charity Governance Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage charity proposals, verify organizations, and track donations
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'proposals'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Proposals
            </button>
            <button
              onClick={() => setActiveTab('charities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'charities'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verified Charities
            </button>
            <button
              onClick={() => setActiveTab('donations')}
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
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Charity Proposals</h2>
              <button
                onClick={handleCreateProposal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create Proposal
              </button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {proposals.length > 0 ? (
                  proposals.map((proposal) => (
                    <li key={proposal.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {proposal.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {proposal.status}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Charity: {proposal.charityName}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>Amount: {proposal.donationAmount?.toString()} LDAO</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div className="px-4 py-4 sm:px-6 text-center">
                      <p className="text-gray-500">No proposals found</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'charities' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Verified Charities</h2>
              <button
                onClick={handleAddCharity}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Add Charity
              </button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {charities.length > 0 ? (
                  charities.map((charity) => (
                    <li key={charity.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {charity.name}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {charity.isVerified ? 'Verified' : 'Pending'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {charity.description}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>Total Donations: {charity.totalDonationsReceived?.toString() || '0'} LDAO</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div className="px-4 py-4 sm:px-6 text-center">
                      <p className="text-gray-500">No charities found</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'donations' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Donation Records</h2>
              <button
                onClick={handleRecordDonation}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Record Donation
              </button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {donations.length > 0 ? (
                  donations.map((donation) => (
                    <li key={donation.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            Donation #{donation.id}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {donation.amount?.toString()} LDAO
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Donor: {donation.donor}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>Charity: {donation.charity}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Impact: {donation.impactStory}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div className="px-4 py-4 sm:px-6 text-center">
                      <p className="text-gray-500">No donations recorded</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharityDashboard;