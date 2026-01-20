from PIL import Image
import sys

img = Image.open('assets/item/gacha_equipment/Boots2M.png')
if img.mode != 'RGBA':
    print(f"Mode is {img.mode}, no alpha channel")
else:
    alpha = img.getchannel('A')
    bbox = alpha.getbbox()
    print(f"Alpha bbox: {bbox}")
    extrema = alpha.getextrema()
    print(f"Alpha extremes: {extrema}")
