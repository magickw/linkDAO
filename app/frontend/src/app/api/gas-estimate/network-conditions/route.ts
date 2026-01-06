/**
 * Network Conditions API Endpoint
 * Provides real-time network conditions for a specific chain
 */

import { NextRequest, NextResponse } from 'next/server';
import { GasFeeEstimationService } from '@/services/gasFeeEstimationService';

const gasService = new GasFeeEstimationService({
    etherscan: process.env.ETHERSCAN_API_KEY || '',
    alchemy: process.env.ALCHEMY_API_KEY || '',
    infura: process.env.INFURA_API_KEY || ''
});

/**
 * Serialize BigInt values to strings for JSON
 */
function serializeBigInt(obj: any): any {
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInt);
    }
    if (obj && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
        );
    }
    return obj;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chainId = searchParams.get('chainId');

        if (!chainId) {
            return NextResponse.json(
                { error: 'chainId parameter is required' },
                { status: 400 }
            );
        }

        const chainIdNum = parseInt(chainId, 10);
        if (isNaN(chainIdNum) || chainIdNum < 0) {
            return NextResponse.json(
                { error: 'chainId must be a positive integer' },
                { status: 400 }
            );
        }

        const conditions = await gasService.getNetworkConditions(chainIdNum);
        return NextResponse.json(serializeBigInt(conditions));
    } catch (error) {
        console.error('Network conditions API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to get network conditions',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
