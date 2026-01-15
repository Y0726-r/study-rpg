const { Jimp } = require('jimp');

async function removeBackground(imagePath) {
    console.log(`Processing: ${imagePath}`);
    const image = await Jimp.read(imagePath);

    // Get the color of the top-left pixel
    const cornerColor = Jimp.intToRGBA(image.getPixelColor(0, 0));

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

    await image.writeAsync(imagePath);
    console.log(`Successfully processed: ${imagePath}`);
}

async function run() {
    const files = [
        'assets/icon_english.png',
        'assets/icon_math.png',
        'assets/icon_other.png',
        'assets/icon_science.png'
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
