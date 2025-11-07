// Test script to verify cart endpoints are working correctly

async function testCartEndpoints() {
  console.log('Testing cart endpoints...\n');
  
  // Test 1: GET /api/cart without auth (should return 401)
  try {
    const response = await fetch('https://api.linkdao.io/api/cart');
    console.log(`GET /api/cart: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('  Response:', data);
      console.log('  ✅ Correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('  ❌ Expected 401 but got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message, '\n');
  }
  
  // Test 2: POST /api/cart/items without auth (should return 401)
  try {
    const response = await fetch('https://api.linkdao.io/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: 'test-product-id',
        quantity: 1
      })
    });
    console.log(`POST /api/cart/items: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('  Response:', data);
      console.log('  ✅ Correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('  ❌ Expected 401 but got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message, '\n');
  }
  
  // Test 3: PUT /api/cart/items/:id without auth (should return 401)
  try {
    const response = await fetch('https://api.linkdao.io/api/cart/items/test-item-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quantity: 2
      })
    });
    console.log(`PUT /api/cart/items/test-item-id: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('  Response:', data);
      console.log('  ✅ Correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('  ❌ Expected 401 but got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message, '\n');
  }
  
  // Test 4: DELETE /api/cart/items/:id without auth (should return 401)
  try {
    const response = await fetch('https://api.linkdao.io/api/cart/items/test-item-id', {
      method: 'DELETE'
    });
    console.log(`DELETE /api/cart/items/test-item-id: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('  Response:', data);
      console.log('  ✅ Correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('  ❌ Expected 401 but got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message, '\n');
  }
  
  console.log('Cart endpoint testing completed!');
}

testCartEndpoints();