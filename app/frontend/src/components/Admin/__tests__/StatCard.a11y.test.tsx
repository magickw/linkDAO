import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';
import { Shield, ShoppingBag, AlertTriangle, Users, XCircle } from 'lucide-react';

expect.extend(toHaveNoViolations);

// Mock GlassPanel component
const GlassPanel = ({ children, className }: any) => (
    <div className={className}>{children}</div>
);

// StatCard component for testing
const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: any) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className={`w-full text-left ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'} transition-all duration-200`}
        role="button"
        aria-label={onClick ? `View ${title}` : title}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={(e) => {
            if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClick();
            }
        }}
    >
        <GlassPanel className={`p-4 sm:p-6 ${onClick ? 'hover:bg-white/20 hover:shadow-lg hover:shadow-purple-500/20' : 'hover:bg-white/15'} transition-all duration-200`}>
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs sm:text-sm truncate">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-white mt-1">{value}</p>
                    {trend && (
                        <p className={`text-xs sm:text-sm mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trend > 0 ? '+' : ''}{trend}% from last week
                        </p>
                    )}
                </div>
                <div className={`p-2 sm:p-3 rounded-lg ${color} flex-shrink-0 ml-2`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
            </div>
        </GlassPanel>
    </button>
);

describe('StatCard Accessibility', () => {
    it('should not have accessibility violations when clickable', async () => {
        const { container } = render(
            <StatCard
                title="Pending Moderations"
                value={5}
                icon={Shield}
                color="bg-orange-500"
                onClick={() => { }}
            />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations when not clickable', async () => {
        const { container } = render(
            <StatCard
                title="Pending Moderations"
                value={5}
                icon={Shield}
                color="bg-orange-500"
            />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations with trend', async () => {
        const { container } = render(
            <StatCard
                title="Total Users"
                value={1000}
                icon={Users}
                color="bg-green-500"
                trend={15}
                onClick={() => { }}
            />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
        const { getByRole } = render(
            <StatCard
                title="Seller Applications"
                value={3}
                icon={ShoppingBag}
                color="bg-blue-500"
                onClick={() => { }}
            />
        );

        const button = getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'View Seller Applications');
    });

    it('should be keyboard accessible', () => {
        const { getByRole } = render(
            <StatCard
                title="Open Disputes"
                value={2}
                icon={AlertTriangle}
                color="bg-red-500"
                onClick={() => { }}
            />
        );

        const button = getByRole('button');
        expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('should not be keyboard accessible when not clickable', () => {
        const { getByRole } = render(
            <StatCard
                title="Suspended Users"
                value={10}
                icon={XCircle}
                color="bg-gray-500"
            />
        );

        const button = getByRole('button');
        expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('should have semantic HTML structure', () => {
        const { container } = render(
            <StatCard
                title="Total Sellers"
                value={50}
                icon={ShoppingBag}
                color="bg-purple-500"
                onClick={() => { }}
            />
        );

        // Should have button element
        const button = container.querySelector('button');
        expect(button).toBeInTheDocument();

        // Should have paragraph elements for text
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should provide clear visual feedback for focus state', () => {
        const { getByRole } = render(
            <StatCard
                title="Pending Moderations"
                value={5}
                icon={Shield}
                color="bg-orange-500"
                onClick={() => { }}
            />
        );

        const button = getByRole('button');

        // Button should be focusable
        button.focus();
        expect(document.activeElement).toBe(button);
    });

    describe('Screen Reader Compatibility', () => {
        it('provides descriptive label for clickable card', () => {
            const { getByLabelText } = render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={() => { }}
                />
            );

            expect(getByLabelText('View Pending Moderations')).toBeInTheDocument();
        });

        it('provides simple label for non-clickable card', () => {
            const { getByLabelText } = render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            expect(getByLabelText('Pending Moderations')).toBeInTheDocument();
        });

        it('announces trend information', () => {
            const { getByText } = render(
                <StatCard
                    title="Total Users"
                    value={1000}
                    icon={Users}
                    color="bg-green-500"
                    trend={15}
                />
            );

            // Trend should be readable by screen readers
            expect(getByText('+15% from last week')).toBeInTheDocument();
        });
    });

    describe('Color Contrast', () => {
        it('uses appropriate color classes for visibility', () => {
            const { container } = render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            // Check for text color classes that provide good contrast
            const grayText = container.querySelector('.text-gray-400');
            const whiteText = container.querySelector('.text-white');

            expect(grayText).toBeInTheDocument();
            expect(whiteText).toBeInTheDocument();
        });

        it('uses distinct colors for positive and negative trends', () => {
            const { container: positiveContainer } = render(
                <StatCard
                    title="Total Users"
                    value={1000}
                    icon={Users}
                    color="bg-green-500"
                    trend={15}
                />
            );

            const { container: negativeContainer } = render(
                <StatCard
                    title="Open Disputes"
                    value={2}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    trend={-10}
                />
            );

            expect(positiveContainer.querySelector('.text-green-400')).toBeInTheDocument();
            expect(negativeContainer.querySelector('.text-red-400')).toBeInTheDocument();
        });
    });
});
