import React, { useState } from 'react';
import Layout from '@/components/Layout';

export default function Governance() {
  const [proposals, setProposals] = useState([
    {
      id: 1,
      title: "Increase Community Fund Allocation",
      description: "Proposal to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives.",
      status: "Active",
      votes: { yes: 1245, no: 321 },
      endTime: "2023-08-01"
    },
    {
      id: 2,
      title: "New Partnership with DeFi Project",
      description: "Proposal to establish a strategic partnership with a leading DeFi project to integrate their services into our platform.",
      status: "Ended",
      votes: { yes: 2156, no: 432 },
      endTime: "2023-07-20"
    },
    {
      id: 3,
      title: "Platform Fee Structure Update",
      description: "Proposal to adjust the platform fee structure to better support long-term sustainability while maintaining accessibility.",
      status: "Active",
      votes: { yes: 876, no: 234 },
      endTime: "2023-08-05"
    }
  ]);

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: ''
  });

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would connect to the smart contract
    console.log('Creating proposal:', newProposal);
    alert('Proposal created successfully!');
    
    // Reset form
    setNewProposal({ title: '', description: '' });
  };

  return (
    <Layout title="Governance - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Governance</h1>
          
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Proposal</h2>
            
            <form onSubmit={handleCreateProposal}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Proposal Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter proposal title"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe your proposal in detail..."
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create Proposal
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Active Proposals</h2>
            
            <div className="space-y-6">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{proposal.title}</h3>
                      <p className="mt-2 text-gray-600">{proposal.description}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      proposal.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">Yes Votes</p>
                        <p className="text-lg font-semibold text-green-600">{proposal.votes.yes}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">No Votes</p>
                        <p className="text-lg font-semibold text-red-600">{proposal.votes.no}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Voting Ends</p>
                      <p className="text-lg font-semibold text-gray-900">{proposal.endTime}</p>
                    </div>
                  </div>
                  
                  {proposal.status === 'Active' && (
                    <div className="mt-4 flex space-x-3">
                      <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Vote Yes
                      </button>
                      <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Vote No
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}