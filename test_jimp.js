const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function processImages() {
    const dir = 'assets/opening_movie';
    const files = [
        'cloud.png', 'cloud2.png', 'map.png',
        'egg1.png', 'egg2.png',
        'gold_dragon.png', 'red_dragon.png', 'blue_dragon.png', 'green_dragon.png'
    ];

    for (const file of files) {
        const filePath = path.join(dir, file);
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping (not found): ${file}`);
            continue;
        }
        try {
            const image = await Jimp.read(filePath);
            console.log(`Processing: ${file}`);
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];
                const a = this.bitmap.data[idx + 3];

                // Remove pure white and very close to white (background removal)
                if (r > 240 && g > 240 && b > 240) {
                    this.bitmap.data[idx + 3] = 0;
                }
            });
            await image.write(filePath);
            console.log(`Success: ${file}`);
        } catch (e) {
            console.error(`Error on ${file}:`, e);
        }
    }
}
processImages();
