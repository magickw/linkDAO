import React from 'react';
import Link from 'next/link';
import { EyeIcon } from '@heroicons/react/24/outline';

interface ReturnEvent {
    id: string;
    returnId: string;
    eventType: string;
    timestamp: string;
    actorRole: string;
    automated: boolean;
}

interface RecentReturnsTableProps {
    events: ReturnEvent[];
    isLoading: boolean;
}

export const RecentReturnsTable: React.FC<RecentReturnsTableProps> = ({ events, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-700/50 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <Link
                    href="/admin/returns/list"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                    View All Returns
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900/50 text-gray-200 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Event</th>
                            <th className="px-6 py-3">Return ID</th>
                            <th className="px-6 py-3">Actor</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No recent activity found
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-700/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-white">
                                            {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                        {event.automated && (
                                            <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                                                Auto
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                        {event.returnId.substring(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${event.actorRole === 'system' ? 'bg-purple-900/30 text-purple-400' :
                                                event.actorRole === 'admin' ? 'bg-blue-900/30 text-blue-400' :
                                                    'bg-gray-700 text-gray-300'
                                            }`}>
                                            {event.actorRole}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/returns/${event.returnId}`}
                                            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};