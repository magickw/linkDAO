const fs = require('fs');
const path = require('path');

// Generate SVG icons at various sizes
const generateSVGIcon = (size, bgColor = '#667eea', textColor = '#ffffff') => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">L</text>
</svg>`;
};

// Generate favicon.ico content (using SVG as fallback)
const generateFavicon = () => {
  return generateSVGIcon(32, '#667eea', '#ffffff');
};

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '../public');

// Create icons directory if it doesn't exist
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating LinkDAO icons...\n');

// Generate icons for each size
sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const filename = `icon-${size}x${size}.png.svg`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created ${filename}`);
});

// Generate favicon
const faviconSVG = generateFavicon();
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✅ Created favicon.svg');

// Generate apple-touch-icon
const appleTouchIcon = generateSVGIcon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('✅ Created apple-touch-icon.svg');

// Generate favicon sizes
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.svg'), generateSVGIcon(16));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.svg'), generateSVGIcon(32));
console.log('✅ Created favicon-16x16.svg and favicon-32x32.svg');

console.log('\n🎉 All icons generated successfully!');
console.log('\nℹ️  Note: These are SVG placeholders. For production, convert them to PNG using:');
console.log('   npm install -g sharp-cli');
console.log('   for file in *.svg; do sharp -i "$file" -o "${file%.svg}.png"; done');
