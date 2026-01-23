import { Request, Response } from 'express';
import { UniswapV3Service } from '../services/uniswapV3Service';
import { AppError } from '../middleware/errorHandler';
import { safeLogger } from '../utils/safeLogger';
import { getNetworkConfig } from '../config/networkConfig';

// Initialize services per chain or on demand
// For simplicity, we create a default service instance and re-instantiate if chain differs
// ideally, cache these instances
const uniswapServices: Record<number, UniswapV3Service> = {};

function getUniswapService(chainId: number): UniswapV3Service {
    if (!uniswapServices[chainId]) {
        const config = getNetworkConfig(chainId);
        if (!config) {
            throw new AppError(`Unsupported chain ID: ${chainId}`);
        }
        uniswapServices[chainId] = new UniswapV3Service(config.rpcUrl, chainId);
    }
    return uniswapServices[chainId];
}

export class DexController {

    /**
     * Proxy 1inch Quote API
     */
    async getQuote(req: Request, res: Response) {
        try {
            const {
                tokenInAddress,
                tokenOutAddress,
                amountIn,
                chainId = 1,
                slippageTolerance = 0.5
            } = req.body;

            const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY;

            // 1. Try 1inch
            if (ONEINCH_API_KEY) {
                try {
                    const response = await fetch(
                        `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${tokenInAddress}&dst=${tokenOutAddress}&amount=${amountIn}&slippage=${slippageTolerance}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${ONEINCH_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        return res.json({
                            source: '1inch',
                            quote: {
                                amountOut: data.dstAmount,
                                amountOutMin: data.dstAmount, // 1inch quote might not return min, handled in swap
                                gasEstimate: data.gas,
                                priceImpact: 0, // 1inch quote doesn't always return this explicitly in simple quote
                                route: []
                            }
                        });
                    }
                } catch (e) {
                    safeLogger.warn('1inch quote failed, falling back to Uniswap', e);
                }
            }

            // 2. Fallback to Uniswap
            const service = getUniswapService(Number(chainId));
            const quote = await service.getSwapQuote({
                tokenIn: { address: tokenInAddress, decimals: 18, symbol: 'UNK', name: 'Unknown' }, // Service validates these anyway
                tokenOut: { address: tokenOutAddress, decimals: 18, symbol: 'UNK', name: 'Unknown' },
                amountIn,
                slippageTolerance
            });

            return res.json({
                source: 'uniswap',
                quote
            });

        } catch (error: any) {
            safeLogger.error('DEX Quote Error:', error);
            if (error.message && error.message.includes('Invalid token address')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    /**
     * Build Transaction (Swap)
     */
    async buildTransaction(req: Request, res: Response) {
        try {
            const {
                tokenInAddress,
                tokenOutAddress,
                amountIn,
                recipient,
                slippageTolerance = 0.5,
                chainId = 1
            } = req.body;

            const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY;

            // 1. Try 1inch Swap API
            if (ONEINCH_API_KEY) {
                try {
                    // 1inch swap endpoint returns call data
                    const response = await fetch(
                        `https://api.1inch.dev/swap/v6.0/${chainId}/swap?src=${tokenInAddress}&dst=${tokenOutAddress}&amount=${amountIn}&from=${recipient}&slippage=${slippageTolerance}&disableEstimate=true`,
                        {
                            headers: {
                                'Authorization': `Bearer ${ONEINCH_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        return res.json({
                            source: '1inch',
                            tx: {
                                to: data.tx.to,
                                data: data.tx.data,
                                value: data.tx.value,
                                gas: data.tx.gas
                            }
                        });
                    }
                } catch (e) {
                    safeLogger.warn('1inch swap build failed, falling back to Uniswap', e);
                }
            }

            // 2. Fallback to Uniswap V3
            const service = getUniswapService(Number(chainId));
            const tx = await service.buildSwapTransaction({
                tokenIn: { address: tokenInAddress, decimals: 18, symbol: 'UNK', name: 'Unknown' },
                tokenOut: { address: tokenOutAddress, decimals: 18, symbol: 'UNK', name: 'Unknown' },
                amountIn,
                slippageTolerance,
                recipient
            }, recipient);

            return res.json({
                source: 'uniswap',
                tx
            });

        } catch (error: any) {
            safeLogger.error('DEX Build TX Error:', error);
            if (error.message && error.message.includes('Invalid token address')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    /**
     * Get Popular Tokens (Proxy)
     */
    async getPopularTokens(req: Request, res: Response) {
        try {
            const { chainId = 1 } = req.query;
            // In future: fetch from 1inch token list API or internal DB
            // For now return empty (frontend falls back to defaults)
            res.json({ tokens: [] });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch tokens' });
        }
    }
}
