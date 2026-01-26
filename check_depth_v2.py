import re

with open("/Users/mitsuki/Desktop/study-rpg-github 3/index.html", "r") as f:
    content = f.read()

# Normalize spacing
content = content.replace("  ", " ")

tokens = re.findall(r'<div[^>]*>|</div>|<body[^>]*>|</body>', content, re.IGNORECASE)
depth = 0
in_body = False
for token in tokens:
    tag = token.lower()
    if tag.startswith('<body'):
        in_body = True
        depth = 0
    elif tag.startswith('</body'):
        in_body = False
    elif tag.startswith('<div'):
        id_val = re.search(r'id="([^"]+)"', token, re.IGNORECASE)
        id_val = id_val.group(1) if id_val else "no-id"
        class_val = re.search(r'class="([^"]+)"', token, re.IGNORECASE)
        class_val = class_val.group(1) if class_val else "no-class"
        
        if in_body:
            depth += 1
            if "screen" in class_val.lower().split():
                print(f"DEPTH {depth}: <div id='{id_val}' class='{class_val}'>")
    elif tag.startswith('</div>'):
        if in_body:
            depth -= 1

