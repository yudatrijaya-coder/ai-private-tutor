#!/usr/bin/env python3
"""
Remove backgrounds from character images using rembg.
Output: {name}-nobg.png (transparent background, body only)
"""
import sys, os
from pathlib import Path
from PIL import Image

CHARACTERS_DIR = Path.home() / "ai-private-tutor" / "public" / "characters"

def remove_bg(input_path: Path) -> Path:
    """Remove background, save as PNG with transparent bg"""
    from rembg import remove
    
    output_path = input_path.with_stem(input_path.stem + "-nobg").with_suffix(".png")
    if output_path.exists():
        print(f"  ⏭️  {output_path.name} already exists, skipping")
        return output_path
    
    print(f"  🖼️  Processing {input_path.name}...")
    img = Image.open(input_path)
    out = remove(img)
    
    # Crop tight bounding box
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    
    out.save(output_path)
    print(f"  ✅ Saved {output_path.name} ({out.size[0]}x{out.size[1]})")
    return output_path

if __name__ == "__main__":
    # Process all JPG images in characters dir
    for img_path in sorted(CHARACTERS_DIR.glob("*.jpg")):
        if "-nobg" in img_path.stem:
            continue
        remove_bg(img_path)
    
    print("\n✅ All done!")
