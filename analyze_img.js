const { Jimp } = require('jimp');
async function analyze() {
    const image = await Jimp.read('assets/opening_movie/cloud.png');
    console.log('Size:', image.bitmap.width, 'x', image.bitmap.height);
    const colors = new Set();
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
        colors.add(hex);
    });
    console.log('Unique colors count:', colors.size);
    // Print some candidate background colors (close to white or gray)
    const list = Array.from(colors).filter(c => {
        const r = parseInt(c.slice(0, 2), 16);
        const g = parseInt(c.slice(2, 4), 16);
        const b = parseInt(c.slice(4, 6), 16);
        return r > 150 && g > 150 && b > 150;
    });
    console.log('Light/Gray colors found:', list.slice(0, 20));
}
analyze();
