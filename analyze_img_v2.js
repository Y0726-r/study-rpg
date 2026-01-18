const { Jimp } = require('jimp');
async function analyze() {
    for (const f of ['assets/opening_movie/cloud.png', 'assets/opening_movie/cloud2.png']) {
        try {
            const image = await Jimp.read(f);
            console.log(`--- ${f} ---`);
            console.log('Size:', image.bitmap.width, 'x', image.bitmap.height);
            const colors = new Map();
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];
                const a = this.bitmap.data[idx + 3];
                const key = `${r},${g},${b},${a}`;
                colors.set(key, (colors.get(key) || 0) + 1);
            });
            console.log('Unique pixel values count:', colors.size);
            const sorted = Array.from(colors.entries()).sort((a, b) => b[1] - a[1]);
            console.log('Top 10 colors (R,G,B,A: Count):');
            console.log(sorted.slice(0, 10));
        } catch (e) {
            console.log(`Error reading ${f}:`, e.message);
        }
    }
}
analyze();
