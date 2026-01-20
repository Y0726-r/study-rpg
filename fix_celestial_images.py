from PIL import Image
import os

def make_transparent(path):
    print(f"Processing: {path}")
    if not os.path.exists(path):
        print("File not found.")
        return

    try:
        img = Image.open(path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        # Replace white background with transparency
        # Tolerance usually helps, but for generated art strict white might be enough.
        # Let's use a small threshold to catch compression artifacts if any.
        threshold = 240
        
        for item in datas:
            if item[0] > threshold and item[1] > threshold and item[2] > threshold:
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(path, "PNG")
        print(f"Successfully saved transparent version: {path}")

    except Exception as e:
        print(f"Error processing {path}: {e}")

make_transparent('./assets/sun.png')
make_transparent('./assets/moon.png')
