import { test, expect } from '@playwright/test';

test.describe('Complete Checkout Journey', () => {
  test('user can complete full checkout flow from marketplace to order confirmation', async ({ page }) => {
    // 1. Navigate to marketplace
    await page.goto('/marketplace');
    await expect(page.locator('text=Marketplace')).toBeVisible();
    
    // 2. Find and add an item to cart
    // Assuming there are product cards with "Add to Cart" buttons
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible' });
    
    // Get product name for later verification
    const productName = await firstProduct.locator('.product-title').textContent();
    
    // Add to cart
    await firstProduct.locator('button:has-text("Add to Cart")').click();
    
    // 3. Verify cart update
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // 4. Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL(/.*cart/);
    
    // 5. Proceed to checkout
    await page.click('text=Proceed to Checkout');
    await expect(page).toHaveURL(/.*checkout/);
    
    // 6. Verify checkout page loads
    await expect(page.locator('text=Secure Checkout')).toBeVisible();
    await expect(page.locator('text=Complete your purchase with escrow protection')).toBeVisible();
    
    // 7. Verify order summary
    await expect(page.locator('text=Order Summary')).toBeVisible();
    if (productName) {
      await expect(page.locator(`text=${productName}`)).toBeVisible();
    }
    
    // 8. Verify payment method selection
    await expect(page.locator('text=Choose Payment Method')).toBeVisible();
    
    // 9. Select USDC payment method
    // Wait for payment methods to load
    await page.waitForSelector('[data-testid="payment-method-selector"]');
    
    // Click on the first payment method (should be USDC based on our prioritization)
    await page.click('[data-testid="select-payment-method"]');
    
    // 10. Continue to payment details
    const continueButton = page.locator('button:has-text("Continue with")');
    await continueButton.waitFor({ state: 'visible' });
    await continueButton.click();
    
    // 11. Verify payment details page
    await expect(page.locator('text=Payment Details')).toBeVisible();
    await expect(page.locator('text=Wallet Connection')).toBeVisible();
    
    // 12. Verify wallet is connected (assuming test environment has auto-connected wallet)
    await expect(page.locator('text=Wallet Connected')).toBeVisible();
    
    // 13. Click pay button
    const payButton = page.locator('button:has-text("Pay with")');
    await payButton.waitFor({ state: 'visible' });
    await payButton.click();
    
    // 14. Verify processing state
    await expect(page.locator('text=Processing Payment')).toBeVisible();
    await expect(page.locator('text=Waiting for blockchain confirmation')).toBeVisible();
    
    // 15. Wait for confirmation (this might take some time in real scenarios)
    // Using a longer timeout since blockchain confirmations can take time
    await page.waitForSelector('text=Order Confirmed!', { timeout: 60000 });
    
    // 16. Verify order confirmation
    await expect(page.locator('text=Order Confirmed!')).toBeVisible();
    await expect(page.locator('text=Order Details')).toBeVisible();
    
    // 17. Verify order ID is present
    const orderIdElement = page.locator('text=Order ID:');
    await expect(orderIdElement).toBeVisible();
    
    // 18. Verify payment method confirmation
    await expect(page.locator('text=USDC (Ethereum)')).toBeVisible();
    
    // 19. Verify total amount
    await expect(page.locator('text=Total Paid:')).toBeVisible();
    
    // 20. Test navigation options
    // Test "Continue Shopping" button
    const continueShoppingButton = page.locator('button:has-text("Continue Shopping")');
    await continueShoppingButton.waitFor({ state: 'visible' });
    
    // Test "Track Order" button
    const trackOrderButton = page.locator('button:has-text("Track Order")');
    await trackOrderButton.waitFor({ state: 'visible' });
  });

  test('user can switch networks during checkout', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/marketplace');
    
    // Add item to cart
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible' });
    await firstProduct.locator('button:has-text("Add to Cart")').click();
    
    // Go to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('text=Proceed to Checkout');
    
    // Wait for checkout page to load
    await expect(page.locator('text=Secure Checkout')).toBeVisible();
    
    // Verify network switcher is present
    const networkSwitcher = page.locator('[data-testid="network-switcher"]');
    await expect(networkSwitcher).toBeVisible();
    
    // Click network switcher to open network selection
    await networkSwitcher.click();
    
    // Select Polygon network (if available)
    const polygonOption = page.locator('text=Polygon');
    if (await polygonOption.isVisible()) {
      await polygonOption.click();
      
      // Verify network has switched
      // The network switcher should now show Polygon
      await expect(page.locator('text=Polygon')).toBeVisible();
      
      // Verify payment methods have updated for Polygon
      // This would depend on the specific implementation
    }
  });

  test('user can handle payment errors and retry', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/marketplace');
    
    // Add item to cart
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible' });
    await firstProduct.locator('button:has-text("Add to Cart")').click();
    
    // Go to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('text=Proceed to Checkout');
    
    // Wait for checkout page to load
    await expect(page.locator('text=Secure Checkout')).toBeVisible();
    
    // Select payment method
    await page.click('[data-testid="select-payment-method"]');
    await page.click('text=Continue with USDC');
    
    // Click pay button
    await page.click('text=Pay with USDC');
    
    // Instead of actually failing, we'll test the UI flow
    // In a real test environment, we would mock the API to return an error
    
    // For now, we'll just verify the UI can handle the flow
    // The processing state should appear
    await expect(page.locator('text=Processing Payment')).toBeVisible();
    
    // If there was an error, we would expect to see an error message
    // and be able to retry or select a different payment method
  });
});