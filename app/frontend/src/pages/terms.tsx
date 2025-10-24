import React from 'react';
import Layout from '@/components/Layout';

export default function TermsOfService() {
  return (
    <Layout title="Terms of Service - LinkDAO">
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using LinkDAO ("the Platform"), you agree to be bound by these Terms of Service 
              and all applicable laws and regulations. If you do not agree with any of these terms, you are 
              prohibited from using or accessing this Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Web3 and Blockchain Interactions</h2>
            <p>
              LinkDAO is a decentralized social platform built on blockchain technology. By using this Platform, 
              you acknowledge and understand that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All blockchain transactions are irreversible once confirmed</li>
              <li>You are responsible for the security of your wallet and private keys</li>
              <li>Gas fees and transaction costs are determined by the blockchain network, not by LinkDAO</li>
              <li>Smart contract interactions carry inherent risks, including potential loss of funds</li>
              <li>LinkDAO does not have custody of your cryptocurrency or digital assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts and Wallet Connection</h2>
            <p>
              To access certain features of the Platform, you must connect a compatible Web3 wallet. You are 
              responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the security and confidentiality of your wallet credentials</li>
              <li>All activities that occur through your connected wallet</li>
              <li>Ensuring your wallet has sufficient funds to complete transactions</li>
              <li>Complying with your wallet provider's terms of service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Community and Content Guidelines</h2>
            <p>
              Users of LinkDAO must adhere to the following guidelines when creating or sharing content:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Do not post illegal, harmful, threatening, abusive, or otherwise objectionable content</li>
              <li>Respect intellectual property rights and do not post copyrighted material without permission</li>
              <li>Do not engage in harassment, hate speech, or discrimination</li>
              <li>Do not spam, scam, or engage in fraudulent activities</li>
              <li>Do not impersonate others or misrepresent your identity</li>
            </ul>
            <p>
              LinkDAO reserves the right to remove content and restrict access to users who violate these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Marketplace Terms</h2>
            <p>
              The LinkDAO Marketplace allows users to buy and sell products and services. Additional terms apply:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sellers are responsible for the accuracy of product descriptions and fulfillment of orders</li>
              <li>Buyers acknowledge that transactions may be facilitated through smart contracts</li>
              <li>LinkDAO is not a party to transactions between buyers and sellers</li>
              <li>Disputes must be resolved between the parties involved; LinkDAO provides tools but does not arbitrate</li>
              <li>All transactions are subject to applicable taxes and fees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Governance and DAO Participation</h2>
            <p>
              LinkDAO operates as a decentralized autonomous organization. By participating in governance:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You acknowledge that governance decisions are made collectively by token holders</li>
              <li>Voting rights are determined by token holdings at the time of proposal snapshots</li>
              <li>You agree to abide by the outcomes of governance votes</li>
              <li>You understand that governance tokens may have value and are subject to market forces</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Intellectual Property</h2>
            <p>
              The Platform and its original content, features, and functionality are owned by LinkDAO and are 
              protected by international copyright, trademark, patent, trade secret, and other intellectual 
              property laws. Users retain ownership of content they create and post on the Platform, but grant 
              LinkDAO a license to use, display, and distribute such content within the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Disclaimers and Limitation of Liability</h2>
            <p>
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. LinkDAO does 
              not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The accuracy, completeness, or timeliness of information on the Platform</li>
              <li>Uninterrupted or error-free operation of the Platform</li>
              <li>The security or safety of any transactions conducted through the Platform</li>
              <li>Protection against unauthorized access or loss of data</li>
            </ul>
            <p className="mt-4">
              IN NO EVENT SHALL LINKDAO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR 
              PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE 
              LOSSES, RESULTING FROM YOUR USE OF THE PLATFORM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless LinkDAO, its officers, directors, employees, 
              and agents from and against any claims, liabilities, damages, losses, and expenses arising out 
              of or in any way connected with your access to or use of the Platform, your violation of these 
              Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to Terms</h2>
            <p>
              LinkDAO reserves the right to modify these Terms at any time. Changes will be effective 
              immediately upon posting to the Platform. Your continued use of the Platform after changes 
              are posted constitutes your acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your access to the Platform immediately, without prior notice or 
              liability, for any reason, including breach of these Terms. Upon termination, your right to 
              use the Platform will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which LinkDAO operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us through the Platform's support 
              channels or via our official communication channels.
            </p>
          </section>

          <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Important Notice:</strong> These Terms of Service are subject to change. Please review 
              them periodically. By continuing to use LinkDAO after changes are made, you agree to be bound 
              by the revised Terms.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
