/**
 * Circular Progress Timer Component
 * Displays a countdown timer as a circular progress ring
 */

import React, { useState, useEffect } from 'react';

interface CircularProgressTimerProps {
    endTime: Date | string;
    size?: number;
    strokeWidth?: number;
    className?: string;
    showLabel?: boolean;
    colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
}

export const CircularProgressTimer: React.FC<CircularProgressTimerProps> = ({
    endTime,
    size = 80,
    strokeWidth = 8,
    className = '',
    showLabel = true,
    colorScheme = 'blue'
}) => {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [totalTime, setTotalTime] = useState<number>(0);

    useEffect(() => {
        const end = new Date(endTime).getTime();
        const now = Date.now();
        const total = end - now;

        setTotalTime(total);
        setTimeRemaining(total);

        const interval = setInterval(() => {
            const remaining = end - Date.now();
            setTimeRemaining(Math.max(0, remaining));

            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const formatTime = (ms: number): string => {
        if (ms <= 0) return 'Ended';

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const getColorClasses = () => {
        const colors = {
            blue: 'stroke-blue-500',
            green: 'stroke-green-500',
            purple: 'stroke-purple-500',
            orange: 'stroke-orange-500'
        };
        return colors[colorScheme];
    };

    const getTextColor = () => {
        const colors = {
            blue: 'text-blue-600',
            green: 'text-green-600',
            purple: 'text-purple-600',
            orange: 'text-orange-600'
        };
        return colors[colorScheme];
    };

    return (
        <div className={`inline-flex flex-col items-center ${className}`}>
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background circle */}
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${getColorClasses()} transition-all duration-1000 ease-out`}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${getTextColor()}`}>
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>

            {showLabel && (
                <div className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {formatTime(timeRemaining)}
                </div>
            )}
        </div>
    );
};

export default CircularProgressTimer;
