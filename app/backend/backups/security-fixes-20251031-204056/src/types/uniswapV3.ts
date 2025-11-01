export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId?: number;
}

export interface SwapParams {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: number;
  recipient?: string;
  slippageTolerance?: number; // Percentage (0.5 = 0.5%)
  deadline?: number; // Unix timestamp
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

export interface PriceQuote {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  price: string;
  priceImpact: string;
  timestamp: number;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCost: string;
  gasCostUSD?: string;
}

export interface DEXRoute {
  protocol: string;
  tokenPath: string[];
  poolFees: number[];
  estimatedGas: string;
  priceImpact: string;
}

export interface AlternativeDEX {
  name: string;
  quote: SwapQuote;
  available: boolean;
  reason?: string;
}

export interface IUniswapV3Service {
  getSwapQuote(params: SwapParams): Promise<SwapQuote>;
  executeSwap(params: SwapParams, privateKey: string): Promise<SwapResult>;
  getLiquidityInfo(tokenA: string, tokenB: string, fee?: number): Promise<LiquidityInfo>;
  monitorLiquidityPools(tokenPairs: Array<{ tokenA: string; tokenB: string; fee: number }>): Promise<LiquidityInfo[]>;
  handleSwapFailure(params: SwapParams, error: Error): Promise<SwapQuote[]>;
  getOptimizedGasPrice(): Promise<any>;
  validateAndGetTokenInfo(tokenAddress: string): Promise<{ symbol: string; decimals: number; name: string }>;
}

export interface MultiChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  quoterAddress: string;
  routerAddress: string;
  factoryAddress: string;
  wethAddress: string;
  usdcAddress: string;
  ldaoAddress?: string;
}

export interface CrossChainQuote {
  sourceChain: number;
  targetChain: number;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  bridgeFee: string;
  totalGasCost: string;
  estimatedTime: number; // in seconds
  route: string[];
}

export interface SlippageProtection {
  enabled: boolean;
  maxSlippage: number;
  priceUpdateThreshold: number;
  timeWindow: number; // in seconds
}

export interface MEVProtection {
  enabled: boolean;
  usePrivateMempool: boolean;
  maxPriorityFee: string;
  flashloanProtection: boolean;
}

export interface SwapConfiguration {
  slippageProtection: SlippageProtection;
  mevProtection: MEVProtection;
  gasOptimization: boolean;
  routeOptimization: boolean;
  failureRetry: {
    enabled: boolean;
    maxRetries: number;
    backoffMultiplier: number;
  };
}