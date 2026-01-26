import re

with open("/Users/mitsuki/Desktop/study-rpg-github 3/index.html", "r") as f:
    content = f.read()

divs = re.findall(r'<div[^>]*>|</div>', content)
stack = []
for div in divs:
    if div.startswith('<div'):
        id_match = re.search(r'id="([^"]+)"', div)
        class_match = re.search(r'class="([^"]+)"', div)
        id_val = id_match.group(1) if id_match else "no-id"
        class_val = class_match.group(1) if class_match else "no-class"
        
        if "screen" in class_val.split():
            # Check if we are already inside a screen
            for parent_id, parent_class in stack:
                if "screen" in parent_class.split():
                    print(f"ALARM: Nested Screen found! '{id_val}' is inside '{parent_id}'")
        
        stack.append((id_val, class_val))
    else:
        if stack:
            stack.pop()

print("Check finished.")
