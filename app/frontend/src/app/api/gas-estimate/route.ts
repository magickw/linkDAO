/**
 * Gas Estimation API Route
 * Server-side endpoint to protect API keys from client exposure
 */

import { NextRequest, NextResponse } from 'next/server';
import { GasFeeEstimationService } from '@/services/gasFeeEstimationService';

// Initialize service with server-side API keys (no NEXT_PUBLIC_ prefix)
const gasService = new GasFeeEstimationService({
    etherscan: process.env.ETHERSCAN_API_KEY || '',
    alchemy: process.env.ALCHEMY_API_KEY || '',
    infura: process.env.INFURA_API_KEY || ''
});

// Valid transaction types
const VALID_TRANSACTION_TYPES = [
    'erc20Transfer',
    'ethTransfer',
    'uniswapSwap',
    'contractInteraction',
    'complexContract'
] as const;

/**
 * Validate chainId parameter
 */
function validateChainId(chainId: string | null): number {
    if (!chainId) {
        throw new Error('chainId parameter is required');
    }

    const parsed = parseInt(chainId, 10);
    if (isNaN(parsed) || parsed < 0) {
        throw new Error('chainId must be a positive integer');
    }

    return parsed;
}

/**
 * Validate transaction type parameter
 */
function validateTransactionType(type: string | null): typeof VALID_TRANSACTION_TYPES[number] {
    const typeToValidate = type || 'erc20Transfer';

    if (!VALID_TRANSACTION_TYPES.includes(typeToValidate as any)) {
        throw new Error(`Invalid transaction type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    }

    return typeToValidate as typeof VALID_TRANSACTION_TYPES[number];
}

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

        // Validate inputs
        const chainId = validateChainId(searchParams.get('chainId'));
        const transactionType = validateTransactionType(searchParams.get('transactionType'));
        const customGasLimitStr = searchParams.get('customGasLimit');
        const customGasLimit = customGasLimitStr ? BigInt(customGasLimitStr) : undefined;

        const estimate = await gasService.getGasEstimate(
            chainId,
            transactionType,
            customGasLimit
        );

        // Use helper to serialize BigInts
        return NextResponse.json(serializeBigInt(estimate));
    } catch (error) {
        console.error('Gas estimation API error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
        });

        const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;

        return NextResponse.json(
            {
                error: 'Failed to estimate gas fees',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: statusCode }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chainId, transactionType, customGasLimit } = body;

        // Validate inputs
        const validatedChainId = validateChainId(chainId?.toString());
        const validatedType = validateTransactionType(transactionType);
        const validatedGasLimit = customGasLimit ? BigInt(customGasLimit) : undefined;

        const estimate = await gasService.getGasEstimate(
            validatedChainId,
            validatedType,
            validatedGasLimit
        );

        return NextResponse.json(serializeBigInt(estimate));
    } catch (error) {
        console.error('Gas estimation API error:', error);

        const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;

        return NextResponse.json(
            {
                error: 'Failed to estimate gas fees',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: statusCode }
        );
    }
}
