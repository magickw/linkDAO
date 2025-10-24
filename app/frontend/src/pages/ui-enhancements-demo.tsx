import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import QuickFilterChips from '@/components/Community/QuickFilterChips';
import EmptyStates from '@/components/Community/EmptyStates';
import TokenPriceSparkline, { generateMockPriceHistory } from '@/components/Community/TokenPriceSparkline';
import GovernanceActivityPulse, { GovernanceActivityPulseWithTooltip } from '@/components/Community/GovernanceActivityPulse';
import KeyboardShortcutsModal from '@/components/Community/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Demo page showcasing all 5 UI enhancement components
 * Path: /ui-enhancements-demo
 */
const UIEnhancementsDemo: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>(['trending']);
  const [emptyStateType, setEmptyStateType] = useState<'no-posts' | 'not-joined' | 'no-filter-results' | 'no-search-results'>('not-joined');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShowKeyboardHelp(true),
    onEscape: () => setShowKeyboardHelp(false),
    enabled: true
  });

  return (
    <Layout title="UI Enhancements Demo">
      <Head>
        <title>UI Enhancements Demo - LinkDAO</title>
        <meta name="description" content="Showcase of 5 UI enhancement components" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Community UI Enhancements Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Showcasing 5 prioritized quick-win UI components. Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> to see keyboard shortcuts.
          </p>
        </div>

        {/* Component 1: Quick Filter Chips */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Quick Filter Chips
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            One-click filters for communities and posts. Click to toggle.
          </p>
          <QuickFilterChips
            activeFilters={activeFilters}
            onFilterToggle={(filterId) => {
              setActiveFilters(prev =>
                prev.includes(filterId)
                  ? prev.filter(f => f !== filterId)
                  : [...prev, filterId]
              );
            }}
          />
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
            Active filters: {activeFilters.length > 0 ? activeFilters.join(', ') : 'None'}
          </div>
        </section>

        {/* Component 2: Empty States */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            2. Empty States Component
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Contextual empty state messages with illustrations.
          </p>
          
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['not-joined', 'no-posts', 'no-filter-results', 'no-search-results'] as const).map(type => (
              <button
                key={type}
                onClick={() => setEmptyStateType(type)}
                className={`px-3 py-1 rounded text-sm ${
                  emptyStateType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {type.replace(/-/g, ' ')}
              </button>
            ))}
          </div>

          <EmptyStates
            type={emptyStateType}
            onAction={() => console.log('Action clicked')}
            searchQuery="ethereum"
            activeFilters={activeFilters}
          />
        </section>

        {/* Component 3: Token Price Sparklines */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            3. Token Price Sparklines
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Mini 7-day price trend charts with percentage changes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'ETH', price: 2456.78, history: generateMockPriceHistory(7) },
              { name: 'LDAO', price: 5.42, history: generateMockPriceHistory(7) },
              { name: 'USDC', price: 1.00, history: generateMockPriceHistory(7) }
            ].map(token => (
              <div key={token.name} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{token.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    ${token.price.toFixed(2)}
                  </span>
                  <TokenPriceSparkline
                    priceHistory={token.history}
                    currentPrice={token.price}
                    width={100}
                    height={30}
                    showChange={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Component 4: Governance Activity Pulse */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            4. Governance Activity Pulse Indicator
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Animated pulse indicators for active governance proposals.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Size Variants</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <GovernanceActivityPulse activeProposals={3} size="sm" showCount={true} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Small</span>
                </div>
                <div className="flex items-center gap-2">
                  <GovernanceActivityPulse activeProposals={5} size="md" showCount={true} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <GovernanceActivityPulse activeProposals={12} size="lg" showCount={true} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Large</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">States</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <GovernanceActivityPulse activeProposals={3} size="md" showLabel={true} />
                </div>
                <div className="flex items-center gap-2">
                  <GovernanceActivityPulse activeProposals={2} urgentProposals={2} size="md" showLabel={true} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">With Tooltip (hover)</h3>
              <GovernanceActivityPulseWithTooltip
                activeProposals={3}
                proposals={[
                  { id: '1', title: 'Treasury Allocation Proposal', endTime: new Date(Date.now() + 86400000 * 2) },
                  { id: '2', title: 'Protocol Upgrade v2.0', endTime: new Date(Date.now() + 86400000 * 5) },
                  { id: '3', title: 'Community Grant Program', endTime: new Date(Date.now() + 86400000 * 7) }
                ]}
                size="md"
                showCount={true}
              />
            </div>
          </div>
        </section>

        {/* Component 5: Keyboard Shortcuts */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            5. Keyboard Shortcuts
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Navigate faster with keyboard shortcuts.
          </p>

          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Show Keyboard Shortcuts
          </button>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-2">Try these shortcuts on this page:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">?</kbd> to show help</li>
              <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">j</kbd> or <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">↓</kbd> to scroll down</li>
              <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">k</kbd> or <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">↑</kbd> to scroll up</li>
              <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">Esc</kbd> to close modals</li>
            </ul>
          </div>
        </section>

        {/* Integration Notes */}
        <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Integration & Usage
          </h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>✅ All 5 components are production-ready and integrated into <code className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">communities.tsx</code></p>
            <p>✅ TypeScript types included, dark mode supported, fully responsive</p>
            <p>✅ No linting errors, follows LinkDAO coding standards (2-space indent, Tailwind CSS)</p>
            <p>📚 See <code className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded">UI_ENHANCEMENTS_GUIDE.md</code> for detailed usage examples</p>
            <p>📦 Components: QuickFilterChips, EmptyStates, TokenPriceSparkline, GovernanceActivityPulse, KeyboardShortcuts</p>
          </div>
        </section>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </Layout>
  );
};

export default UIEnhancementsDemo;
