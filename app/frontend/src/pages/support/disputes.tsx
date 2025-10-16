import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DisputeResolutionPanel from '@/components/Marketplace/DisputeResolution/DisputeResolutionPanel';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { ShieldAlert, BookOpen, MessageSquare, LifeBuoy, Gavel, Scale } from 'lucide-react';
import { useRouter } from 'next/router';
import { disputeService } from '@/services/disputeService';
import { useToast } from '@/context/ToastContext';

const DisputesSupportPage: React.FC = () => {
  const router = useRouter();
  const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined;
  const { addToast } = useToast();

  const [stats, setStats] = useState<{
    totalDisputes: number;
    activeDisputes: number;
    resolvedDisputes: number;
    userDisputes: number;
  } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      setIsStatsLoading(true);
      try {
        const fetchedStats = await disputeService.getDisputeStats();
        if (!cancelled) {
          setStats(fetchedStats);
        }
      } catch (error) {
        console.error('Failed to load dispute stats', error);
        if (!cancelled) {
          addToast('Unable to load dispute statistics at the moment.', 'warning');
        }
      } finally {
        if (!cancelled) {
          setIsStatsLoading(false);
        }
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  return (
    <Layout title="Support & Disputes - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-white">
        <div className="flex flex-col gap-4">
          <div className="bg-white/10 rounded-2xl p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <ShieldAlert size={36} className="text-red-400" />
                Resolve a marketplace dispute
              </h1>
              <p className="text-white/70 max-w-2xl">
                LinkDAO protects buyers and sellers through escrow and community arbitration. Start a dispute,
                submit evidence, and involve the DAO if needed—all from one dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/marketplace/orders')}>
                View your orders
              </Button>
              <Button variant="primary" onClick={() => router.push('/marketplace')}>
                Return to marketplace
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-white/60">Total cases</p>
            <p className="text-2xl font-semibold text-white">
              {stats ? stats.totalDisputes : isStatsLoading ? '—' : '0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-white/60">Active disputes</p>
            <p className="text-2xl font-semibold text-yellow-300">
              {stats ? stats.activeDisputes : isStatsLoading ? '—' : '0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-white/60">Resolved</p>
            <p className="text-2xl font-semibold text-emerald-300">
              {stats ? stats.resolvedDisputes : isStatsLoading ? '—' : '0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-white/60">Your cases</p>
            <p className="text-2xl font-semibold text-blue-300">
              {stats ? stats.userDisputes : isStatsLoading ? '—' : '0'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-white">
              <LifeBuoy size={20} />
              <h2 className="text-lg font-semibold">Support checklist</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>• Confirm your escrow transaction hash is visible in your wallet.</li>
              <li>• Collect screenshots, tracking info, and seller communication.</li>
              <li>• Start with evidence submission—DAO arbitrators review within 72 hours.</li>
            </ul>
            <Button variant="outline" onClick={() => window.open('/docs/disputes', '_blank')}>
              View dispute playbook
            </Button>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-white">
              <MessageSquare size={20} />
              <h2 className="text-lg font-semibold">Need live help?</h2>
            </div>
            <p className="text-sm text-white/70">
              Join the LinkDAO arbitration Discord to talk with moderators and watch live hearings on-chain.
            </p>
            <Button variant="primary" onClick={() => window.open('https://discord.gg/linkdao', '_blank')}>
              Open Discord support
            </Button>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-white">
              <BookOpen size={20} />
              <h2 className="text-lg font-semibold">DAO governance</h2>
            </div>
            <p className="text-sm text-white/70">
              Major dispute outcomes flow into DAO proposals. Token holders can review evidence and vote on
              systemic improvements.
            </p>
            <Button variant="outline" onClick={() => router.push('/governance')}>
              View governance portal
            </Button>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-6">
          <DisputeResolutionPanel
            orderId={orderId}
            userRole="buyer"
            className="space-y-6"
          />
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default DisputesSupportPage;
