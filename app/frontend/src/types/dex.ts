export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId?: number;
}

export interface SwapParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: number;
  slippageTolerance?: number; // Percentage (0.5 = 0.5%)
  recipient?: string;
}

export interface SwapRoute {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  pool: string;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  amountOutMinimum: string;
  priceImpact: string;
  gasEstimate: string;
  route: SwapRoute[];
  methodParameters?: {
    to: string;
    calldata: string;
    value: string;
  };
  blockNumber: number;
  timestamp: number;
}

export interface SwapResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
  amountIn: string;
  amountOut: string;
  timestamp: number;
}

export interface LiquidityInfo {
  poolAddress: string;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  fee: number;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCost: string;
  gasCostUSD?: string;
}

export interface SlippageOption {
  value: number;
  label: string;
}

export const DEFAULT_SLIPPAGE_OPTIONS: SlippageOption[] = [
  { value: 0.1, label: '0.1%' },
  { value: 0.5, label: '0.5%' },
  { value: 1, label: '1%' },
  { value: 3, label: '3%' }
];

export const DEFAULT_SLIPPAGE = 0.5;