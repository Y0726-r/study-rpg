const { Jimp } = require('jimp');

const FILES = [
    'assets/player_base.png',
    'assets/player_sword_fixed.png',
    'assets/player_backpack.png'
];

async function cleanup() {
    for (const file of FILES) {
        console.log(`Cleaning ${file}...`);
        try {
            const image = await Jimp.read(file);

            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];

                // Checkerboard removal logic:
                // Target White (#FFFFFF) and light Greys often used in patterns
                // e.g. #CCCCCC, #D9D9D9, #EBEBEB

                const isWhite = r > 240 && g > 240 && b > 240;

                // Check for neutral grey
                const isNeutral = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
                const isGrey = r > 180 && r < 240;

                if ((isWhite || (isNeutral && isGrey))) {
                    this.bitmap.data[idx + 3] = 0; // Set Alpha to 0
                }
            });

            // Only autocrop the equipment items, keep base body dimensions stable
            if (file.includes('sword') || file.includes('backpack')) {
                image.autocrop();
            }

            await image.write(file);
            console.log(`Saved cleaned ${file}`);

        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
}

cleanup();
