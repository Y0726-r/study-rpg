const { Jimp } = require('jimp');

const FILE = 'assets/player_base.png';

async function analyze() {
    try {
        const image = await Jimp.read(FILE);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        let minX = w, maxX = 0, minY = h, maxY = 0;

        image.scan(0, 0, w, h, function (x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });

        console.log(`Image Size: ${w}x${h}`);
        console.log(`Content Bounds: x[${minX}-${maxX}], y[${minY}-${maxY}]`);

        const topPerc = (minY / h) * 100;
        const bottomPerc = (maxY / h) * 100;
        const centerXPerc = ((minX + maxX) / 2 / w) * 100;

        console.log(`Head Top Y: ${topPerc.toFixed(1)}%`);
        console.log(`Feet Bottom Y: ${bottomPerc.toFixed(1)}%`);
        console.log(`Body Center X: ${centerXPerc.toFixed(1)}%`);

    } catch (err) {
        console.error(err);
    }
}

analyze();
