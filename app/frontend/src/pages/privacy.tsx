import React from 'react';
import Layout from '@/components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout title="Privacy Policy - LinkDAO">
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to LinkDAO's Privacy Policy. This policy describes how we collect, use, store, and 
              protect your information when you use our decentralized social platform. We are committed to 
              protecting your privacy and ensuring transparency in our data practices.
            </p>
            <p className="mt-4">
              As a Web3 platform built on blockchain technology, LinkDAO operates differently from traditional 
              social networks. Much of the data you interact with is stored on public blockchains, which affects 
              how we handle privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-4">2.1 Blockchain Data</h3>
            <p>
              When you connect your wallet and interact with LinkDAO, certain information is recorded on the blockchain:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your wallet address (public key)</li>
              <li>Transaction history related to LinkDAO smart contracts</li>
              <li>Token holdings and governance participation</li>
              <li>Marketplace transactions and interactions</li>
              <li>Community memberships and activity</li>
              <li>Escrow and smart contract interactions</li>
              <li>DAO governance votes and proposals</li>
              <li>NFT ownership and transfers</li>
            </ul>
            <p className="mt-4">
              <strong>Important:</strong> Blockchain data is public, permanent, and cannot be deleted or modified 
              after it has been recorded on the blockchain.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.2 Off-Chain Data</h3>
            <p>
              We also collect and store certain information off-chain to enhance your experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Profile information (username, bio, avatar)</li>
              <li>Content you create (posts, comments, messages)</li>
              <li>User preferences and settings</li>
              <li>Device and browser information</li>
              <li>IP addresses and usage analytics</li>
              <li>Push notification tokens for mobile features</li>
              <li>Marketplace order and escrow data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.3 Wallet Connection Data</h3>
            <p>
              When you connect your wallet using services like WalletConnect or RainbowKit:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We receive your wallet address to authenticate your identity</li>
              <li>We may access your token balances to verify eligibility for certain features</li>
              <li>We do not have access to your private keys or seed phrases</li>
              <li>We cannot initiate transactions without your explicit approval</li>
              <li>Transaction signing occurs solely in your wallet application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <p>
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Platform Operation:</strong> To provide, maintain, and improve LinkDAO's features and functionality</li>
              <li><strong>Authentication:</strong> To verify your identity and wallet ownership</li>
              <li><strong>Personalization:</strong> To customize your experience and provide relevant content</li>
              <li><strong>Community Features:</strong> To enable social interactions, messaging, and community participation</li>
              <li><strong>Governance:</strong> To facilitate DAO voting and proposal management</li>
              <li><strong>Marketplace:</strong> To process transactions and manage buyer-seller interactions</li>
              <li><strong>Smart Contract Interactions:</strong> To facilitate escrow, NFT transactions, and other blockchain-based features</li>
              <li><strong>Analytics:</strong> To understand usage patterns and improve the platform</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security threats</li>
              <li><strong>Communications:</strong> To send important updates, notifications, and announcements</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-4">4.1 Public Blockchain Data</h3>
            <p>
              Any data recorded on the blockchain is publicly accessible and may be viewed by anyone with access 
              to the blockchain network. This includes transaction history, token holdings, and smart contract interactions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.2 Third-Party Services</h3>
            <p>
              We may share information with third-party service providers who help us operate the platform:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Infrastructure providers (hosting, storage, content delivery)</li>
              <li>Analytics and monitoring services</li>
              <li>Wallet connection providers (WalletConnect, RainbowKit)</li>
              <li>Blockchain data indexers and APIs</li>
              <li>Smart contract verification services</li>
              <li>Customer support tools</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.3 Smart Contract Interactions</h3>
            <p>
              When you interact with smart contracts on the platform:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data may be shared with decentralized oracles and external protocols</li>
              <li>Transaction data becomes permanently recorded on the blockchain</li>
              <li>Smart contract events may be indexed by third-party services</li>
              <li>Escrow and multi-signature transactions may involve additional parties</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.4 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law or in response to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Legal processes (subpoenas, court orders)</li>
              <li>Government requests or regulatory inquiries</li>
              <li>Protection of our rights, property, or safety</li>
              <li>Prevention of fraud or security threats</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.5 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to 
              the acquiring entity, subject to the same privacy protections outlined in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Monitoring for suspicious activity and potential breaches</li>
              <li>Incident response procedures</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the internet or electronic storage is 100% secure. While 
              we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Rights and Choices</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-4">6.1 Access and Portability</h3>
            <p>
              You have the right to access your personal data and request a copy in a portable format.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.2 Correction and Updates</h3>
            <p>
              You can update your profile information and preferences directly through the platform settings.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.3 Deletion Requests</h3>
            <p>
              You can request deletion of your off-chain data through our{' '}
              <a href="/data-deletion" className="text-primary-600 dark:text-primary-400 hover:underline">
                Data Deletion page
              </a>
              . However, please note:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Blockchain data is permanent and cannot be deleted</li>
              <li>Some information may be retained for legal or operational purposes</li>
              <li>Anonymized or aggregated data may be retained for analytics</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.4 Push Notifications</h3>
            <p>
              You can manage push notification preferences through your device settings or within the platform. 
              Note that disabling notifications may limit certain features of the mobile experience.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.5 Cookie Preferences</h3>
            <p>
              You can manage cookie preferences through your browser settings. Note that disabling cookies may 
              limit certain features of the platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.6 Marketing Communications</h3>
            <p>
              You can opt out of promotional communications by updating your notification preferences or using 
              the unsubscribe link in emails.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Children's Privacy</h2>
            <p>
              LinkDAO is not intended for users under the age of 13 (or the applicable age of digital consent 
              in your jurisdiction). We do not knowingly collect personal information from children. If we 
              become aware that we have collected data from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. International Data Transfers</h2>
            <p>
              As a decentralized platform, LinkDAO operates globally. Your information may be transferred to 
              and processed in countries other than your own. We ensure appropriate safeguards are in place 
              to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remember your preferences and settings</li>
              <li>Authenticate your session</li>
              <li>Analyze usage patterns and performance</li>
              <li>Provide personalized content</li>
              <li>Measure marketing effectiveness</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings, but this may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Third-Party Links</h2>
            <p>
              LinkDAO may contain links to third-party websites, applications, or services. We are not 
              responsible for the privacy practices of these third parties. We encourage you to review their 
              privacy policies before providing any personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide the services you've requested</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain security and prevent fraud</li>
            </ul>
            <p className="mt-4">
              Blockchain data is retained permanently by the nature of distributed ledger technology.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal 
              requirements. We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Posting the updated policy on the platform</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending notifications for material changes</li>
            </ul>
            <p className="mt-4">
              Your continued use of LinkDAO after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, 
              please contact us through:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The support section within the platform</li>
              <li>Our official communication channels</li>
              <li>Community governance forums for policy feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. Your California Privacy Rights</h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer Privacy 
              Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information we collect and how it's used</li>
              <li>Right to delete your personal information (subject to exceptions)</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
            <p className="mt-4">
              Note: LinkDAO does not sell personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. AI and Automated Decision-Making</h2>
            <p>
              LinkDAO may use artificial intelligence and automated systems for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Content recommendation and personalization</li>
              <li>Fraud detection and security monitoring</li>
              <li>Automated compliance checking</li>
              <li>Smart contract interaction analysis</li>
              <li>Marketplace transaction risk assessment</li>
            </ul>
            <p className="mt-4">
              Our AI systems do not make solely automated decisions that significantly affect you. Human 
              oversight is maintained for all significant decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">15. European Economic Area (EEA) Rights</h2>
            <p>
              If you are located in the EEA, you have rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with supervisory authorities</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Understanding Web3 Privacy
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              As a Web3 platform, LinkDAO operates on public blockchain infrastructure. While we take privacy 
              seriously and implement protections for off-chain data, blockchain transactions are public by 
              design. We recommend using separate wallets for different activities and being mindful of what 
              information you share on-chain.
            </p>
          </div>

          <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
              Charity Governance and Token Features
            </h3>
            <p className="text-sm text-green-800 dark:text-green-300">
              LinkDAO includes charity governance features that allow token holders to participate in 
              decentralized charitable giving. Your token holdings and governance participation may be 
              publicly visible on the blockchain. Proof-of-donation NFTs may be minted to your wallet to 
              verify charitable contributions.
            </p>
          </div>

          <div className="mt-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Important Notice:</strong> This Privacy Policy is subject to change. We encourage you to 
              review it periodically. By continuing to use LinkDAO after changes are made, you acknowledge and 
              agree to the updated Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
