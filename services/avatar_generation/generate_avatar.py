#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from PIL import Image
import trimesh


def average_color(path: Path):
    img = Image.open(path).convert('RGB').resize((32, 32))
    px = list(img.getdata())
    r = sum(p[0] for p in px) // len(px)
    g = sum(p[1] for p in px) // len(px)
    b = sum(p[2] for p in px) // len(px)
    return [r, g, b, 255]


def create_glb(image_path: str, out_glb: str):
    color = average_color(Path(image_path))
    head = trimesh.creation.uv_sphere(radius=0.55)
    torso = trimesh.creation.cylinder(radius=0.35, height=0.9)
    torso.apply_translation((0, -0.95, 0))

    head.visual.vertex_colors = color
    torso.visual.vertex_colors = color

    scene = trimesh.Scene([head, torso])
    scene.export(out_glb)


if __name__ == '__main__':
    image_path = sys.argv[1]
    out_glb = sys.argv[2]
    Path(out_glb).parent.mkdir(parents=True, exist_ok=True)
    create_glb(image_path, out_glb)
    print(json.dumps({'avatar': out_glb}))
