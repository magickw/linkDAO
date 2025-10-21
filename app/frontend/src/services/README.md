# Cost Effectiveness Calculation System

This directory contains the implementation of the cost effectiveness calculation system for payment method prioritization. The system consists of three main services that work together to provide accurate cost estimates and comparisons.

## Services Overview

### 1. Gas Fee Estimation Service (`gasFeeEstimationService.ts`)

**Purpose**: Integrates with multiple gas price APIs and provides real-time gas fee monitoring.

**Key Features**:
- Multi-API integration (Etherscan, Alchemy, Infura)
- Real-time gas price monitoring with caching
- Gas fee threshold validation
- Network conditions assessment
- Fallback mechanisms for API failures

**API Integration**:
- **Etherscan**: Primary source for Ethereum mainnet and Sepolia
- **Alchemy**: Multi-chain support (Ethereum, Polygon, Arbitrum)
- **Infura**: Backup provider for all supported networks

**Caching**: 30-second cache duration for gas estimates to balance accuracy and performance.

### 2. Transaction Cost Calculator (`transactionCostCalculator.ts`)

**Purpose**: Calculates total transaction costs including gas fees, platform fees, and exchange rates.

**Key Features**:
- Comprehensive cost breakdown calculation
- Cost comparison between payment methods
- Confidence scoring for estimates
- Transaction time estimation
- Platform fee integration

**Cost Components**:
- Base transaction amount
- Platform fees (2.5% for crypto, 2.9% + $0.30 for Stripe)
- Gas fees (for crypto transactions)
- Exchange rate fees (when applicable)

### 3. Exchange Rate Service (`exchangeRateService.ts`)

**Purpose**: Provides reliable exchange rate data with caching and fallback mechanisms.

**Key Features**:
- Multi-source exchange rate fetching (CoinGecko, ExchangeRate-API)
- Batch rate fetching for efficiency
- Currency conversion utilities
- Proper currency formatting
- Comprehensive fallback system

**Supported Currencies**:
- **Crypto**: ETH, USDC, USDT, MATIC, BTC
- **Fiat**: USD, EUR, GBP, JPY, CAD, AUD

**Caching**: 1-minute cache for crypto rates, 5-minute cache for fiat rates.

## Integration

### Cost Effectiveness Calculator Integration

The existing `CostEffectivenessCalculator` has been updated to integrate with all three new services:

- **Primary Path**: Uses the new integrated services for accurate calculations
- **Fallback Path**: Maintains legacy calculation methods for reliability
- **Error Handling**: Graceful degradation when services are unavailable

### Service Dependencies

```
CostEffectivenessCalculator
├── TransactionCostCalculator
│   ├── GasFeeEstimationService
│   └── ExchangeRateService
├── GasFeeEstimationService (direct)
└── ExchangeRateService (direct)
```

## Configuration

### Environment Variables

The services support the following environment variables for API keys:

```env
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_key
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_INFURA_API_KEY=your_infura_key
NEXT_PUBLIC_COINMARKETCAP_API_KEY=your_coinmarketcap_key
NEXT_PUBLIC_CRYPTOCOMPARE_API_KEY=your_cryptocompare_key
NEXT_PUBLIC_FIXER_API_KEY=your_fixer_key
```

### Fallback Behavior

When API keys are not provided or APIs are unavailable:

1. **Gas Estimation**: Uses network-specific fallback gas prices
2. **Exchange Rates**: Uses hardcoded fallback rates for common pairs
3. **Network Conditions**: Provides estimated conditions based on historical data

## Usage Examples

### Basic Gas Fee Estimation

```typescript
import { gasFeeEstimationService } from './gasFeeEstimationService';

const gasEstimate = await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
console.log(`Gas fee: $${gasEstimate.totalCostUSD}`);
```

### Transaction Cost Calculation

```typescript
import { transactionCostCalculator } from './transactionCostCalculator';

const costEstimate = await transactionCostCalculator.calculateTransactionCost(
  paymentMethod,
  100, // $100 USD
  'USD'
);
console.log(`Total cost: $${costEstimate.totalCost}`);
```

### Exchange Rate Conversion

```typescript
import { exchangeRateService } from './exchangeRateService';

const conversion = await exchangeRateService.convertCurrency(100, 'USDC', 'USD');
console.log(`100 USDC = $${conversion?.toAmount}`);
```

### Payment Method Comparison

```typescript
import { transactionCostCalculator } from './transactionCostCalculator';

const comparison = await transactionCostCalculator.comparePaymentMethods(
  paymentMethods,
  100 // $100 USD
);

comparison.forEach(result => {
  console.log(`${result.method.name}: $${result.costEstimate.totalCost} ${result.isRecommended ? '(Recommended)' : ''}`);
});
```

## Testing

### Validation Script

Run the validation script to test all services:

```bash
npx tsx src/services/validateCostEffectivenessIntegration.ts
```

### Unit Tests

Individual service tests are available in the `__tests__` directory:

```bash
npm test -- --testPathPattern=costEffectivenessIntegration.test.ts
```

## Performance Considerations

### Caching Strategy

- **Gas Estimates**: 30-second cache to balance accuracy with API rate limits
- **Exchange Rates**: 1-5 minute cache depending on volatility
- **Network Conditions**: Real-time updates with 30-second intervals

### API Rate Limiting

- Multiple API providers to distribute load
- Intelligent fallback to prevent service interruption
- Batch requests where possible to minimize API calls

### Error Handling

- Graceful degradation when APIs are unavailable
- Comprehensive fallback mechanisms
- Detailed error logging for debugging

## Monitoring and Observability

### Cache Statistics

All services provide cache statistics for monitoring:

```typescript
const stats = gasFeeEstimationService.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys.length}`);
```

### Real-time Monitoring

Gas fee estimation service supports real-time monitoring:

```typescript
const stopMonitoring = gasFeeEstimationService.startRealTimeMonitoring(
  1, // chainId
  (conditions) => console.log('Network conditions updated:', conditions),
  30000 // 30 second intervals
);
```

## Future Enhancements

1. **Additional API Providers**: Integration with more gas price and exchange rate APIs
2. **Machine Learning**: Predictive gas fee estimation based on historical patterns
3. **WebSocket Integration**: Real-time updates for better user experience
4. **Advanced Caching**: Redis integration for distributed caching
5. **Metrics Collection**: Detailed analytics on cost estimation accuracy

## Requirements Satisfied

This implementation satisfies the following requirements from the payment method prioritization spec:

- **Requirement 3.2**: Gas fee threshold validation logic ✅
- **Requirement 3.4**: Real-time gas price monitoring and caching ✅
- **Requirement 4.1**: Total transaction cost calculation ✅
- **Requirement 4.2**: Real-time cost updates ✅
- **Requirement 4.4**: Cost comparison and display ✅
- **Requirement 2.4**: Exchange rate integration ✅

The system provides a robust foundation for intelligent payment method prioritization based on real-time cost analysis.