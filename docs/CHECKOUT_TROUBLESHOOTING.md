# Checkout System Troubleshooting Guide

## Table of Contents
1. [Common Issues](#common-issues)
2. [Payment Failures](#payment-failures)
3. [Session Errors](#session-errors)
4. [Address Validation](#address-validation)
5. [Discount Code Issues](#discount-code-issues)
6. [Network Problems](#network-problems)
7. [Security and Rate Limiting](#security-and-rate-limiting)
8. [Performance Issues](#performance-issues)
9. [Debugging Tools](#debugging-tools)
10. [Error Codes Reference](#error-codes-reference)

---

## Common Issues

### Issue: "Cart is empty" error at checkout
**Symptoms:** User clicks checkout but receives "Cart is empty" message

**Causes:**
- Cart items expired or became unavailable
- Session timeout cleared cart
- Browser storage cleared
- User in different browser/device

**Solutions:**
1. Check browser localStorage for `linkdao_cart` key
2. Verify cart items still exist in database
3. Check if items are still active/available
4. Ensure user is authenticated

**Prevention:**
- Implement cart persistence across sessions
- Add expiration warnings before items expire
- Sync cart state with backend regularly

---

### Issue: Checkout stuck on loading
**Symptoms:** Spinner shows indefinitely, checkout doesn't progress

**Causes:**
- Network timeout
- Backend service unavailable
- Session expired
- Rate limit exceeded
- JavaScript error in frontend

**Solutions:**
1. Check browser console for errors:
   ```javascript
   // Open DevTools Console (F12)
   // Look for red error messages
   ```

2. Check Network tab for failed requests:
   - 504 Gateway Timeout → Backend issue
   - 429 Too Many Requests → Rate limited
   - 401 Unauthorized → Session expired

3. Check Redis session service:
   ```bash
   redis-cli ping
   redis-cli keys "checkout:session:*"
   ```

4. Verify backend health:
   ```bash
   curl http://localhost:10000/health
   ```

**Prevention:**
- Implement timeout handling (5-10 seconds)
- Show timeout error messages
- Add retry logic with exponential backoff
- Monitor backend health

---

### Issue: Payment processing hangs
**Symptoms:** Payment button clicked, but nothing happens

**Causes:**
- Payment gateway timeout
- Network interruption
- Invalid payment details
- Circuit breaker open

**Solutions:**
1. Check payment gateway status:
   - Stripe Status: https://status.stripe.com
   - Check blockchain network status

2. Verify payment timeout settings:
   ```typescript
   // app/backend/src/utils/paymentTimeout.ts
   const PAYMENT_TIMEOUT = 30000; // 30 seconds
   ```

3. Check circuit breaker state:
   ```typescript
   const breaker = new CircuitBreaker(5, 60000);
   console.log(breaker.getState()); // 'closed', 'open', or 'half-open'
   ```

4. Review logs for payment errors:
   ```bash
   grep "Payment.*failed" logs/checkout.log
   ```

**Prevention:**
- Implement robust timeout handling
- Add fallback payment methods
- Show clear error messages
- Allow users to retry

---

## Payment Failures

### Crypto Payment Failures

#### Error: "Insufficient funds"
**Cause:** User's wallet doesn't have enough tokens

**Solutions:**
1. Check wallet balance:
   ```javascript
   const balance = await publicClient.getBalance({ address: userAddress });
   console.log('Balance:', balance);
   ```

2. Verify gas estimation:
   ```javascript
   const gasEstimate = await contract.estimateGas.createEscrow();
   const gasCost = gasEstimate * gasPrice;
   console.log('Gas cost:', gasCost);
   ```

3. Suggest lower amount or different token

**User Message:**
"Your wallet doesn't have enough funds to complete this transaction. Please add funds or try a different payment method."

---

#### Error: "Transaction rejected"
**Cause:** User declined transaction in wallet, or wallet error

**Solutions:**
1. Check wallet connection
2. Verify network (mainnet vs testnet)
3. Check gas price isn't too high
4. Ensure wallet has correct permissions

**User Message:**
"Transaction was rejected. Please try again or contact support if the issue persists."

---

#### Error: "Wrong network"
**Cause:** User on different blockchain network

**Solutions:**
1. Detect current network:
   ```javascript
   const chainId = await walletClient.getChainId();
   ```

2. Prompt network switch:
   ```javascript
   await switchChain({ chainId: requiredChainId });
   ```

**User Message:**
"Please switch to [Network Name] to complete this purchase."

---

### Fiat Payment Failures

#### Error: "Card declined"
**Cause:** Bank declined the transaction

**Common Reasons:**
- Insufficient funds
- Card expired
- Incorrect CVV
- International transaction blocked
- Fraud prevention triggered

**Solutions:**
1. Suggest trying different card
2. Contact bank to authorize transaction
3. Try lower amount
4. Use different payment method

**User Message:**
"Your card was declined. Please try a different card or contact your bank."

---

#### Error: "3D Secure authentication failed"
**Cause:** 3DS verification incomplete or failed

**Solutions:**
1. Ensure popup blockers aren't blocking 3DS window
2. Complete authentication in bank's app
3. Try different card without 3DS requirement

**User Message:**
"Card verification failed. Please complete the verification or try a different card."

---

#### Error: "Stripe API error"
**Cause:** Communication with Stripe failed

**Solutions:**
1. Check Stripe API keys:
   ```bash
   echo $STRIPE_SECRET_KEY | head -c 10
   ```

2. Verify webhook secret:
   ```bash
   stripe listen --forward-to localhost:10000/api/webhooks/stripe
   ```

3. Check Stripe dashboard for API errors

**User Message:**
"Payment processing is temporarily unavailable. Please try again in a few moments."

---

## Session Errors

### Error: "Session expired"
**Cause:** Checkout session older than 30 minutes

**Solutions:**
1. Create new session
2. Restore cart from localStorage
3. Re-populate form fields from localStorage

**Check session TTL:**
```bash
redis-cli TTL checkout:session:SESSION_ID
```

**Extend session:**
```typescript
await redisSessionService.extendSession(sessionId, 1800); // 30 more minutes
```

**User Message:**
"Your session has expired. Please start checkout again."

---

### Error: "Session not found"
**Cause:** Session deleted or never created

**Solutions:**
1. Check if session was created:
   ```bash
   redis-cli GET checkout:session:SESSION_ID
   ```

2. Verify session creation in logs
3. Create new session

**User Message:**
"Unable to find your checkout session. Please start over."

---

### Error: "Redis connection failed"
**Cause:** Redis server down or unreachable

**Solutions:**
1. Check Redis status:
   ```bash
   systemctl status redis
   redis-cli ping
   ```

2. Verify connection string:
   ```bash
   echo $REDIS_URL
   ```

3. Restart Redis:
   ```bash
   systemctl restart redis
   ```

4. Fallback to in-memory sessions (temporary):
   ```typescript
   // Will automatically fallback in checkoutRateLimiter.ts
   ```

**User Message:**
"Checkout service is temporarily unavailable. Please try again."

---

## Address Validation

### Error: "Invalid postal code"
**Cause:** Postal code format doesn't match country

**Country Formats:**
- US: 12345 or 12345-6789
- Canada: A1A 1A1
- UK: SW1A 2AA
- Germany: 12345
- Japan: 123-4567

**Solutions:**
1. Validate format client-side:
   ```typescript
   const isValidUSZip = /^\d{5}(-\d{4})?$/.test(zipCode);
   ```

2. Show format examples in UI
3. Allow override for edge cases

**User Message:**
"Please enter a valid postal code for [Country]. Example: [Format]"

---

### Error: "Address verification failed"
**Cause:** Google Maps API couldn't verify address

**Solutions:**
1. Check Google Maps API key:
   ```bash
   echo $GOOGLE_MAPS_API_KEY | head -c 10
   ```

2. Verify API quotas not exceeded
3. Allow manual override
4. Suggest address corrections

**User Message:**
"We couldn't verify this address. Please double-check or contact support."

---

### Error: "Address too long"
**Cause:** Address field exceeds maximum length

**Limits:**
- Address Line 1: 100 characters
- Address Line 2: 100 characters
- City: 50 characters
- State: 50 characters

**User Message:**
"[Field] is too long. Please use abbreviations or shorten."

---

## Discount Code Issues

### Error: "Invalid discount code"
**Cause:** Code doesn't exist or is inactive

**Solutions:**
1. Check code in database:
   ```sql
   SELECT * FROM discount_codes WHERE code = 'CODE123';
   ```

2. Verify code is active:
   ```sql
   SELECT is_active FROM discount_codes WHERE code = 'CODE123';
   ```

**User Message:**
"This discount code is invalid. Please check and try again."

---

### Error: "Discount code expired"
**Cause:** Current date outside code's valid date range

**Solutions:**
1. Check expiration:
   ```sql
   SELECT start_date, end_date FROM discount_codes WHERE code = 'CODE123';
   ```

2. Suggest similar active codes

**User Message:**
"This discount code has expired. Check your email for active offers."

---

### Error: "Usage limit reached"
**Cause:** Code used maximum number of times

**Solutions:**
1. Check usage count:
   ```sql
   SELECT usage_count, usage_limit FROM discount_codes WHERE code = 'CODE123';
   ```

2. Increase limit if appropriate

**User Message:**
"This discount code has reached its usage limit."

---

### Error: "Minimum purchase not met"
**Cause:** Cart total below code's minimum requirement

**Solutions:**
1. Show required amount:
   ```typescript
   const remaining = minPurchase - currentTotal;
   console.log('Add $', remaining, 'to use this code');
   ```

**User Message:**
"Add $[amount] to your cart to use this discount code."

---

## Network Problems

### Error: "Network request failed"
**Cause:** No internet connection or network issue

**Solutions:**
1. Check connectivity:
   ```javascript
   console.log('Online:', navigator.onLine);
   ```

2. Show offline indicator
3. Queue failed requests with OfflineManager
4. Retry when connection restored

**User Message:**
"You appear to be offline. Please check your connection."

---

### Error: "Request timeout"
**Cause:** Server didn't respond in time

**Solutions:**
1. Check timeout settings:
   ```typescript
   const TIMEOUT = 30000; // 30 seconds
   ```

2. Retry with exponential backoff:
   ```typescript
   await withRetry(operation, {
     maxRetries: 3,
     initialDelay: 1000
   });
   ```

3. Increase timeout for slow operations

**User Message:**
"Request timed out. Please try again."

---

### Error: "502 Bad Gateway"
**Cause:** Backend server error or restart

**Solutions:**
1. Check backend logs
2. Verify all services running
3. Check load balancer health
4. Restart backend if needed

**User Message:**
"Our servers are experiencing issues. Please try again in a moment."

---

## Security and Rate Limiting

### Error: "Too many requests"
**Cause:** Rate limit exceeded

**Rate Limits:**
- Standard operations: 20/15min
- Session creation: 10/15min
- Payment processing: 5/15min
- Discount validation: 30/15min

**Solutions:**
1. Check rate limit headers:
   ```
   X-RateLimit-Limit: 20
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 2024-01-01T12:30:00Z
   ```

2. Wait until reset time
3. Implement client-side throttling

**User Message:**
"Too many attempts. Please wait [time] before trying again."

---

### Error: "Invalid CSRF token"
**Cause:** CSRF token missing or incorrect

**Solutions:**
1. Get fresh CSRF token:
   ```javascript
   const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
   ```

2. Include in requests:
   ```javascript
   headers: {
     'X-CSRF-Token': csrfToken
   }
   ```

3. Refresh page if token expired

**User Message:**
"Security token expired. Please refresh the page."

---

### Error: "Unauthorized"
**Cause:** User not authenticated or session expired

**Solutions:**
1. Check auth token:
   ```javascript
   const token = localStorage.getItem('linkdao_access_token');
   ```

2. Refresh token if possible
3. Redirect to login

**User Message:**
"Your session has expired. Please log in again."

---

## Performance Issues

### Slow checkout page load
**Causes:**
- Large cart with many items
- Slow API responses
- Unoptimized images
- Too many re-renders

**Solutions:**
1. Implement lazy loading
2. Optimize images
3. Use React.memo for components
4. Reduce API calls
5. Enable caching

**Monitoring:**
```javascript
// Add performance marks
performance.mark('checkout-start');
// ... checkout code
performance.mark('checkout-end');
performance.measure('checkout', 'checkout-start', 'checkout-end');
```

---

### Slow tax calculation
**Causes:**
- Tax service API slow
- No caching
- Too many items

**Solutions:**
1. Implement caching:
   ```typescript
   const cacheKey = `tax:${address.zipCode}:${subtotal}`;
   ```

2. Use debouncing:
   ```typescript
   const debouncedTaxCalc = useDebounce(calculateTax, 500);
   ```

3. Batch calculations

---

### Session retrieval slow
**Causes:**
- Redis latency
- Network issues
- Too much data in session

**Solutions:**
1. Check Redis latency:
   ```bash
   redis-cli --latency
   ```

2. Optimize session data structure
3. Use Redis pipelining
4. Enable Redis persistence

---

## Debugging Tools

### Enable Debug Logging
```javascript
// Client-side
localStorage.setItem('DEBUG_CHECKOUT', 'true');

// Server-side
LOG_LEVEL=debug npm start
```

### Monitor Redis Sessions
```bash
# List all checkout sessions
redis-cli KEYS "checkout:session:*"

# Get session details
redis-cli GET checkout:session:SESSION_ID

# Monitor real-time commands
redis-cli MONITOR
```

### Check Rate Limits
```bash
# Check rate limit for user
redis-cli GET ratelimit:user-123

# Check all rate limits
redis-cli KEYS "ratelimit:*"
```

### Stripe Testing
```bash
# Use test cards
4242 4242 4242 4242 - Success
4000 0000 0000 9995 - Declined

# Listen to webhooks
stripe listen --forward-to localhost:10000/api/webhooks/stripe
```

### Database Queries
```sql
-- Check recent checkouts
SELECT * FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check discount code usage
SELECT code, usage_count, usage_limit
FROM discount_codes
WHERE is_active = true;

-- Check failed payments
SELECT * FROM payments
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Error Codes Reference

### Backend Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INVALID_CODE` | Discount code doesn't exist | Verify code spelling |
| `EXPIRED` | Discount code expired | Use different code |
| `NOT_STARTED` | Discount code not yet valid | Wait for start date |
| `USAGE_LIMIT_REACHED` | Code used maximum times | Use different code |
| `USER_LIMIT_REACHED` | User used code max times | Use different code |
| `MIN_PURCHASE_NOT_MET` | Cart total too low | Add more items |
| `NOT_APPLICABLE_TO_ITEMS` | Code doesn't apply to cart | Check restrictions |
| `INACTIVE` | Code deactivated | Use different code |
| `INSUFFICIENT_FUNDS` | Not enough crypto | Add funds |
| `CARD_DECLINED` | Card payment declined | Try different card |
| `NETWORK_ERROR` | Connection failed | Check internet |
| `TIMEOUT` | Request took too long | Retry |
| `INVALID_ADDRESS` | Address validation failed | Check address |
| `SESSION_EXPIRED` | Checkout session expired | Start over |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Log in |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource exists |
| 429 | Too Many Requests | Wait and retry |
| 500 | Internal Server Error | Contact support |
| 502 | Bad Gateway | Wait for servers |
| 503 | Service Unavailable | Try again later |
| 504 | Gateway Timeout | Retry request |

---

## Getting Help

### Check System Status
- Backend Health: `GET /api/health`
- Redis Status: `redis-cli ping`
- Database: `pg_isready`

### Log Locations
- Backend: `/var/log/linkdao/backend.log`
- Checkout: `/var/log/linkdao/checkout.log`
- Payment: `/var/log/linkdao/payment.log`
- Nginx: `/var/log/nginx/access.log`

### Support Channels
- GitHub Issues: https://github.com/linkdao/issues
- Discord: #checkout-support
- Email: support@linkdao.com

### Escalation
For critical production issues:
1. Check #incidents channel
2. Page on-call engineer
3. Create incident ticket
4. Follow runbook

---

## Appendix

### Useful Commands

```bash
# Restart checkout services
systemctl restart linkdao-backend
systemctl restart redis

# Clear Redis sessions
redis-cli FLUSHDB

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor logs
tail -f /var/log/linkdao/checkout.log | grep ERROR

# Test endpoint
curl -X POST http://localhost:10000/api/checkout/session \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[]}'
```

### Emergency Procedures

**Complete Checkout Failure:**
1. Check all services running
2. Review recent deployments
3. Check error rates in monitoring
4. Rollback if needed
5. Enable maintenance mode

**Payment Gateway Down:**
1. Check gateway status page
2. Enable fallback payment method
3. Queue failed payments for retry
4. Notify users of delays

**Database Issues:**
1. Check connection pool
2. Verify credentials
3. Check disk space
4. Restart if needed
5. Restore from backup if corrupted
