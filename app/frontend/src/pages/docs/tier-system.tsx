import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TierSystemGuide = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Head>
        <title>LinkDAO Tier System Guide | LinkDAO Marketplace</title>
        <meta name="description" content="Learn about the LinkDAO marketplace tier system and how to progress through different seller tiers" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <nav className="mb-6">
            <Link href="/" className="text-blue-300 hover:text-white transition-colors">
              ← Back to Marketplace
            </Link>
          </nav>
          <h1 className="text-4xl font-bold text-white mb-2">LinkDAO Seller Tier System</h1>
          <p className="text-xl text-gray-300">Learn how our tier system works and how to unlock new benefits</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-4">Contents</h2>
              <ul className="space-y-2">
                <li><a href="#overview" className="text-blue-300 hover:text-white transition-colors">Overview</a></li>
                <li><a href="#visual-representation" className="text-blue-300 hover:text-white transition-colors">Visual Status</a></li>
                <li><a href="#tiers" className="text-blue-300 hover:text-white transition-colors">Tiers</a></li>
                <li><a href="#progression" className="text-blue-300 hover:text-white transition-colors">Progression</a></li>
                <li><a href="#features" className="text-blue-300 hover:text-white transition-colors">Features</a></li>
                <li><a href="#improvement" className="text-blue-300 hover:text-white transition-colors">Improvement Tips</a></li>
                <li><a href="#faq" className="text-blue-300 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <article className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-gray-200">
              <section id="overview">
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="mb-4">
                  The LinkDAO marketplace features a tier-based system that rewards sellers for their performance and engagement. As you grow your store and improve your customer service, you'll unlock new benefits and features that can help you succeed on the platform.
                </p>
              </section>

              <section id="visual-representation" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Visual Representation of Your Tier Status</h2>
                <p className="mb-4">
                  The tier system is presented visually throughout the marketplace to help you understand your current status and progress:
                </p>
                
                <h3 className="text-xl font-semibold text-white mb-2">Tier Badges and Icons</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Each tier has a unique icon: 🥉 for Bronze, 🥈 for Silver, 🥇 for Gold, etc.</li>
                  <li>Your current tier is displayed as a colored badge on your store page</li>
                  <li>Tier badges are prominently shown in your seller dashboard</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Progress Tracking Visuals</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Progress bars show your advancement toward the next tier</li>
                  <li>Visual indicators display completed and remaining requirements</li>
                  <li>Color-coded elements help you quickly identify your status</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Dashboard Visualizations</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Charts and graphs show your performance metrics</li>
                  <li>Progress tracking widgets display your advancement</li>
                  <li>Visual notifications alert you to tier upgrades or opportunities</li>
                </ul>
              </section>

              <section id="tiers" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Understanding Tiers</h2>
                <p className="mb-4">
                  The tier system consists of five levels, each with increasing benefits and requirements:
                </p>
                
                <h3 className="text-xl font-semibold text-white mb-2">1. Bronze Tier (Entry Level)</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Create unlimited active listings</li>
                  <li>Standard 5% platform commission rate</li>
                  <li>Access to basic seller tools</li>
                  <li>Weekly withdrawal limit of $1,000</li>
                </ul>
                <p className="mb-4">
                  <strong>Requirements:</strong> Connect your wallet and create a seller profile. No minimum sales or rating requirements.
                </p>
                <p className="mb-8 text-gray-300">Perfect for: New sellers just getting started with their online store</p>
                
                <h3 className="text-xl font-semibold text-white mb-2">2. Silver Tier</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Create unlimited active listings</li>
                  <li>Reduced 4.5% platform commission rate</li>
                  <li>Access to basic analytics dashboard</li>
                  <li>Priority customer support</li>
                  <li>Weekly withdrawal limit of $5,000</li>
                </ul>
                <p className="mb-4">
                  <strong>Requirements:</strong> Complete $5,000 in sales, maintain 4.0+ star rating, maintain average response time under 1 hour.
                </p>
                <p className="mb-8 text-gray-300">Perfect for: Growing sellers with consistent sales and good customer service</p>
                
                <h3 className="text-xl font-semibold text-white mb-2">3. Gold Tier</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Create unlimited active listings</li>
                  <li>Lower 4% platform commission rate</li>
                  <li>Advanced analytics dashboard</li>
                  <li>Priority customer support</li>
                  <li>Access to marketing tools</li>
                  <li>Weekly withdrawal limit of $25,000</li>
                </ul>
                <p className="mb-4">
                  <strong>Requirements:</strong> Complete $25,000 in sales, maintain 4.3+ star rating, maintain average response time under 30 minutes, keep return rate below 5%.
                </p>
                <p className="mb-8 text-gray-300">Perfect for: Established sellers with strong performance metrics</p>
                
                <h3 className="text-xl font-semibold text-white mb-2">4. Platinum Tier</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Create unlimited active listings</li>
                  <li>Lowest 3.5% platform commission rate</li>
                  <li>Dedicated account manager</li>
                  <li>Early access to new platform features</li>
                  <li>Custom store branding options</li>
                  <li>Weekly withdrawal limit of $100,000</li>
                </ul>
                <p className="mb-4">
                  <strong>Requirements:</strong> Complete $100,000 in sales, maintain 4.5+ star rating, maintain average response time under 15 minutes, keep return rate below 3%, keep dispute rate below 1%.
                </p>
                <p className="mb-8 text-gray-300">Perfect for: High-performing sellers with exceptional service</p>
                
                <h3 className="text-xl font-semibold text-white mb-2">5. Diamond Tier (Elite Level)</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Create unlimited active listings</li>
                  <li>VIP 3% platform commission rate</li>
                  <li>White-glove support service</li>
                  <li>Revenue sharing opportunities</li>
                  <li>Exclusive seller events</li>
                  <li>Advanced API access</li>
                  <li>No withdrawal limits</li>
                  <li>Custom store branding</li>
                </ul>
                <p className="mb-4">
                  <strong>Requirements:</strong> Complete $500,000 in sales, maintain 4.7+ star rating, maintain average response time under 10 minutes, keep return rate below 2%, keep dispute rate below 0.5%, maintain repeat customer rate above 30%.
                </p>
                <p className="mb-8 text-gray-300">Perfect for: Top-performing sellers who exemplify excellence</p>
              </section>

              <section id="progression" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">How Tier Progression Works</h2>
                
                <h3 className="text-xl font-semibold text-white mb-2">Automatic Evaluation</h3>
                <p className="mb-4">
                  Your tier is automatically evaluated based on your performance metrics. The system checks your status regularly and upgrades you when you meet the requirements for a higher tier.
                </p>
                
                <h3 className="text-xl font-semibold text-white mb-2">Progress Tracking</h3>
                <p className="mb-4">
                  You can track your progress toward the next tier through your seller dashboard. The system will show you:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Which requirements you've already met</li>
                  <li>What you need to achieve for the next tier</li>
                  <li>Estimated time to reach the next tier</li>
                  <li>Specific actions you can take to improve your standing</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Benefits Activation</h3>
                <p className="mb-4">
                  When you're upgraded to a new tier, your new benefits are activated immediately. You'll receive a notification and can start using your new features right away.
                </p>
              </section>

              <section id="features" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Key Features by Tier</h2>
                
                <h3 className="text-xl font-semibold text-white mb-2">Listing Limits</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Bronze: Unlimited listings</li>
                  <li>Silver: Unlimited listings</li>
                  <li>Gold: Unlimited listings</li>
                  <li>Platinum: Unlimited listings</li>
                  <li>Diamond: Unlimited listings</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Commission Rates</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Bronze: 5% platform commission</li>
                  <li>Silver: 4.5% platform commission</li>
                  <li>Gold: 4% platform commission</li>
                  <li>Platinum: 3.5% platform commission</li>
                  <li>Diamond: 3% platform commission</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Support Levels</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Bronze: Standard support</li>
                  <li>Silver: Priority support</li>
                  <li>Gold: Priority support</li>
                  <li>Platinum: Dedicated account manager</li>
                  <li>Diamond: White-glove support service</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Analytics Access</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Bronze: Basic analytics</li>
                  <li>Silver: Basic analytics dashboard</li>
                  <li>Gold: Advanced analytics dashboard</li>
                  <li>Platinum: Advanced analytics + early access features</li>
                  <li>Diamond: Advanced analytics + custom reporting</li>
                </ul>
              </section>

              <section id="improvement" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Tips to Improve Your Tier Status</h2>
                
                <h3 className="text-xl font-semibold text-white mb-2">Improve Your Ratings</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Provide excellent customer service</li>
                  <li>Ship items promptly and as described</li>
                  <li>Communicate proactively with buyers</li>
                  <li>Request feedback after successful transactions</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Increase Sales Volume</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Optimize your product listings with good descriptions and images</li>
                  <li>Offer competitive pricing</li>
                  <li>Run promotions and sales events</li>
                  <li>Engage with the LinkDAO community</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Maintain Fast Response Times</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Check messages regularly</li>
                  <li>Respond to customer inquiries within a few hours</li>
                  <li>Set up notifications to alert you to new messages</li>
                  <li>Use templates for common questions</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-white mb-2">Minimize Returns and Disputes</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Provide accurate product descriptions</li>
                  <li>Use quality packaging</li>
                  <li>Process returns quickly and professionally</li>
                  <li>Resolve issues before they escalate</li>
                </ul>
              </section>

              <section id="faq" className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">How often is my tier status evaluated?</h3>
                    <p className="mt-1">
                      Your tier status is evaluated automatically on a regular basis. When you meet the requirements for a higher tier, you'll be upgraded automatically.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Can I lose my tier status?</h3>
                    <p className="mt-1">
                      Yes, if your performance metrics decline significantly, you may be moved back to a lower tier. However, you can regain your status by improving your metrics again.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Do I lose benefits if I drop to a lower tier?</h3>
                    <p className="mt-1">
                      If your tier status changes to a lower tier, your benefits will adjust to match the new tier. However, you can always work to regain higher tier status.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Are there any fees to move up tiers?</h3>
                    <p className="mt-1">
                      No, tier progression is completely free. You simply need to meet the performance requirements to unlock higher tiers.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Can I see my current tier and progress?</h3>
                    <p className="mt-1">
                      Yes, your current tier and progress toward the next tier are displayed in your seller dashboard with clear visual indicators.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Do tier benefits apply retroactively?</h3>
                    <p className="mt-1">
                      Benefits apply from the moment you reach a new tier. Any new commission rates will apply to future sales, not past sales.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Getting Help</h2>
                <p className="mb-4">
                  If you have questions about the tier system or need help improving your seller performance:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Check the seller dashboard for your current progress</li>
                  <li>Review your performance metrics and insights</li>
                  <li>Contact support through your seller dashboard</li>
                  <li>Join the LinkDAO community to connect with other sellers</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierSystemGuide;