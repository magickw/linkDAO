/**
 * Floating Action Button Component
 * Expandable FAB for quick actions (Create Post, Create Proposal, Stake Tokens)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Vote, Coins, X } from 'lucide-react';
import { useRouter } from 'next/router';

interface FloatingActionButtonProps {
    onCreatePost?: () => void;
    onCreateProposal?: () => void;
    onStakeTokens?: () => void;
    className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    onCreatePost,
    onCreateProposal,
    onStakeTokens,
    className = ''
}) => {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Handle scroll behavior - hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                setIsVisible(false);
                setIsExpanded(false);
            } else {
                // Scrolling up
                setIsVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isExpanded]);

    const handleCreatePost = () => {
        setIsExpanded(false);
        if (onCreatePost) {
            onCreatePost();
        } else {
            router.push('/create-post');
        }
    };

    const handleCreateProposal = () => {
        setIsExpanded(false);
        if (onCreateProposal) {
            onCreateProposal();
        } else {
            router.push('/governance/create-proposal');
        }
    };

    const handleStakeTokens = () => {
        setIsExpanded(false);
        if (onStakeTokens) {
            onStakeTokens();
        } else {
            router.push('/wallet?tab=stake');
        }
    };

    const actions = [
        {
            id: 'post',
            label: 'Create Post',
            icon: <Edit className="w-5 h-5" />,
            color: 'bg-blue-600 hover:bg-blue-700',
            onClick: handleCreatePost
        },
        {
            id: 'proposal',
            label: 'Create Proposal',
            icon: <Vote className="w-5 h-5" />,
            color: 'bg-purple-600 hover:bg-purple-700',
            onClick: handleCreateProposal
        },
        {
            id: 'stake',
            label: 'Stake Tokens',
            icon: <Coins className="w-5 h-5" />,
            color: 'bg-green-600 hover:bg-green-700',
            onClick: handleStakeTokens
        }
    ];

    return (
        <>
            {/* Backdrop */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            {/* FAB Container */}
            <div
                className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
                    } ${className}`}
            >
                {/* Action Buttons */}
                <div className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}>
                    {actions.map((action, index) => (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            className={`flex items-center gap-3 ${action.color} text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl group`}
                            style={{
                                transitionDelay: isExpanded ? `${index * 50}ms` : '0ms'
                            }}
                        >
                            <div className="flex items-center gap-3 px-4 py-3">
                                <span className="font-medium whitespace-nowrap">{action.label}</span>
                                {action.icon}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main FAB Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${isExpanded
                            ? 'bg-red-600 hover:bg-red-700 rotate-45'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        } text-white hover:shadow-xl`}
                    aria-label={isExpanded ? 'Close menu' : 'Open quick actions menu'}
                >
                    {isExpanded ? (
                        <X className="w-6 h-6" />
                    ) : (
                        <Plus className="w-6 h-6" />
                    )}
                </button>

                {/* Tooltip */}
                {!isExpanded && (
                    <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
                            Quick Actions
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default FloatingActionButton;
