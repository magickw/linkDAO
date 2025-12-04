/**
 * Mini Sparkline Component
 * Lightweight sparkline chart for displaying trends
 */

import React from 'react';

interface MiniSparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    fillColor?: string;
    strokeWidth?: number;
    className?: string;
    showArea?: boolean;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
    data,
    width = 100,
    height = 30,
    color = '#3b82f6',
    fillColor = 'rgba(59, 130, 246, 0.1)',
    strokeWidth = 2,
    className = '',
    showArea = true
}) => {
    if (!data || data.length === 0) {
        return null;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Generate SVG path
    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return { x, y };
    });

    const linePath = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ');

    const areaPath = showArea
        ? `${linePath} L ${width} ${height} L 0 ${height} Z`
        : '';

    return (
        <svg
            width={width}
            height={height}
            className={className}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
        >
            {showArea && (
                <path
                    d={areaPath}
                    fill={fillColor}
                    stroke="none"
                />
            )}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default MiniSparkline;
