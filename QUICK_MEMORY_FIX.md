# Quick Memory Fix (5 Minutes)

## Disable Unnecessary Services

Edit `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts`

### Lines 710-735: Comment out Admin & Seller WebSockets

**Find this section (around line 719):**
```typescript
  // Initialize Admin WebSocket service
  try {
    const adminWebSocketService = initializeAdminWebSocket(httpServer);
    console.log('✅ Admin WebSocket service initialized');
    console.log(`🔧 Admin real-time dashboard ready`);
  } catch (error) {
    console.warn('⚠️ Admin WebSocket service initialization failed:', error);
  }

  // Initialize Seller WebSocket service
  try {
    const sellerWebSocketService = initializeSellerWebSocket();
    console.log('✅ Seller WebSocket service initialized');
    console.log(`🛒 Seller real-time updates ready`);
  } catch (error) {
    console.warn('⚠️ Seller WebSocket service initialization failed:', error);
  }
```

**Change to:**
```typescript
  // DISABLED: Admin WebSocket service (saves ~30MB)
  // try {
  //   const adminWebSocketService = initializeAdminWebSocket(httpServer);
  //   console.log('✅ Admin WebSocket service initialized');
  //   console.log(`🔧 Admin real-time dashboard ready`);
  // } catch (error) {
  //   console.warn('⚠️ Admin WebSocket service initialization failed:', error);
  // }

  // DISABLED: Seller WebSocket service (saves ~30MB)
  // try {
  //   const sellerWebSocketService = initializeSellerWebSocket();
  //   console.log('✅ Seller WebSocket service initialized');
  //   console.log(`🛒 Seller real-time updates ready`);
  // } catch (error) {
  //   console.warn('⚠️ Seller WebSocket service initialization failed:', error);
  // }
```

**Memory saved:** ~60MB

---

### Lines 690-697: Reduce Monitoring

**Find this section (around line 690):**
```typescript
  // Start comprehensive monitoring
  try {
    comprehensiveMonitoringService.startMonitoring(60000); // Monitor every minute
    console.log('✅ Comprehensive monitoring service started');
    console.log('📊 System health monitoring active');
  } catch (error) {
    console.warn('⚠️ Monitoring service initialization failed:', error);
  }
```

**Change to:**
```typescript
  // DISABLED: Comprehensive monitoring (saves ~50MB)
  // try {
  //   comprehensiveMonitoringService.startMonitoring(60000); // Monitor every minute
  //   console.log('✅ Comprehensive monitoring service started');
  //   console.log('📊 System health monitoring active');
  // } catch (error) {
  //   console.warn('⚠️ Monitoring service initialization failed:', error);
  // }
  console.log('⚠️ Monitoring disabled to save memory');
```

**Memory saved:** ~50MB

---

### Lines 672-682: Skip Cache Warming

**Find this section (around line 672):**
```typescript
  // Trigger initial cache warming
  setTimeout(() => {
    try {
      cacheWarmingService.performQuickWarmup().then(() => {
        console.log('✅ Initial cache warming completed');
      }).catch((error: any) => {
        console.warn('⚠️ Initial cache warming failed:', error);
      });
    } catch (error) {
      console.warn('⚠️ Initial cache warming failed:', error);
    }
  }, 5000); // Wait 5 seconds after server start
```

**Change to:**
```typescript
  // DISABLED: Cache warming (saves ~30MB)
  // setTimeout(() => {
  //   try {
  //     cacheWarmingService.performQuickWarmup().then(() => {
  //       console.log('✅ Initial cache warming completed');
  //     }).catch((error: any) => {
  //       console.warn('⚠️ Initial cache warming failed:', error);
  //     });
  //   } catch (error) {
  //     console.warn('⚠️ Initial cache warming failed:', error);
  //   }
  // }, 5000); // Wait 5 seconds after server start
  console.log('⚠️ Cache warming disabled to save memory');
```

**Memory saved:** ~30MB

---

## Total Memory Saved: ~140MB

**New estimated memory:** ~770MB → ~630MB

Still over 512MB, but much closer! This might be enough with the `--optimize-for-size` flag.

---

## Commit & Test

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO

git add app/backend/src/index.ts
git commit -m "Optimize memory: Disable admin/seller WebSockets and monitoring"
git push origin main
```

Wait for Render to deploy and check if it works!

---

## If This Still Fails

Then you need to **either**:
1. **Fix TypeScript errors & compile** (1 hour work, stays free)
2. **Upgrade Render** ($7/month, 2 minutes)

See `MEMORY_ANALYSIS.md` for full details.
