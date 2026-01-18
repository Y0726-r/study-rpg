const { Jimp } = require('jimp');

const ITEMS = [
    { in: 'assets/item/gacha_items/革の靴.png', out: 'assets/item/gacha_items/革の靴_equipped.png' },
    { in: 'assets/item/gacha_items/聖なる宝冠.png', out: 'assets/item/gacha_items/聖なる宝冠_equipped.png' },
    { in: 'assets/item/gacha_items/銀のヘアピン.png', out: 'assets/item/gacha_items/銀のヘアピン_equipped.png' },
    { in: 'assets/item/gacha_items/赤いリボン.png', out: 'assets/item/gacha_items/赤いリボン_equipped.png' },
    { in: 'assets/item/gacha_items/精霊のドレス.png', out: 'assets/item/gacha_items/精霊のドレス_equipped.png' } // Body armor
];

async function processMultiple() {
    for (const item of ITEMS) {
        console.log(`Processing: ${item.in}`);
        try {
            const image = await Jimp.read(item.in);

            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];

                // Checkerboard / White removal logic
                const isWhite = r > 230 && g > 230 && b > 230;
                const isGrey = r > 180 && r < 240 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;

                if (isWhite || isGrey) {
                    this.bitmap.data[idx + 3] = 0; // Transparent
                }
            });

            // Autocrop
            image.autocrop();

            await image.write(item.out);
            console.log(`Saved to: ${item.out}`);

        } catch (error) {
            console.error(`Error processing ${item.in}:`, error);
        }
    }
}

processMultiple();
