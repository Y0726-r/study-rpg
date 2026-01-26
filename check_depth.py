import re

with open("/Users/mitsuki/Desktop/study-rpg-github 3/index.html", "r") as f:
    content = f.read()

tokens = re.findall(r'<div[^>]*>|</div>|<body[^>]*>|</body>', content)
depth = 0
in_body = False
for token in tokens:
    if token.startswith('<body'):
        in_body = True
        depth = 0
    elif token.startswith('</body'):
        in_body = False
    elif token.startswith('<div'):
        id_val = re.search(r'id="([^"]+)"', token).group(1) if 'id="' in token else "no-id"
        class_val = re.search(r'class="([^"]+)"', token).group(1) if 'class="' in token else "no-class"
        if in_body:
            depth += 1
            if "screen" in class_val.split():
                print(f"Screen '{id_val}' at depth {depth}")
    elif token.startswith('</div>'):
        if in_body:
            depth -= 1

