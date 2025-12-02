const fs = require('fs');
const path = require('path');
const https = require('https');

// Create tokens directory if it doesn't exist
const tokensDir = path.join(__dirname, '..', 'public', 'tokens');
if (!fs.existsSync(tokensDir)) {
  fs.mkdirSync(tokensDir, { recursive: true });
}

// Token logos to download
const tokenLogos = [
  { symbol: 'eth', url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=024' },
  { symbol: 'btc', url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=024' },
  { symbol: 'usdc', url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024' },
  { symbol: 'usdt', url: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=024' },
  { symbol: 'dai', url: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png?v=024' },
  { symbol: 'link', url: 'https://cryptologos.cc/logos/chainlink-link-logo.png?v=024' },
  { symbol: 'uni', url: 'https://cryptologos.cc/logos/uniswap-uni-logo.png?v=024' },
  { symbol: 'aave', url: 'https://cryptologos.cc/logos/aave-aave-logo.png?v=024' },
  { symbol: 'comp', url: 'https://cryptologos.cc/logos/compound-comp-logo.png?v=024' },
  { symbol: 'mkr', url: 'https://cryptologos.cc/logos/maker-mkr-logo.png?v=024' },
  { symbol: 'snx', url: 'https://cryptologos.cc/logos/synthetix-snx-logo.png?v=024' },
  { symbol: 'yfi', url: 'https://cryptologos.cc/logos/yearn-finance-yfi-logo.png?v=024' },
  { symbol: 'wbtc', url: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png?v=024' }
];

// Download function
function downloadLogo(token) {
  const filePath = path.join(tokensDir, `${token.symbol}.png`);
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${token.symbol} - already exists`);
    return;
  }
  
  const file = fs.createWriteStream(filePath);
  
  https.get(token.url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${token.symbol} logo`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Delete the file async
    console.error(`Failed to download ${token.symbol} logo:`, err.message);
  });
}

// Download all logos
console.log('Downloading token logos...');
tokenLogos.forEach(downloadLogo);

console.log('Token logo download script completed. Check the public/tokens directory.');