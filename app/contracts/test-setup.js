const fs = require('fs');
const path = require('path');

console.log('Testing smart contract development environment setup...');

// Check if required files exist
const requiredFiles = [
  'hardhat.config.ts',
  'package.json',
  '.env.example',
  'contracts/LDAOToken.sol',
  'contracts/Counter.sol',
  'contracts/MockERC20.sol'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  const requiredDeps = [
    '@openzeppelin/contracts',
    'hardhat',
    '@nomicfoundation/hardhat-toolbox',
    'dotenv'
  ];
  
  console.log('\nChecking dependencies:');
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`✓ ${dep} configured`);
    } else {
      console.log(`✗ ${dep} missing`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log('✗ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Check hardhat config
try {
  const configContent = fs.readFileSync(path.join(__dirname, 'hardhat.config.ts'), 'utf8');
  
  if (configContent.includes('@nomicfoundation/hardhat-toolbox')) {
    console.log('✓ Hardhat toolbox configured');
  } else {
    console.log('✗ Hardhat toolbox not configured');
    allFilesExist = false;
  }
  
  if (configContent.includes('sepolia')) {
    console.log('✓ Testnet configuration found');
  } else {
    console.log('✗ Testnet configuration missing');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log('✗ Error reading hardhat config:', error.message);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('✓ Development environment setup complete!');
  console.log('✓ All required files and dependencies are configured');
  console.log('✓ Ready for contract development and testing');
} else {
  console.log('✗ Development environment setup incomplete');
  console.log('Some required files or dependencies are missing');
}
console.log('='.repeat(50));