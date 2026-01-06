/**
 * Gas Estimation Health Check Endpoint
 * Provides service health status and metrics
 */

import { NextResponse } from 'next/server';
import { GasFeeEstimationService } from '@/services/gasFeeEstimationService';

const gasService = new GasFeeEstimationService({
    etherscan: process.env.ETHERSCAN_API_KEY || '',
    alchemy: process.env.ALCHEMY_API_KEY || '',
    infura: process.env.INFURA_API_KEY || ''
});

export async function GET() {
    try {
        const metrics = gasService.getMetrics();
        const cacheStats = gasService.getCacheStats();

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metrics,
            cache: cacheStats,
            apiKeys: {
                etherscan: !!process.env.ETHERSCAN_API_KEY,
                alchemy: !!process.env.ALCHEMY_API_KEY,
                infura: !!process.env.INFURA_API_KEY
            }
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        );
    }
}
