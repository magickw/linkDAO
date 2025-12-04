import React, { useState, useEffect } from 'react';

interface CircularProgressTimerProps {
    endTime: Date;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export const CircularProgressTimer: React.FC<CircularProgressTimerProps> = ({
    endTime,
    size = 48,
    strokeWidth = 3,
    className = ''
}) => {
    const [timeLeft, setTimeLeft] = useState<{
        total: number;
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }>({ total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const total = Date.parse(endTime.toString()) - Date.parse(new Date().toString());
            const seconds = Math.floor((total / 1000) % 60);
            const minutes = Math.floor((total / 1000 / 60) % 60);
            const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
            const days = Math.floor(total / (1000 * 60 * 60 * 24));

            // Calculate progress based on a 7-day standard duration (or adjust as needed)
            // Assuming 7 days max for the visual ring
            const maxDuration = 7 * 24 * 60 * 60 * 1000;
            const currentProgress = Math.max(0, Math.min(100, (total / maxDuration) * 100));

            return {
                total,
                days,
                hours,
                minutes,
                seconds,
                progress: currentProgress
            };
        };

        const timer = setInterval(() => {
            const t = calculateTimeLeft();
            setTimeLeft(t);
            setProgress(t.progress);

            if (t.total <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        // Initial calculation
        const t = calculateTimeLeft();
        setTimeLeft(t);
        setProgress(t.progress);

        return () => clearInterval(timer);
    }, [endTime]);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    // Determine color based on time left
    const getColor = () => {
        if (timeLeft.total <= 0) return 'text-gray-400';
        if (timeLeft.days < 1) return 'text-red-500';
        if (timeLeft.days < 3) return 'text-yellow-500';
        return 'text-green-500';
    };

    if (timeLeft.total <= 0) {
        return (
            <div className={`flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
                <span className="text-xs font-bold text-gray-500">Ended</span>
            </div>
        );
    }

    return (
        <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`${getColor()} transition-all duration-1000 ease-linear`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className={`font-bold leading-none ${getColor()}`} style={{ fontSize: size * 0.3 }}>
                    {timeLeft.days > 0 ? timeLeft.days : timeLeft.hours}
                </span>
                <span className="text-[10px] text-gray-500 leading-none mt-0.5">
                    {timeLeft.days > 0 ? 'days' : 'hrs'}
                </span>
            </div>
        </div>
    );
};
