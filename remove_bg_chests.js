const { Jimp, intToRGBA } = require('jimp');
const fs = require('fs').promises;
const { PNG } = require('pngjs');

async function removeBackground(imagePath) {
    console.log(`Processing: ${imagePath}`);
    try {
        const image = await Jimp.read(imagePath);
        console.log(`Read image: ${imagePath} (${image.bitmap.width}x${image.bitmap.height})`);

        // Get the color of the top-left pixel
        const cornerColor = intToRGBA(image.getPixelColor(0, 0));
        console.log(`Corner color:`, cornerColor);

        // Process every pixel
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // 1. Check if it's very close to white
            const isWhiteish = r > 245 && g > 245 && b > 245;

            // 2. Check if it matches the corner (background) color
            const isCornerMatch = Math.abs(r - cornerColor.r) < 20 &&
                Math.abs(g - cornerColor.g) < 20 &&
                Math.abs(b - cornerColor.b) < 20;

            if (isWhiteish || isCornerMatch) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            }
        });

        console.log(`Encoding PNG with pngjs...`);
        const newPng = new PNG({
            width: image.bitmap.width,
            height: image.bitmap.height
        });
        newPng.data = image.bitmap.data;
        const buffer = PNG.sync.write(newPng);

        console.log(`Writing to file: ${imagePath}`);
        await fs.writeFile(imagePath, buffer);
        console.log(`Successfully processed: ${imagePath}`);
    } catch (err) {
        console.error(`Failed to process ${imagePath}:`, err);
    }
}

async function run() {
    const files = [
        'assets/item/chest/chest_wood.png',
        'assets/item/chest/chest_bronze.png',
        'assets/item/chest/chest_silver.png',
        'assets/item/chest/chest_gold.png',
        'assets/item/chest/chest_lv50.png',
        'assets/item/chest/chest_lv99.png'
    ];
    console.log("Starting batch processing...");
    for (const f of files) {
        console.log(`--- processing ${f} ---`);
        try {
            await removeBackground(f);
        } catch (e) {
            console.error(`Error on ${f}:`, e);
        }
    }
    console.log("All files processed.");
}

run().catch(console.error);
