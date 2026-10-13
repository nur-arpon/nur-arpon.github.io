"""Builds every page of the site from tools/pages/*.html.

Each source file starts with a few "key: value" lines, then a line "---", then the <main> content.
Keys: title, desc, path (for the canonical URL, "" for the home page), page (home | project | journey | text),
      palette (JSON colours for a product page), font (CSS font stack for a product page), noindex, head (extra <head> HTML).
Run: python tools/build.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://nur-arpon.github.io/"
ICON_V = "3"

RING = [
    ("./", "Home", '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--bg-3)"/><path d="M11 30 L20 11 L29 30" fill="none" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="24.5" r="2.4" fill="var(--accent)"/></svg>'),
    ("spaceadom.html", "Spaceadom", '<img src="assets/img/work/icon-spaceadom.webp" alt="" width="40" height="40">'),
    ("spike.html", "Spike", '<img src="assets/img/work/icon-spike.webp" alt="" width="40" height="40">'),
    ("filez.html", "FileZ", '<img src="assets/img/work/icon-filez.webp" alt="" width="40" height="40">'),
    ("story.html", "Journey", '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--bg-3)"/><path d="M9 26 C15 26 15 14 21 14 S27 26 31 26" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="26" r="2.6" fill="var(--accent)"/><circle cx="31" cy="26" r="2.6" fill="var(--accent)"/></svg>'),
    ("./#about", "About me", '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--bg-3)"/><circle cx="20" cy="16" r="5.5" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M10 31 C11 24 29 24 30 31" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></svg>'),
    ("./#contact", "Say hello", '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--bg-3)"/><rect x="9" y="12" width="22" height="16" rx="3" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M10 14 L20 22 L30 14" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
]

def ring_html():
    items = "\n".join(f'      <div class="item"><a href="{h}">{icon}<span class="lbl">{lbl}</span></a></div>' for h, lbl, icon in RING)
    return f'''<div class="ring-nav" id="ringNav" aria-hidden="true">
  <div class="veil"></div>
  <button class="pill-btn close" type="button">Close</button>
  <div class="hub">
    <div class="beam"></div>
    <div class="centre">Drift to a page, then let go</div>
{items}
  </div>
</div>'''

FRAME = '''<div class="frame">
  <a class="f-name" href="./" aria-label="Nur Ifran Arpon, home"><svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="fnv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2a6b"/><stop offset="1" stop-color="#070b17"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#fnv)"/><path d="M17 47 L32 16 L47 47" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="38" r="3.6" fill="#8ea2ff"/></svg>Nur Ifran Arpon</a>
  <div class="f-right">
    <button class="pill-btn look" type="button" aria-label="Switch the look between navy and black"><span data-v="navy">Navy</span><span data-v="black">Black</span></button>
    <button class="pill-btn" type="button" data-ring aria-haspopup="true" aria-controls="ringNav"><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Menu</button>
  </div>
  <span class="f-clock mono" data-clock></span>
  <span class="f-hint mono">Hold <span class="key">Space</span> to fly anywhere</span>
</div>'''

LOADER = '''<div class="loader" aria-hidden="true"><div class="lname">Nur Ifran Arpon</div><span class="count">000</span><span class="bar"></span></div>'''

FOOTER = '''<footer class="wrap footer">
  <span>© 2026 Nur Ifran Arpon · Apps published as SpaceZ</span>
  <nav aria-label="Footer"><a href="./">Home</a><a href="spaceadom.html">Spaceadom</a><a href="spike.html">Spike</a><a href="filez.html">FileZ</a><a href="story.html">Journey</a><a href="https://github.com/nur-arpon" rel="me">GitHub</a><a href="https://nur-arpon.github.io/SpaceZ/">SpaceZ studio</a><a href="privacy.html">Privacy</a></nav>
  <span class="kofi">Enjoy the free apps? <a href="https://ko-fi.com/nurifran" target="_blank" rel="noopener">Buy me a coffee</a></span>
</footer>'''

def build(src):
    raw = src.read_text(encoding="utf-8")
    meta, body = raw.split("\n---\n", 1)
    m = {k.strip(): v.strip() for k, v in (l.split(":", 1) for l in meta.strip().splitlines())}
    absolute = bool(m.get("noindex"))
    pal = m.get("palette", "")
    pal_attr = f" data-palette='{pal}'" if pal else ""
    style = f' style="--p-font:{m["font"]}"' if m.get("font") else ""
    canon = f'<link rel="canonical" href="{SITE}{m["path"]}">' if "path" in m else ""
    robots = '<meta name="robots" content="noindex">' if absolute else ""
    page = f'''<!doctype html>
<html lang="en" data-theme="navy" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{m["title"]}</title>
<meta name="description" content="{m["desc"]}">
{canon}
{robots}
<meta name="author" content="Nur Ifran Arpon">
<meta name="theme-color" content="#050a18">
<script>(function(){{var d=document.documentElement;d.className=d.className.replace('no-js','js');var t=null;try{{t=localStorage.getItem('arpon-look')}}catch(e){{}}if(t==='navy'||t==='black')d.setAttribute('data-theme',t)}})();</script>
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/app.css">
<link rel="icon" href="assets/img/favicon.svg?v={ICON_V}" type="image/svg+xml">
<link rel="icon" href="assets/img/favicon-32.png?v={ICON_V}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png?v={ICON_V}">
<meta property="og:type" content="{m.get("ogtype", "website")}">
<meta property="og:site_name" content="Nur Ifran Arpon">
<meta property="og:title" content="{m["title"]}">
<meta property="og:description" content="{m["desc"]}">
<meta property="og:url" content="{SITE}{m.get("path", "")}">
<meta property="og:image" content="{SITE}{m.get("og", "assets/img/og.png")}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{m.get("head", "")}
</head>
<body data-page="{m.get("page", "text")}"{pal_attr}{style}>
<a class="skip" href="#main">Skip to content</a>
<canvas id="field" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>
{LOADER}
{FRAME}
{ring_html()}

<main id="main" data-page="{m.get("page", "text")}">
{body.strip()}
{FOOTER}
</main>

<script src="assets/js/vendor/gsap.min.js" defer></script>
<script src="assets/js/vendor/ScrollTrigger.min.js" defer></script>
<script src="assets/js/vendor/lenis.min.js" defer></script>
<script src="assets/js/app.js" defer></script>
</body>
</html>
'''
    page = re.sub(r"\n{3,}", "\n\n", page)
    if absolute:  # the 404 page is served for any missing path, so every link must be absolute
        for a in ("href", "src"):
            page = re.sub(rf'{a}="(?!https?:|#|/|mailto:|data:)([^"]*)"', lambda k: f'{a}="/{k.group(1).lstrip("./")}"', page)
    (ROOT / src.name).write_text(page, encoding="utf-8")
    print("built", src.name)

for f in sorted((ROOT / "tools" / "pages").glob("*.html")):
    build(f)
