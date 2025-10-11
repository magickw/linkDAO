import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface CompactGlobalSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const isWalletAddress = (q: string) => /^0x[a-fA-F0-9]{40}$/.test(q.trim());

export default function CompactGlobalSearch({ placeholder = 'Search by wallet address or posts...', className = '', autoFocus = false }: CompactGlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    const type = isWalletAddress(q) ? 'users' : 'posts';
    router.push(`/search?q=${encodeURIComponent(q)}&type=${type}`);
  };

  return (
    <form onSubmit={onSubmit} className={className} role="search" aria-label="Global search">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 pr-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
          aria-label="Search input"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          aria-label="Submit search"
        >
          Search
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tip: Paste a wallet (0x…) to find a user, or type keywords to find posts.</p>
    </form>
  );
}
