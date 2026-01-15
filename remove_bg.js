const Jimp = require('jimp');

async function removeBackground(imagePath, targetColor = { r: 153, g: 153, b: 153 }) {
    console.log(`Processing: ${imagePath}`);
    const image = await Jimp.read(imagePath);

    // Process every pixel
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // Check if color is close to target gray
        const threshold = 10;
        if (Math.abs(r - targetColor.r) < threshold &&
            Math.abs(g - targetColor.g) < threshold &&
            Math.abs(b - targetColor.b) < threshold) {
            this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
        }
    });

    await image.writeAsync(imagePath);
    console.log(`Saved: ${imagePath}`);
}

async function run() {
    try {
        await removeBackground('assets/icon_english.png');
        // We can check others too if needed
    } catch (err) {
        console.error(err);
    }
}

run();
