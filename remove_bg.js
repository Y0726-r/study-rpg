const { Jimp, intToRGBA } = require('jimp');

async function removeBackground(imagePath) {
    console.log(`Processing: ${imagePath}`);
    const image = await Jimp.read(imagePath);

    // Get the color of the top-left pixel
    const cornerColor = intToRGBA(image.getPixelColor(0, 0));

    // Process every pixel
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // 1. Check if it's very close to white (common in AI images)
        const isWhiteish = r > 245 && g > 245 && b > 245;

        // 2. Check if it matches the corner (background) color
        const isCornerMatch = Math.abs(r - cornerColor.r) < 20 &&
            Math.abs(g - cornerColor.g) < 20 &&
            Math.abs(b - cornerColor.b) < 20;

        if (isWhiteish || isCornerMatch) {
            this.bitmap.data[idx + 3] = 0; // Transparent
        }
    });

    await new Promise((resolve, reject) => {
        image.write(imagePath, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    console.log(`Successfully processed: ${imagePath}`);
}

async function run() {
    const files = [
        'assets/icon_english.png',
        'assets/icon_math.png',
        'assets/icon_other.png',
        'assets/icon_science.png',
        'assets/item/chest/chest_wood.png',
        'assets/item/chest/chest_bronze.png',
        'assets/item/chest/chest_silver.png',
        'assets/item/chest/chest_gold.png',
        'assets/item/chest/chest_lv50.png',
        'assets/item/chest/chest_lv99.png'
    ];
    for (const f of files) {
        try {
            await removeBackground(f);
        } catch (e) {
            console.error(`Error on ${f}:`, e.message);
        }
    }
}

run();
