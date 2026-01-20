from PIL import Image
import os

def analyze_image(path):
    print(f"Analyzing: {path}")
    if not os.path.exists(path):
        print("File not found.")
        return

    try:
        img = Image.open(path)
        print(f"Format: {img.format}, Mode: {img.mode}, Size: {img.size}")
        
        if img.mode != 'RGBA':
            print("Image is not in RGBA mode. Converting...")
            img = img.convert('RGBA')
            
        # Check corners and edges for non-transparent white pixels
        corners = [
            (0, 0), 
            (img.width - 1, 0), 
            (0, img.height - 1), 
            (img.width - 1, img.height - 1)
        ]
        
        white_pixels_found = False
        
        print("Checking corners:")
        for pos in corners:
            pixel = img.getpixel(pos)
            print(f"  {pos}: {pixel}")
            # Check if it's opaque and white-ish
            if pixel[3] > 0 and pixel[0] > 240 and pixel[1] > 240 and pixel[2] > 240:
                white_pixels_found = True

        if white_pixels_found:
             print("ALERT: Opaque white pixels detected in corners!")
        else:
             print("Corners appear transparent or not white.")

    except Exception as e:
        print(f"Error analyzing image: {e}")

analyze_image('./assets/sun.png')
analyze_image('./assets/moon.png')
