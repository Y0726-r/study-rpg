const { Jimp } = require('jimp');
const path = require('path');

async function removeBackground(inputPath, outputPath) {
    console.log(`Processing: ${inputPath} -> ${outputPath}`);
    try {
        const image = await Jimp.read(inputPath);

        // Get the top-left pixel color as a starting point
        const cornerColorInt = image.getPixelColor(0, 0);
        const cr = (cornerColorInt >> 24) & 0xFF;
        const cg = (cornerColorInt >> 16) & 0xFF;
        const cb = (cornerColorInt >> 8) & 0xFF;

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // Match whiteish or the corner color
            const isWhiteish = r > 240 && g > 240 && b > 240;
            const isCornerMatch = Math.abs(r - cr) < 20 &&
                Math.abs(g - cg) < 20 &&
                Math.abs(b - cb) < 20;

            if (isWhiteish || isCornerMatch) {
                this.bitmap.data[idx + 3] = 0; // Alpha 0
            }
        });

        await image.write(outputPath);
        console.log(`Success: ${outputPath}`);
    } catch (e) {
        console.error(`Error processing ${inputPath}:`, e.message);
    }
}

async function start() {
    const mapping = [
        { src: '/Users/mitsuki/.gemini/antigravity/brain/008f74f8-5b58-4487-9fa4-b3bb84158d5d/uploaded_image_1_1768521697488.png', dest: 'assets/icon_english.png' }, // Book
        { src: '/Users/mitsuki/.gemini/antigravity/brain/008f74f8-5b58-4487-9fa4-b3bb84158d5d/uploaded_image_2_1768521697488.png', dest: 'assets/icon_math.png' },    // Scroll
        { src: '/Users/mitsuki/.gemini/antigravity/brain/008f74f8-5b58-4487-9fa4-b3bb84158d5d/uploaded_image_3_1768521697488.png', dest: 'assets/icon_other.png' },   // ? Box
        { src: '/Users/mitsuki/.gemini/antigravity/brain/008f74f8-5b58-4487-9fa4-b3bb84158d5d/uploaded_image_0_1768521697488.png', dest: 'assets/icon_science.png' } // Briefcase
    ];

    for (const item of mapping) {
        await removeBackground(item.src, item.dest);
    }
}

start();
