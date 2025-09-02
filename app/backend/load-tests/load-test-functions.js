const crypto = require('crypto');

// Custom functions for Artillery load tests
module.exports = {
  // Generate random wallet address
  generateWalletAddress: function(context, events, done) {
    context.vars.walletAddress = '0x' + crypto.randomBytes(20).toString('hex');
    return done();
  },

  // Generate random signature
  generateSignature: function(context, events, done) {
    context.vars.signature = '0x' + crypto.randomBytes(65).toString('hex');
    return done();
  },

  // Generate random product data
  generateProductData: function(context, events, done) {
    const products = [
      'iPhone 15 Pro',
      'MacBook Pro M3',
      'Tesla Model S',
      'Nike Air Jordan',
      'Sony PlayStation 5',
      'Samsung Galaxy S24',
      'iPad Pro 12.9',
      'AirPods Pro',
      'Apple Watch Ultra',
      'Microsoft Surface Pro'
    ];

    const categories = [
      'electronics',
      'clothing',
      'automotive',
      'gaming',
      'accessories'
    ];

    context.vars.productTitle = products[Math.floor(Math.random() * products.length)];
    context.vars.productCategory = categories[Math.floor(Math.random() * categories.length)];
    context.vars.productPrice = Math.floor(Math.random() * 1000) + 50;
    
    return done();
  },

  // Generate search queries
  generateSearchQuery: function(context, events, done) {
    const searchTerms = [
      'phone',
      'laptop',
      'car',
      'shoes',
      'watch',
      'headphones',
      'tablet',
      'camera',
      'gaming',
      'wireless'
    ];

    context.vars.searchQuery = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    return done();
  },

  // Log response times for analysis
  logResponseTime: function(requestParams, response, context, events, done) {
    const responseTime = response.timings.response;
    
    if (responseTime > 2000) {
      console.log(`Slow response detected: ${requestParams.url} took ${responseTime}ms`);
    }

    // Emit custom metric
    events.emit('customStat', {
      stat: 'response_time',
      value: responseTime
    });

    return done();
  },

  // Validate response data
  validateResponse: function(requestParams, response, context, events, done) {
    if (response.statusCode !== 200) {
      console.log(`Error response: ${requestParams.url} returned ${response.statusCode}`);
      events.emit('customStat', {
        stat: 'error_count',
        value: 1
      });
    }

    // Check for required fields in product responses
    if (requestParams.url.includes('/api/products') && response.body) {
      try {
        const data = JSON.parse(response.body);
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(product => {
            if (!product.id || !product.title || !product.price) {
              console.log('Invalid product data structure detected');
              events.emit('customStat', {
                stat: 'data_validation_error',
                value: 1
              });
            }
          });
        }
      } catch (error) {
        console.log('Failed to parse response JSON');
        events.emit('customStat', {
          stat: 'json_parse_error',
          value: 1
        });
      }
    }

    return done();
  },

  // Simulate user behavior patterns
  simulateUserBehavior: function(context, events, done) {
    const userTypes = ['browser', 'buyer', 'seller', 'searcher'];
    const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
    
    context.vars.userType = userType;
    
    // Set different behavior patterns based on user type
    switch (userType) {
      case 'browser':
        context.vars.thinkTime = Math.floor(Math.random() * 5) + 2; // 2-7 seconds
        context.vars.pagesPerSession = Math.floor(Math.random() * 10) + 5; // 5-15 pages
        break;
      
      case 'buyer':
        context.vars.thinkTime = Math.floor(Math.random() * 10) + 5; // 5-15 seconds
        context.vars.pagesPerSession = Math.floor(Math.random() * 5) + 3; // 3-8 pages
        break;
      
      case 'seller':
        context.vars.thinkTime = Math.floor(Math.random() * 15) + 10; // 10-25 seconds
        context.vars.pagesPerSession = Math.floor(Math.random() * 8) + 2; // 2-10 pages
        break;
      
      case 'searcher':
        context.vars.thinkTime = Math.floor(Math.random() * 3) + 1; // 1-4 seconds
        context.vars.pagesPerSession = Math.floor(Math.random() * 15) + 10; // 10-25 pages
        break;
    }
    
    return done();
  },

  // Generate realistic order data
  generateOrderData: function(context, events, done) {
    const paymentMethods = ['crypto', 'fiat'];
    const cryptocurrencies = ['ETH', 'USDC', 'USDT', 'BTC'];
    
    context.vars.paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    if (context.vars.paymentMethod === 'crypto') {
      context.vars.currency = cryptocurrencies[Math.floor(Math.random() * cryptocurrencies.length)];
    } else {
      context.vars.currency = 'USD';
    }
    
    context.vars.quantity = Math.floor(Math.random() * 5) + 1; // 1-5 items
    context.vars.shippingMethod = Math.random() > 0.7 ? 'express' : 'standard';
    
    return done();
  },

  // Track custom metrics
  trackCustomMetrics: function(context, events, done) {
    const startTime = Date.now();
    context.vars._startTime = startTime;
    
    return done();
  },

  // Calculate and emit custom timing metrics
  emitTimingMetrics: function(requestParams, response, context, events, done) {
    if (context.vars._startTime) {
      const totalTime = Date.now() - context.vars._startTime;
      
      events.emit('customStat', {
        stat: 'total_request_time',
        value: totalTime
      });
    }
    
    // Track different types of requests
    if (requestParams.url.includes('/api/products')) {
      events.emit('customStat', {
        stat: 'product_request_count',
        value: 1
      });
    } else if (requestParams.url.includes('/api/search')) {
      events.emit('customStat', {
        stat: 'search_request_count',
        value: 1
      });
    } else if (requestParams.url.includes('/api/orders')) {
      events.emit('customStat', {
        stat: 'order_request_count',
        value: 1
      });
    } else if (requestParams.url.includes('/api/auth')) {
      events.emit('customStat', {
        stat: 'auth_request_count',
        value: 1
      });
    }
    
    return done();
  },

  // Simulate realistic delays between requests
  addRealisticDelay: function(context, events, done) {
    const delayMs = Math.floor(Math.random() * 3000) + 500; // 0.5-3.5 seconds
    
    setTimeout(() => {
      return done();
    }, delayMs);
  },

  // Generate test data for different scenarios
  setupScenarioData: function(context, events, done) {
    const scenario = context.scenario;
    
    switch (scenario) {
      case 'Browse marketplace':
        context.vars.maxPages = Math.floor(Math.random() * 5) + 3; // 3-8 pages
        context.vars.itemsPerPage = 20;
        break;
        
      case 'Search products':
        context.vars.searchFilters = Math.random() > 0.5;
        context.vars.sortBy = ['price', 'rating', 'newest', 'popular'][Math.floor(Math.random() * 4)];
        break;
        
      case 'Order management':
        context.vars.orderValue = Math.floor(Math.random() * 500) + 50; // $50-$550
        context.vars.requiresKYC = context.vars.orderValue > 300;
        break;
        
      case 'User authentication':
        context.vars.isNewUser = Math.random() > 0.7; // 30% new users
        context.vars.hasProfile = !context.vars.isNewUser || Math.random() > 0.5;
        break;
    }
    
    return done();
  }
};