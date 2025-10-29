import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Vote, Users, FileText, Calendar, CheckCircle, TrendingUp, HelpCircle } from 'lucide-react';

const GovernanceGuidePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Governance Guide - LinkDAO</title>
        <meta name="description" content="Complete guide to participating in LinkDAO governance - creating proposals, voting, and shaping the platform" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-8 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support
          </Link>

          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Governance Guide</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Participate in shaping the future of LinkDAO. Learn how to create proposals, vote on decisions, and contribute to platform governance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <Vote className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Voting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Participate in decisions that shape the platform's future.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <FileText className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Proposals</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create and submit proposals for platform improvements.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <Users className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Community</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Engage with other token holders in governance discussions.
              </p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Getting Started with Governance</h2>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Acquire LDAO Tokens</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Governance participation requires holding LDAO tokens. Your voting power is proportional to your token balance.
                </p>
                <Link href="/docs/ldao-token-guide" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Learn how to acquire LDAO tokens →
                </Link>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Connect Your Wallet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Connect the wallet that holds your LDAO tokens to participate in governance.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200">
                    <span className="font-bold">Note:</span> You can delegate your voting power to another wallet address if you prefer.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Explore Active Proposals</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Visit the governance center to view active proposals and participate in voting.
                </p>
                <Link href="/governance" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Go to Governance Center
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Creating Proposals</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Proposal Requirements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Minimum Token Balance</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You need to hold at least 1,000 LDAO tokens to create a proposal.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Proposal Deposit</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    A deposit of 100 LDAO tokens is required to submit a proposal. This is refunded if the proposal reaches the minimum threshold.
                  </p>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">How to Create a Proposal</h3>
              
              <div className="space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-800 dark:text-blue-200 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Draft Your Proposal</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Clearly articulate the problem, proposed solution, and implementation plan.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-800 dark:text-blue-200 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Submit for Review</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Submit your proposal through the governance interface with the required deposit.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-800 dark:text-blue-200 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Community Discussion</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Engage with the community in the discussion forum to address questions and gather support.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-800 dark:text-blue-200 font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Voting Period</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      If the proposal reaches the minimum threshold, it enters a 7-day voting period.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold">Important:</span> Proposals must adhere to our community guidelines and code of conduct. Inappropriate proposals will be rejected.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Voting Process</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">How Voting Works</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">Each LDAO token equals one vote</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">Voting is open for 7 days per proposal</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">You can change your vote during the voting period</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">Quadratic voting is used for certain proposal types</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Voting Options</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-900 dark:text-white font-medium">For</span>
                      <span className="text-gray-600 dark:text-gray-300">Support the proposal</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-900 dark:text-white font-medium">Against</span>
                      <span className="text-gray-600 dark:text-gray-300">Oppose the proposal</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-900 dark:text-white font-medium">Abstain</span>
                      <span className="text-gray-600 dark:text-gray-300">No opinion or neutral stance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Voting Best Practices</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Read the proposal details thoroughly before voting</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Participate in community discussions to understand different perspectives</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Consider the long-term impact of proposals on the ecosystem</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Governance Calendar</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Important Dates</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Monthly Governance Meeting</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">First Monday of each month, 15:00 UTC</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm">Community Event</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Proposal Submission Deadline</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Every Wednesday, 12:00 UTC</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full text-sm">Deadline</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Quarterly Review</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">First week of January, April, July, October</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-full text-sm">Review</span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>All times are shown in UTC. Add to your calendar to receive reminders.</span>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Delegation</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Delegate Your Voting Power</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you don't have time to vote on every proposal, you can delegate your voting power to a trusted community member.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">How to Delegate</h4>
                  <ol className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li>1. Go to the Governance Center</li>
                    <li>2. Click on "Delegation" tab</li>
                    <li>3. Enter the wallet address of your delegate</li>
                    <li>4. Confirm the transaction</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Revoking Delegation</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You can revoke delegation at any time and resume voting with your own tokens.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-bold">Tip:</span> Choose delegates who are active in the community and have demonstrated good judgment in governance matters.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Need More Help?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/support/live-chat" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">Live Chat</span>
              </Link>
              
              <Link href="/support/faq" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">FAQ</span>
              </Link>
              
              <Link href="/support/tickets" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">Support Tickets</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default GovernanceGuidePage;