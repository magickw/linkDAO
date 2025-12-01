import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

task('compare-gas-usage', 'Compare gas usage between original and optimized contracts')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();

    console.log('🔬 Comparing Gas Usage: Original vs Optimized X402PaymentHandler\n');

    // Deploy original contract
    console.log('📦 Deploying Original X402PaymentHandler...');
    const OriginalX402 = await ethers.getContractFactory('X402PaymentHandler');
    const originalHandler = await OriginalX402.deploy(deployer.address);
    await originalHandler.waitForDeployment();

    // Deploy optimized contract
    console.log('📦 Deploying Optimized X402PaymentHandler...');
    const OptimizedX402 = await ethers.getContractFactory('OptimizedX402PaymentHandler');
    const optimizedHandler = await OptimizedX402.deploy(deployer.address);
    await optimizedHandler.waitForDeployment();

    // Test data
    const testResourceId = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));
    const testAmount = ethers.parseEther('0.1');

    // Test original contract
    console.log('\n🧪 Testing Original Contract...');
    const originalGas = await measureGasUsage(
      originalHandler,
      'processX402Payment',
      [testResourceId, testAmount]
    );

    // Test optimized contract
    console.log('🧪 Testing Optimized Contract...');
    const optimizedGas = await measureGasUsage(
      optimizedHandler,
      'processX402Payment',
      [testResourceId, testAmount]
    );

    // Calculate savings
    const gasSavings = originalGas - optimizedGas;
    const savingsPercentage = ((gasSavings / originalGas) * 100).toFixed(2);

    // Results
    console.log('\n📊 Gas Usage Comparison Results:');
    console.log('=====================================');
    console.log(`Original Contract:   ${originalGas.toLocaleString()} gas`);
    console.log(`Optimized Contract:  ${optimizedGas.toLocaleString()} gas`);
    console.log(`Gas Savings:          ${gasSavings.toLocaleString()} gas (${savingsPercentage}%)`);
    console.log(`Cost Savings (20 gwei): ${ethers.formatEther(gasSavings * BigInt('20000000000'))} ETH`);

    // Test other functions
    await compareFunctionGas(
      originalHandler,
      optimizedHandler,
      'confirmPayment',
      [ethers.keccak256(ethers.toUtf8Bytes('test-payment')), 'test-tx-id']
    );

    await compareFunctionGas(
      originalHandler,
      optimizedHandler,
      'refundPayment',
      [ethers.keccak256(ethers.toUtf8Bytes('test-payment'))]
    );

    console.log('\n✅ Gas comparison completed!');
  });

async function measureGasUsage(
  contract: any,
  functionName: string,
  args: any[]
): Promise<number> {
  try {
    const tx = await contract[functionName].populateTransaction(...args);
    const estimatedGas = await contract.runner.estimateGas(tx);
    return Number(estimatedGas);
  } catch (error) {
    console.error(`Error measuring gas for ${functionName}:`, error);
    return 0;
  }
}

async function compareFunctionGas(
  originalContract: any,
  optimizedContract: any,
  functionName: string,
  args: any[]
): Promise<void> {
  console.log(`\n🔍 Comparing ${functionName}...`);
  
  const originalGas = await measureGasUsage(originalContract, functionName, args);
  const optimizedGas = await measureGasUsage(optimizedContract, functionName, args);
  
  if (originalGas > 0 && optimizedGas > 0) {
    const savings = originalGas - optimizedGas;
    const savingsPercentage = ((savings / originalGas) * 100).toFixed(2);
    
    console.log(`  Original:  ${originalGas.toLocaleString()} gas`);
    console.log(`  Optimized: ${optimizedGas.toLocaleString()} gas`);
    console.log(`  Savings:   ${savings.toLocaleString()} gas (${savingsPercentage}%)`);
  } else {
    console.log(`  ⚠️  Could not measure gas for ${functionName}`);
  }
}

task('deploy-optimized-x402', 'Deploy optimized X402PaymentHandler contract')
  .addParam('tiprouter', 'The TipRouter contract address')
  .setAction(async (taskArgs: { tiprouter: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();

    console.log('🚀 Deploying Optimized X402PaymentHandler...');
    console.log(`TipRouter: ${taskArgs.tiprouter}`);
    console.log(`Deployer: ${deployer.address}`);

    const OptimizedX402 = await ethers.getContractFactory('OptimizedX402PaymentHandler');
    const optimizedHandler = await OptimizedX402.deploy(taskArgs.tiprouter);

    await optimizedHandler.waitForDeployment();
    const deployedAddress = await optimizedHandler.getAddress();

    console.log('✅ OptimizedX402PaymentHandler deployed to:', deployedAddress);

    // Verify deployment
    const tipRouterAddress = await optimizedHandler.tipRouter();
    console.log('TipRouter set to:', tipRouterAddress);

    // Test basic functionality
    const testResourceId = ethers.keccak256(ethers.toUtf8Bytes('test'));
    const testAmount = ethers.parseEther('0.1');
    
    try {
      const tx = await optimizedHandler.processX402Payment(testResourceId, testAmount);
      const receipt = await tx.wait();
      console.log('🧪 Test payment processed successfully');
      console.log(`   Gas used: ${receipt?.gasUsed?.toLocaleString()}`);
    } catch (error) {
      console.log('⚠️  Test payment failed (expected without TipRouter setup)');
    }

    return {
      contractAddress: deployedAddress,
      deployer: deployer.address,
      network: hre.network.name
    };
  });