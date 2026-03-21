from PIL import Image
import os

files = [
    r'C:\Users\kisho\.gemini\antigravity\brain\a602d7a1-b98b-42b5-b115-a0b102892f46\media__1774078459124.png',
    r'C:\Users\kisho\.gemini\antigravity\brain\a602d7a1-b98b-42b5-b115-a0b102892f46\media__1774078459085.png',
    r'C:\Users\kisho\.gemini\antigravity\brain\a602d7a1-b98b-42b5-b115-a0b102892f46\media__1774078459146.png',
]

# Pick the best logo, probably the white background Z logo (124.png generally)
try:
    img = Image.open(files[0]).convert("RGBA")
except:
    img = Image.open(files[1]).convert("RGBA")

datas = img.getdata()
new_data = []
for item in datas:
    # Change absolute white (and near white) to transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

img.putdata(new_data)
w, h = img.size
size = max(w, h)
new_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
new_img.paste(img, ((size - w) // 2, (size - h) // 2))
final_img = new_img.resize((512, 512), Image.Resampling.LANCZOS)
final_img.save(r'C:\Users\kisho\college-ai-agent\frontend\public\icon-512.png', 'PNG')
final_img.save(r'C:\Users\kisho\college-ai-agent\frontend\public\zentrix-logo.png', 'PNG')
print("Icons saved successfully with transparent background!")
