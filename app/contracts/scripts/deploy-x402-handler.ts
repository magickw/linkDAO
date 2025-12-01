import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

task('deploy-x402-handler', 'Deploy X402PaymentHandler contract')
  .addParam('tiprouter', 'The TipRouter contract address')
  .setAction(async (taskArgs: { tiprouter: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();

    console.log('Deploying X402PaymentHandler with account:', deployer.address);
    console.log('TipRouter address:', taskArgs.tiprouter);

    // Validate TipRouter address
    if (!ethers.isAddress(taskArgs.tiprouter)) {
      throw new Error('Invalid TipRouter address provided');
    }

    // Deploy X402PaymentHandler
    const X402PaymentHandler = await ethers.getContractFactory('X402PaymentHandler');
    const x402Handler = await X402PaymentHandler.deploy(taskArgs.tiprouter);

    await x402Handler.waitForDeployment();
    const deployedAddress = await x402Handler.getAddress();

    console.log('X402PaymentHandler deployed to:', deployedAddress);

    // Verify TipRouter is set correctly
    const tipRouterAddress = await x402Handler.tipRouter();
    console.log('TipRouter set to:', tipRouterAddress);

    // Log deployment info
    console.log('\n=== Deployment Summary ===');
    console.log('Network:', hre.network.name);
    console.log('X402PaymentHandler:', deployedAddress);
    console.log('TipRouter:', taskArgs.tiprouter);
    console.log('Deployer:', deployer.address);
    console.log('Transaction hash:', x402Handler.deploymentTransaction()?.hash);

    return {
      x402Handler: deployedAddress,
      tipRouter: taskArgs.tiprouter,
      deployer: deployer.address,
      network: hre.network.name
    };
  });

task('verify-x402-handler', 'Verify X402PaymentHandler contract on Etherscan')
  .addParam('address', 'The deployed contract address')
  .addParam('tiprouter', 'The TipRouter contract address used in deployment')
  .setAction(async (taskArgs: { address: string; tiprouter: string }, hre: HardhatRuntimeEnvironment) => {
    const { run } = hre;

    console.log('Verifying X402PaymentHandler at:', taskArgs.address);
    
    try {
      await run('verify:verify', {
        address: taskArgs.address,
        constructorArguments: [taskArgs.tiprouter],
      });
      console.log('Contract verified successfully!');
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log('Contract is already verified!');
      } else {
        console.error('Verification failed:', error);
      }
    }
  });

task('setup-x402-handler', 'Complete setup of X402PaymentHandler including TipRouter configuration')
  .addParam('tiprouter', 'The TipRouter contract address')
  .addFlag('verify', 'Verify contract after deployment')
  .setAction(async (taskArgs: { tiprouter: string; verify: boolean }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, run } = hre;
    
    console.log('=== X402PaymentHandler Setup ===');
    
    // Step 1: Deploy X402PaymentHandler
    console.log('\n1. Deploying X402PaymentHandler...');
    const deployResult = await run('deploy-x402-handler', {
      tiprouter: taskArgs.tiprouter
    });
    
    // Step 2: Update TipRouter to use the new handler
    console.log('\n2. Updating TipRouter to use new X402PaymentHandler...');
    const TipRouter = await ethers.getContractFactory('TipRouter');
    const tipRouter = TipRouter.attach(taskArgs.tiprouter);
    
    const tx = await tipRouter.setX402Handler(deployResult.x402Handler);
    await tx.wait();
    
    console.log('TipRouter updated with X402PaymentHandler address:', deployResult.x402Handler);
    
    // Step 3: Verify if requested
    if (taskArgs.verify) {
      console.log('\n3. Verifying contracts...');
      try {
        await run('verify-x402-handler', {
          address: deployResult.x402Handler,
          tiprouter: taskArgs.tiprouter
        });
      } catch (error) {
        console.warn('Verification failed:', error);
      }
    }
    
    // Step 4: Test the integration
    console.log('\n4. Testing integration...');
    const X402PaymentHandler = await ethers.getContractFactory('X402PaymentHandler');
    const x402Handler = X402PaymentHandler.attach(deployResult.x402Handler);
    
    const handlerAddress = await tipRouter.x402Handler();
    console.log('X402Handler set in TipRouter:', handlerAddress);
    
    const tipRouterInHandler = await x402Handler.tipRouter();
    console.log('TipRouter in X402Handler:', tipRouterInHandler);
    
    console.log('\n=== Setup Complete ===');
    console.log('X402PaymentHandler:', deployResult.x402Handler);
    console.log('TipRouter:', taskArgs.tiprouter);
    console.log('Integration test passed!');
    
    return deployResult;
  });