const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const projectRoot = path.join(__dirname, '..');
const svgPath = path.join(projectRoot, 'public', 'icons', 'icon.svg');
const outputDir = path.join(projectRoot, 'public', 'icons');

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
  
  // Also generate apple-touch-icon.png (180x180)
  const applePath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(applePath);
  console.log(`Generated ${applePath}`);
}

generateIcons().catch(console.error);
