import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Zap, Coins, ArrowUpRight } from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: 'join' | 'post' | 'comment' | 'tip' | 'stake';
  user: string;
  userHandle: string;
  timestamp: Date;
  metadata?: any;
}

interface CommunityActivityPulseProps {
  communityId: string;
  className?: string;
}

export default function CommunityActivityPulse({ communityId, className = '' }: CommunityActivityPulseProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  // Mock initial events
  useEffect(() => {
    const initialEvents: ActivityEvent[] = [
      {
        id: '1',
        type: 'join',
        user: '0x123...456',
        userHandle: 'crypto_enthusiast',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
      },
      {
        id: '2',
        type: 'post',
        user: '0x789...012',
        userHandle: 'dao_voter',
        timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12 mins ago
        metadata: { title: 'New Proposal for Treasury' }
      },
      {
        id: '3',
        type: 'tip',
        user: '0xabc...def',
        userHandle: 'whale_watcher',
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
        metadata: { amount: '50', token: 'LDAO' }
      }
    ];
    setEvents(initialEvents);

    // Simulate incoming live events every 30-60 seconds
    const interval = setInterval(() => {
      const types: Array<ActivityEvent['type']> = ['join', 'post', 'comment', 'tip', 'stake'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const handles = ['alpha_tester', 'web3_builder', 'nft_collector', 'defi_ninja', 'linkdao_fan'];
      const randomHandle = handles[Math.floor(Math.random() * handles.length)];
      
      const newEvent: ActivityEvent = {
        id: Math.random().toString(36).substring(7),
        type: randomType,
        user: '0x' + Math.random().toString(16).substring(2, 8) + '...' + Math.random().toString(16).substring(2, 6),
        userHandle: randomHandle,
        timestamp: new Date(),
        metadata: randomType === 'tip' ? { amount: (Math.random() * 100).toFixed(0), token: 'LDAO' } : undefined
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 4)]);
    }, 45000);

    return () => clearInterval(interval);
  }, [communityId]);

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'join': return <Users size={14} className="text-blue-500" />;
      case 'post': return <MessageCircle size={14} className="text-green-500" />;
      case 'comment': return <MessageCircle size={14} className="text-purple-500" />;
      case 'tip': return <Zap size={14} className="text-yellow-500" />;
      case 'stake': return <Coins size={14} className="text-orange-500" />;
      default: return <ArrowUpRight size={14} className="text-gray-500" />;
    }
  };

  const getEventText = (event: ActivityEvent) => {
    switch (event.type) {
      case 'join': return 'joined the community';
      case 'post': return 'created a new post';
      case 'comment': return 'replied to a discussion';
      case 'tip': return `tipped ${event.metadata?.amount} ${event.metadata?.token}`;
      case 'stake': return 'staked tokens to boost';
      default: return 'performed an action';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wide flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Live Activity
        </h3>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">REAL-TIME</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-start gap-2 text-xs"
            >
              <div className="mt-0.5 p-1 rounded-full bg-gray-50 dark:bg-gray-700/50">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white leading-tight">
                  <span className="font-bold">u/{event.userHandle}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">{getEventText(event)}</span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {events.length === 0 && (
        <p className="text-center text-xs text-gray-500 py-4 italic">
          Watching for activity...
        </p>
      )}
    </div>
  );
}
