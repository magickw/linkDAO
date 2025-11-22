import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Shield, ShoppingBag, AlertTriangle, Users, XCircle } from 'lucide-react';

// Mock GlassPanel component
vi.mock('@/design-system', () => ({
    GlassPanel: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    ),
}));

// StatCard component extracted for testing
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
        <div className={`p-4 sm:p-6 ${onClick ? 'hover:bg-white/20 hover:shadow-lg hover:shadow-purple-500/20' : 'hover:bg-white/15'} transition-all duration-200`}>
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
        </div>
    </button>
);

describe('StatCard Component', () => {
    describe('Rendering', () => {
        it('renders title and value correctly', () => {
            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            expect(screen.getByText('Pending Moderations')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('renders trend when provided', () => {
            render(
                <StatCard
                    title="Total Users"
                    value={1000}
                    icon={Users}
                    color="bg-green-500"
                    trend={15}
                />
            );

            expect(screen.getByText('+15% from last week')).toBeInTheDocument();
        });

        it('renders negative trend correctly', () => {
            render(
                <StatCard
                    title="Open Disputes"
                    value={2}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    trend={-10}
                />
            );

            expect(screen.getByText('-10% from last week')).toBeInTheDocument();
        });

        it('does not render trend when not provided', () => {
            render(
                <StatCard
                    title="Seller Applications"
                    value={3}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                />
            );

            expect(screen.queryByText(/from last week/)).not.toBeInTheDocument();
        });
    });

    describe('Click Functionality', () => {
        it('calls onClick handler when clicked', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('does not call onClick when not provided', () => {
            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            const button = screen.getByRole('button');
            fireEvent.click(button);

            // Should not throw error
            expect(button).toBeDisabled();
        });

        it('is disabled when onClick is not provided', () => {
            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });

        it('is not disabled when onClick is provided', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            expect(button).not.toBeDisabled();
        });
    });

    describe('Keyboard Navigation', () => {
        it('calls onClick when Enter key is pressed', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('calls onClick when Space key is pressed', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Seller Applications"
                    value={3}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            fireEvent.keyDown(button, { key: ' ', code: 'Space' });

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('does not call onClick for other keys', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Open Disputes"
                    value={2}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            fireEvent.keyDown(button, { key: 'a', code: 'KeyA' });

            expect(handleClick).not.toHaveBeenCalled();
        });

        it('does not call onClick on keyboard when onClick is not provided', () => {
            render(
                <StatCard
                    title="Suspended Users"
                    value={10}
                    icon={XCircle}
                    color="bg-gray-500"
                />
            );

            const button = screen.getByRole('button');
            fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

            // Should not throw error
            expect(button).toBeDisabled();
        });
    });

    describe('Accessibility', () => {
        it('has correct aria-label when onClick is provided', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'View Pending Moderations');
        });

        it('has correct aria-label when onClick is not provided', () => {
            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'Pending Moderations');
        });

        it('has tabIndex 0 when clickable', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Total Users"
                    value={1000}
                    icon={Users}
                    color="bg-green-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('tabIndex', '0');
        });

        it('has tabIndex -1 when not clickable', () => {
            render(
                <StatCard
                    title="Total Users"
                    value={1000}
                    icon={Users}
                    color="bg-green-500"
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('tabIndex', '-1');
        });

        it('has role="button"', () => {
            render(
                <StatCard
                    title="Seller Applications"
                    value={3}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                />
            );

            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('CSS Classes', () => {
        it('has cursor-pointer class when onClick is provided', () => {
            const handleClick = vi.fn();

            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                    onClick={handleClick}
                />
            );

            const button = screen.getByRole('button');
            expect(button.className).toContain('cursor-pointer');
        });

        it('has cursor-default class when onClick is not provided', () => {
            render(
                <StatCard
                    title="Pending Moderations"
                    value={5}
                    icon={Shield}
                    color="bg-orange-500"
                />
            );

            const button = screen.getByRole('button');
            expect(button.className).toContain('cursor-default');
        });

        it('applies correct color class to icon container', () => {
            const { container } = render(
                <StatCard
                    title="Open Disputes"
                    value={2}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
            );

            const iconContainer = container.querySelector('.bg-red-500');
            expect(iconContainer).toBeInTheDocument();
        });
    });
});
