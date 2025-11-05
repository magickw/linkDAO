const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('🔄 Converting SVG icons to PNG...\n');

const convertSVGtoPNG = async (svgPath, pngPath) => {
  try {
    await sharp(svgPath)
      .png()
      .toFile(pngPath);
    return true;
  } catch (error) {
    console.error(`Failed to convert ${path.basename(svgPath)}:`, error.message);
    return false;
  }
};

const convertAll = async () => {
  let converted = 0;
  let failed = 0;

  // Convert icon sizes
  for (const size of sizes) {
    const svgFile = path.join(publicDir, `icon-${size}x${size}.png.svg`);
    const pngFile = path.join(publicDir, `icon-${size}x${size}.png`);

    if (fs.existsSync(svgFile)) {
      const success = await convertSVGtoPNG(svgFile, pngFile);
      if (success) {
        console.log(`✅ Converted icon-${size}x${size}.png`);
        converted++;
      } else {
        failed++;
      }
    }
  }

  // Convert favicon
  const faviconSvg = path.join(publicDir, 'favicon.svg');
  const faviconIco = path.join(publicDir, 'favicon.ico');
  if (fs.existsSync(faviconSvg)) {
    // Convert to PNG first, then rename (ICO conversion is more complex)
    const faviconPng = path.join(publicDir, 'favicon-temp.png');
    const success = await convertSVGtoPNG(faviconSvg, faviconPng);
    if (success) {
      // For now, just use the PNG as favicon.ico (browsers will accept it)
      fs.copyFileSync(faviconPng, faviconIco);
      fs.unlinkSync(faviconPng);
      console.log('✅ Created favicon.ico');
      converted++;
    } else {
      failed++;
    }
  }

  // Convert apple-touch-icon
  const appleSvg = path.join(publicDir, 'apple-touch-icon.svg');
  const applePng = path.join(publicDir, 'apple-touch-icon.png');
  if (fs.existsSync(appleSvg)) {
    const success = await convertSVGtoPNG(appleSvg, applePng);
    if (success) {
      console.log('✅ Converted apple-touch-icon.png');
      converted++;
    } else {
      failed++;
    }
  }

  // Convert favicon sizes
  const favicon16 = path.join(publicDir, 'favicon-16x16.svg');
  const favicon32 = path.join(publicDir, 'favicon-32x32.svg');

  if (fs.existsSync(favicon16)) {
    const success = await convertSVGtoPNG(favicon16, path.join(publicDir, 'favicon-16x16.png'));
    if (success) {
      console.log('✅ Converted favicon-16x16.png');
      converted++;
    } else {
      failed++;
    }
  }

  if (fs.existsSync(favicon32)) {
    const success = await convertSVGtoPNG(favicon32, path.join(publicDir, 'favicon-32x32.png'));
    if (success) {
      console.log('✅ Converted favicon-32x32.png');
      converted++;
    } else {
      failed++;
    }
  }

  console.log(`\n🎉 Conversion complete! ${converted} icons converted, ${failed} failed.`);
};

convertAll().catch(error => {
  console.error('Error during conversion:', error);
  process.exit(1);
});
