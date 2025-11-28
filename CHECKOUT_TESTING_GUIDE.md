# Checkout Flow Browser Testing Guide

## Prerequisites

1. ✅ Backend checkout API implemented
2. ⏳ Stripe keys added to `.env`
3. ⏳ Database migration run
4. ⏳ Backend and frontend servers running

---

## Step 1: Run Database Migration

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend

# Apply checkout schema
psql $DATABASE_URL -f drizzle/0051_checkout_system.sql
```

---

## Step 2: Start Servers

### Terminal 1 - Backend
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend
npm run dev
```

---

## Step 3: Browser Testing Checklist

### 3.1 Add Items to Cart

1. Open browser: `http://localhost:3000/marketplace`
2. Browse products
3. Click "Add to Cart" on any product
4. Verify cart badge updates (top right)

### 3.2 View Cart

1. Click cart icon (top right)
2. Verify items appear
3. Test quantity updates
4. Test item removal
5. Click "Proceed to Checkout"

### 3.3 Checkout Session

1. Verify redirect to `/marketplace/checkout`
2. Check that items are displayed
3. Verify totals calculation:
   - Subtotal
   - Shipping ($5 per item)
   - Tax (8%)
   - Platform fee (2.5%)
   - **Total**

### 3.4 Shipping Address

1. Fill in shipping form:
   ```
   Full Name: John Doe
   Address: 123 Main St
   City: San Francisco
   State: CA
   ZIP: 94102
   Country: US
   Phone: (555) 123-4567
   ```
2. Test validation (try submitting with empty fields)
3. Verify error messages appear

### 3.5 Payment Method Selection

1. Choose payment method:
   - **Fiat (Credit Card)** - Recommended for testing
   - **Crypto (Wallet)** - Requires wallet connection

2. For **Fiat Payment**:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

3. For **Crypto Payment**:
   - Connect wallet (MetaMask, etc.)
   - Approve transaction
   - Wait for confirmation

### 3.6 Review and Submit

1. Review order summary
2. Check discount code (optional):
   - Try: `WELCOME10` (10% off)
   - Try: `SAVE20` (20% off)
   - Try: `FLAT50` ($50 off)
3. Click "Place Order"

### 3.7 Order Confirmation

1. Verify redirect to order tracking page
2. Check order ID is displayed
3. Verify order status shows "Pending"
4. Check cart is now empty

### 3.8 Order Tracking

1. Navigate to `/orders`
2. Verify new order appears in list
3. Click on order to view details
4. Check order timeline
5. Verify payment status

---

## Step 4: API Testing (Browser Console)

Open browser console (F12) and test APIs directly:

### Test 1: Create Session
```javascript
fetch('http://localhost:3001/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{
      productId: 'test-123',
      quantity: 1,
      price: 29.99,
      name: 'Test Product',
      sellerId: '0x123...'
    }]
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Session created:', data);
  return data;
});
```

### Test 2: Validate Address
```javascript
fetch('http://localhost:3001/api/checkout/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shippingAddress: {
      fullName: 'John Doe',
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US'
    }
  })
})
.then(r => r.json())
.then(data => console.log('✅ Validation:', data));
```

### Test 3: Apply Discount
```javascript
fetch('http://localhost:3001/api/checkout/discount', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'test-session',
    code: 'WELCOME10'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Discount:', data));
```

---

## Step 5: Troubleshooting

### Issue: Cart is empty
- **Solution**: Add products from marketplace first

### Issue: Checkout page shows error
- **Check**: Backend is running on port 3001
- **Check**: Frontend API URL is correct
- **Check**: CORS is configured

### Issue: Payment fails
- **Check**: Stripe keys are in `.env`
- **Check**: Using test card numbers
- **Check**: Backend logs for errors

### Issue: Order not created
- **Check**: Database migration was run
- **Check**: `orders` table exists
- **Check**: User is authenticated

### Issue: 401 Unauthorized
- **Solution**: Log in first
- **Check**: JWT token is valid
- **Check**: Auth middleware is working

---

## Expected Results

✅ **Success Indicators**:
1. Cart updates when adding items
2. Checkout page loads with items
3. Totals calculate correctly
4. Validation works (shows errors)
5. Discount codes apply
6. Payment processes (or shows crypto instructions)
7. Order is created
8. Cart clears after checkout
9. Order appears in orders list
10. Order tracking shows details

❌ **Common Errors**:
- 404: Route not found → Check backend is running
- 401: Unauthorized → Log in first
- 400: Validation error → Check form fields
- 500: Server error → Check backend logs

---

## Next Steps After Testing

1. ✅ Verify all steps work
2. 📝 Note any issues
3. 🔧 Fix bugs if found
4. 🚀 Deploy to staging
5. 🧪 Test in staging environment
6. 🎉 Deploy to production

---

## Quick Test Script

Run this in browser console for quick end-to-end test:

```javascript
async function testCheckoutFlow() {
  console.log('🧪 Starting checkout flow test...');
  
  // 1. Create session
  const session = await fetch('http://localhost:3001/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{
        productId: 'test-123',
        quantity: 1,
        price: 29.99,
        name: 'Test Product',
        sellerId: '0x123'
      }]
    })
  }).then(r => r.json());
  
  console.log('✅ Session:', session.data.sessionId);
  
  // 2. Validate address
  const validation = await fetch('http://localhost:3001/api/checkout/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'TC',
        postalCode: '12345',
        country: 'US'
      }
    })
  }).then(r => r.json());
  
  console.log('✅ Validation:', validation.data.valid);
  
  // 3. Apply discount
  const discount = await fetch('http://localhost:3001/api/checkout/discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.data.sessionId,
      code: 'WELCOME10'
    })
  }).then(r => r.json());
  
  console.log('✅ Discount:', discount.data.valid);
  
  console.log('🎉 All API tests passed!');
}

testCheckoutFlow();
```
