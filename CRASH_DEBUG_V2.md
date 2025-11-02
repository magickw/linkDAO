# Crash Debug V2 - Enhanced Error Capture

## Changes Made

### 1. Direct stdout Writing
Replaced all console.log/console.error with `process.stdout.write()` to bypass structured logging that was swallowing error messages.

### 2. Enhanced Uncaught Exception Handler
```typescript
process.on('uncaughtException', (error) => {
  process.stdout.write('\n========== UNCAUGHT EXCEPTION ==========\n');
  process.stdout.write(`Message: ${error.message}\n`);
  process.stdout.write(`Name: ${error.name}\n`);
  process.stdout.write(`Code: ${(error as any).code || 'N/A'}\n`);
  process.stdout.write(`Stack:\n${error.stack}\n`);
  process.stdout.write('========================================\n\n');
});
```

### 3. Route Import Debugging
Wrapped DEX, Staking, and LDAO monitoring route imports in try-catch blocks with explicit logging:
```typescript
try {
  process.stdout.write('Loading DEX trading routes...\n');
  dexTradingRoutes = require('./routes/dexTradingRoutes').default;
  process.stdout.write('✅ DEX trading routes loaded\n');
} catch (error) {
  process.stdout.write(`❌ Failed to load DEX trading routes: ${error}\n`);
}
```

## What to Look For in Next Deploy

### Expected Output (Success)
```
Loading DEX trading routes...
✅ DEX trading routes loaded
Loading staking routes...
✅ Staking routes loaded
Loading LDAO post-launch monitoring routes...
✅ LDAO post-launch monitoring routes loaded
📝 All routes and middleware registered successfully
📡 Attempting to start server on port 10000...
```

### Expected Output (Failure - Will Show Culprit)
```
Loading DEX trading routes...
❌ Failed to load DEX trading routes: Error: [actual error message]

========== UNCAUGHT EXCEPTION ==========
Message: [actual error message]
Name: Error
Code: N/A
Stack:
[full stack trace showing exact line and file]
========================================
```

## Crash Pattern Analysis

Based on logs, crash happens:
1. After "✅ Database service initialized successfully" (3rd time)
2. Before "📝 All routes and middleware registered successfully"
3. Timing: ~0.3-0.5 seconds after last database init

This indicates:
- Crash is during route file imports (lines 450-750 in index.ts)
- NOT during middleware setup (that's already done)
- NOT during server.listen (that hasn't happened yet)
- Likely a route file has module-level code that throws

## Most Likely Culprits

1. **dexTradingRoutes** - Interacts with Web3/blockchain
2. **stakingRoutes** - Interacts with smart contracts
3. **ldaoPostLaunchMonitoringRoutes** - May have initialization code

These routes likely have:
- Web3 provider initialization at module level
- Smart contract instantiation
- Network calls during import
- Missing environment variables

## Next Steps

1. Deploy this version
2. Check logs for which route fails to load
3. Once identified, we can:
   - Add lazy loading for that route
   - Move initialization code out of module scope
   - Add proper error handling
   - Make it optional if env vars missing
