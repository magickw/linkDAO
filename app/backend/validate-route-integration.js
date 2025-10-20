const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Backend API Integration...\n');

// Check if required route files exist
const requiredRoutes = [
  'src/routes/marketplaceRoutes.ts',
  'src/routes/authRoutes.ts', 
  'src/routes/cartRoutes.ts',
  'src/routes/sellerRoutes.ts'
];

console.log('📁 Checking required route files:');
let allRoutesExist = true;

for (const routeFile of requiredRoutes) {
  const filePath = path.join(__dirname, routeFile);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${routeFile}`);
  } else {
    console.log(`❌ ${routeFile} - MISSING`);
    allRoutesExist = false;
  }
}

// Check if controllers exist
const requiredControllers = [
  'src/controllers/marketplaceController.ts',
  'src/controllers/authController.ts',
  'src/controllers/cartController.ts', 
  'src/controllers/sellerController.ts'
];

console.log('\n🎮 Checking required controller files:');
let allControllersExist = true;

for (const controllerFile of requiredControllers) {
  const filePath = path.join(__dirname, controllerFile);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${controllerFile}`);
  } else {
    console.log(`❌ ${controllerFile} - MISSING`);
    allControllersExist = false;
  }
}

// Check if main index.ts has the route registrations
console.log('\n📋 Checking route registrations in index.ts:');
const indexPath = path.join(__dirname, 'src/index.ts');

if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const expectedRegistrations = [
    "app.use('/api/v1/marketplace', marketplaceApiRoutes)",
    "app.use('/api/v1/auth', authApiRoutes)",
    "app.use('/api/v1/cart', cartApiRoutes)", 
    "app.use('/api/v1/sellers', sellerApiRoutes)",
    "app.use('/api/marketplace', marketplaceApiRoutes)",
    "app.use('/api/auth', authApiRoutes)",
    "app.use('/api/cart', cartApiRoutes)",
    "app.use('/api/sellers', sellerApiRoutes)"
  ];
  
  let allRegistrationsFound = true;
  
  for (const registration of expectedRegistrations) {
    if (indexContent.includes(registration)) {
      console.log(`✅ ${registration}`);
    } else {
      console.log(`❌ ${registration} - NOT FOUND`);
      allRegistrationsFound = false;
    }
  }
  
  // Check for health endpoint
  if (indexContent.includes("app.get('/api/marketplace/health'")) {
    console.log(`✅ Marketplace health endpoint registered`);
  } else {
    console.log(`❌ Marketplace health endpoint - NOT FOUND`);
    allRegistrationsFound = false;
  }
  
  console.log('\n📊 Validation Summary:');
  console.log(`Routes: ${allRoutesExist ? '✅ All present' : '❌ Missing files'}`);
  console.log(`Controllers: ${allControllersExist ? '✅ All present' : '❌ Missing files'}`);
  console.log(`Registrations: ${allRegistrationsFound ? '✅ All registered' : '❌ Missing registrations'}`);
  
  if (allRoutesExist && allControllersExist && allRegistrationsFound) {
    console.log('\n🎉 Backend API Integration validation PASSED!');
    console.log('All required components are in place.');
  } else {
    console.log('\n❌ Backend API Integration validation FAILED!');
    console.log('Some components are missing or not properly configured.');
  }
  
} else {
  console.log('❌ index.ts not found');
}