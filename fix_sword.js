const { Jimp, intToRGBA } = require('jimp');

const INPUT_FILE = 'assets/player_sword.png';
const OUTPUT_FILE = 'assets/player_sword_fixed.png';

async function fixSword() {
    console.log(`Processing: ${INPUT_FILE}`);
    try {
        const image = await Jimp.read(INPUT_FILE); // 1024x1024 likely

        // Scan and remove checkerboard pattern (greys and whites)
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // Checkerboard is usually white and light grey
            const isWhite = r > 240 && g > 240 && b > 240;
            const isGrey = r > 190 && g > 190 && b > 190 &&
                Math.abs(r - g) < 10 && Math.abs(g - b) < 10; // Greyish

            if (isWhite || isGrey) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            }
        });

        // Autocrop to just the sword
        image.autocrop();

        await new Promise((resolve, reject) => {
            image.write(OUTPUT_FILE, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Saved to: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Error:", error);
    }
}

fixSword();
