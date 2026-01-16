
const { WalletService } = require('./app/frontend/src/services/walletService');
const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

async function testBaseSepolia() {
    console.log('Testing Base Sepolia Connection...');

    // Use the URL from .env.local if possible, or fallback
    const rpcUrl = 'https://base-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp';
    console.log('RPC URL:', rpcUrl);

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl)
    });

    try {
        const blockNumber = await client.getBlockNumber();
        console.log('Current Block Number:', blockNumber.toString());
    } catch (e) {
        console.error('Failed to connect to Base Sepolia:', e.message);
    }

    // Check known USDC contract
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    // Use a known holder or random address if we don't have user's address convenient, 
    // but let's try reading decimals to verify contract exists
    try {
        const decimals = await client.readContract({
            address: usdcAddress,
            abi: [{
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                type: 'function'
            }],
            functionName: 'decimals'
        });
        console.log('USDC Decimals:', decimals);
    } catch (e) {
        console.error('Failed to read USDC contract:', e.message);
    }
}

testBaseSepolia();
