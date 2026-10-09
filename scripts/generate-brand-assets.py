#!/usr/bin/env python3
"""
Icônes et images d'ouverture de RUNEX Driver, à partir de l'icône source.

    python3 scripts/generate-brand-assets.py chemin/vers/icone-source.jpg

L'icône source est la tuile RUNEX (R rouge + « RUNEX », fond anthracite).
Le logo en est détouré (fond estimé ligne par ligne, transparence d'après
l'écart au fond, halo rouge conservé), puis recomposé :

  assets/brand/icon.png                 icône 1024 (iOS, Android ancien)
  assets/brand/adaptive-background.png  fond de l'icône adaptative Android
  assets/brand/adaptive-foreground.png  logo dans la zone sûre (66 %)
  assets/brand/adaptive-monochrome.png  silhouette (icônes à thème Android 13+)
  assets/brand/splash-mark.png          « R » seul (écran de démarrage natif)
  assets/brand/wordmark.png             « RUNEX » seul (animation d'ouverture)
  assets/brand/glow.png                 halo rouge radial
  assets/brand/favicon.png              favicon web

Dépendances : Pillow, numpy.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else 'icone-source.jpg'
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'brand'
OUT.mkdir(parents=True, exist_ok=True)
N = 1024


def cutout(path):
    im = np.array(Image.open(path).convert('RGB').resize((N, N), Image.LANCZOS)).astype(float)
    W = im.shape[1]
    # Fond de la tuile : colonnes libres de part et d'autre du logo.
    left, right = im[:, 100:122].mean(axis=1), im[:, 918:930].mean(axis=1)
    t = np.clip((np.arange(W) - 111) / (924 - 111), 0, 1)[None, :, None]
    bg = left[:, None, :] * (1 - t) + right[:, None, :] * t
    bg = np.array(Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float)
    d = np.abs(im - bg).max(axis=2)
    a = np.clip((d - 12) / 40, 0, 1)
    # Seul ce qui touche les formes reste (halo compris) : pas de voile autour.
    core = Image.fromarray(((a > 0.6) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(10))
    a = a * np.clip(np.array(core).astype(float) / 255 * 1.6, 0, 1)
    fg = np.where(a[..., None] > 0.02, (im - bg * (1 - a[..., None])) / np.maximum(a[..., None], 0.02), 0)
    rgba = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)[225:805, 110:935]
    logo = Image.fromarray(rgba, 'RGBA')
    mark = logo.crop((0, 0, logo.width, 365))
    word = logo.crop((0, 365, logo.width, logo.height))
    return logo.crop(logo.getbbox()), mark.crop(mark.getbbox()), word.crop(word.getbbox())


def gradient(n, top=(40, 43, 49), bottom=(13, 14, 17), boost=14):
    y = np.linspace(0, 1, n)[:, None, None]
    x = np.linspace(-1, 1, n)[None, :]
    yy = np.linspace(-1, 1, n)[:, None]
    base = np.array(top) * (1 - y) + np.array(bottom) * y
    rad = np.exp(-((x ** 2 + (yy + 0.15) ** 2) / 0.45))[..., None]
    return Image.fromarray(np.clip(base + rad * boost, 0, 255).astype(np.uint8), 'RGB')


def place(canvas, img, width, cy=0.5):
    h = int(img.height * width / img.width)
    canvas.alpha_composite(img.resize((width, h), Image.LANCZOS), ((canvas.width - width) // 2, int(canvas.height * cy - h / 2)))
    return canvas


logo, mark, word = cutout(SRC)
icon = place(gradient(N).convert('RGBA'), logo, 800)
icon.convert('RGB').save(OUT / 'icon.png')
icon.convert('RGB').resize((196, 196), Image.LANCZOS).save(OUT / 'favicon.png')
gradient(N).save(OUT / 'adaptive-background.png')
fg = place(Image.new('RGBA', (N, N), (0, 0, 0, 0)), logo, 560)
fg.save(OUT / 'adaptive-foreground.png')
mono = np.zeros((N, N, 4), np.uint8)
mono[..., :3] = 255
mono[..., 3] = np.where(np.array(fg)[..., 3] > 90, 255, 0)
Image.fromarray(mono).filter(ImageFilter.SMOOTH).save(OUT / 'adaptive-monochrome.png')
mark.resize((600, int(mark.height * 600 / mark.width)), Image.LANCZOS).save(OUT / 'splash-mark.png')
word.resize((800, int(word.height * 800 / word.width)), Image.LANCZOS).save(OUT / 'wordmark.png')
yy, xx = np.mgrid[-1:1:512j, -1:1:512j]
glow = np.zeros((512, 512, 4), np.uint8)
glow[..., 0], glow[..., 1], glow[..., 2] = 230, 24, 36
glow[..., 3] = np.clip(np.exp(-(xx ** 2 + yy ** 2) / 0.18) * 200, 0, 255).astype(np.uint8)
Image.fromarray(glow).save(OUT / 'glow.png')
for f in sorted(OUT.iterdir()):
    print(f.name, Image.open(f).size)
