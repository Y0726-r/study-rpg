from PIL import Image
import os

path = 'assets/item/gacha_equipment/Boots2M.png'
img = Image.open(path).convert('RGBA')
datas = img.getdata()

newData = []
# 白~グレーのチェッカーボード（透過風の背景）を透明にする
# Bootは茶色系なので、(200, 200, 200)以上のピクセルを透明化
for item in datas:
    if item[0] > 200 and item[1] > 200 and item[2] > 200:
        newData.append((255, 255, 255, 0)) # 完全透明に置換
    else:
        newData.append(item)

img.putdata(newData)
img.save(path, 'PNG')
print(f"Successfully processed {path} and made background transparent.")
