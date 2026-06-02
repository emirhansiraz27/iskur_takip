/**
 * Converts black background pixels in public/deu-logo-white.png to transparent.
 *
 * Usage:
 *   npm install jimp
 *   node betikler/make-logo-transparent.js
 *
 * This writes a new file at public/deu-logo-transparent.png
 */
const Jimp = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'deu-logo-white.png');
const outputPath = path.join(__dirname, '..', 'public', 'deu-logo-transparent.png');

async function run() {
  try {
    const image = await Jimp.read(inputPath);
    const { width, height } = image.bitmap;

    image.scan(0, 0, width, height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];

      // If pixel is (near) black, make it transparent.
      if (r < 30 && g < 30 && b < 30) {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await image.writeAsync(outputPath);
    console.log('Saved:', outputPath);
  } catch (err) {
    console.error('Error processing image:', err);
    process.exitCode = 1;
  }
}

run();
