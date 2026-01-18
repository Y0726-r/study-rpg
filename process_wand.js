const { Jimp, intToRGBA } = require('jimp');
const path = require('path');

const INPUT_FILE = 'assets/item/gacha_items/魔法の杖.png';
const OUTPUT_FILE = 'assets/item/gacha_items/魔法の杖_equipped.png';

async function processWand() {
    console.log(`Processing: ${INPUT_FILE}`);
    console.log("Step 1: Reading image...");
    try {
        const image = await Jimp.read(INPUT_FILE); // Should be 1024x1024 or similar
        console.log("Step 2: Image loaded. Width:", image.bitmap.width);

        const w = image.bitmap.width;
        const h = image.bitmap.height;

        // 1. Aggressive Center Crop to remove Card Frame & Text
        // Keep only the center 40% horizontally and 40% vertically (roughly) to isolate the item
        // This assumes the item illustration is centered.
        const cropMarginX = Math.floor(w * 0.25); // Cut 25% from left and right
        const cropMarginY = Math.floor(h * 0.25); // Cut 25% from top and bottom
        // Actually, if it's a card, the top might be title/header.
        // Let's take the middle-center box: x: 25%, y: 20%, w: 50%, h: 50%

        const cropX = Math.floor(w * 0.25);
        const cropY = Math.floor(h * 0.20); // Start a bit higher to catch top of wand
        const cropW = Math.floor(w * 0.50);
        const cropH = Math.floor(h * 0.50);

        console.log(`Step 3: Aggressive Cropping... x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`);
        image.crop({ x: cropX, y: cropY, w: cropW, h: cropH });

        // 2. Remove White Background (Standard "Paper" background removal)
        // Now that we isolated the center, the background should be just the illustration background
        const cornerColor = { r: 255, g: 255, b: 255, a: 255 }; // Target white directly

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // Strict white/near-white check
            // Card backgrounds are often pure white or very light grey
            const isWhiteish = r > 230 && g > 230 && b > 230;

            if (isWhiteish) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            }
        });
        console.log("Step 4: Background removed.");

        // 3. Autocrop to tighten
        image.autocrop();
        console.log("Step 5: Auto-cropped.");

        await new Promise((resolve, reject) => {
            image.write(OUTPUT_FILE, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Saved to: ${OUTPUT_FILE}`);

    } catch (error) {
        console.log("!!! ERROR OCCURRED !!!");
        if (error && error.message) console.log(error.message);
        else console.log(String(error));
    }
}

processWand();
