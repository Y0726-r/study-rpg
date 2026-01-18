const { Jimp } = require('jimp');

const INPUT_FILE = 'assets/item/gacha_items/小さな盾.png';
const OUTPUT_FILE = 'assets/item/gacha_items/小さな盾_equipped.png';

async function processShield() {
    console.log(`Processing: ${INPUT_FILE}`);
    try {
        const image = await Jimp.read(INPUT_FILE); // 1024x1024 likely

        // 1. Remove Background (White and light Greys)
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // Checkerboard / White removal
            const isWhite = r > 230 && g > 230 && b > 230;
            const isGrey = r > 180 && r < 240 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;

            if (isWhite || isGrey) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            }
        });

        // 2. Autocrop to remove excess empty space
        image.autocrop();

        // 3. Optional: Flip? 
        // If it's the "opposite hand", maybe we mirror it? 
        // Let's keep it as is for now.

        await image.write(OUTPUT_FILE);
        console.log(`Saved to: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Error processing shield:", error);
    }
}

processShield();
