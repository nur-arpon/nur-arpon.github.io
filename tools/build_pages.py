"""Builds the inner pages (story, privacy, 404, redirects) from page bodies in tools/pages/,
using the header and footer of index.html so every page matches. Run: python tools/build_pages.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
idx = (root / "index.html").read_text(encoding="utf-8")
header = re.search(r'<a class="skip".*?</div>\n(?=\n<main)', idx, re.S).group(0)
footer = re.search(r'<footer class="footer">.*?</footer>', idx, re.S).group(0)
head_common = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="author" content="Nur Ifran Arpon">
<meta name="theme-color" content="#0e0e0f">
<script>(function(){var d=document.documentElement;d.className=d.className.replace('no-js','js');var t=null;try{t=localStorage.getItem('arpon-look')}catch(e){}if(t==='navy'||t==='black')d.setAttribute('data-theme',t)})();</script>
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<link rel="icon" href="assets/img/favicon.svg?v=2" type="image/svg+xml">
<link rel="icon" href="assets/img/favicon-32.png?v=2" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png?v=2">'''
scripts = '''<script src="assets/js/vendor/gsap.min.js" defer></script>
<script src="assets/js/vendor/ScrollTrigger.min.js" defer></script>
<script src="assets/js/vendor/lenis.min.js" defer></script>
<script src="assets/js/site.js" defer></script>'''
for src in sorted((root / "tools" / "pages").glob("*.html")):
    raw = src.read_text(encoding="utf-8")
    meta, body = raw.split("\n---\n", 1)
    m = dict(l.split(": ", 1) for l in meta.strip().splitlines())
    h = header
    if m.get("nav"):
        h = h.replace(f'<a href="{m["nav"]}">', f'<a href="{m["nav"]}" aria-current="page">', 1)
    h = h.replace('href="#work"', 'href="./#work"').replace('href="#skills"', 'href="./#skills"').replace('href="#contact"', 'href="./#contact"')
    f = footer
    canon = f'<link rel="canonical" href="https://nur-arpon.github.io/{m["path"]}">' if m.get("path") is not None else ""
    robots = '<meta name="robots" content="noindex">' if m.get("noindex") else ""
    og = f'''<meta property="og:type" content="website">
<meta property="og:site_name" content="Nur Ifran Arpon">
<meta property="og:title" content="{m["title"]}">
<meta property="og:description" content="{m["desc"]}">
<meta property="og:image" content="https://nur-arpon.github.io/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">'''
    extra = m.get("head", "")
    page = f'''<!doctype html>
<html lang="en" data-theme="black" class="no-js">
<head>
{head_common}
<title>{m["title"]}</title>
<meta name="description" content="{m["desc"]}">
{canon}
{robots}
{og}
{extra}
</head>
<body>
{h}

<main id="main">
{body.strip()}
</main>

{f}

{scripts}
</body>
</html>
'''
    page = re.sub(r"\n{3,}", "\n\n", page)
    if m.get("noindex"):  # served for any missing path, so every link must be absolute
        for a in ("href", "src"):
            page = page.replace(f'{a}="assets/', f'{a}="/assets/').replace(f'{a}="./', f'{a}="/')
            page = page.replace(f'{a}="story.html', f'{a}="/story.html').replace(f'{a}="privacy.html', f'{a}="/privacy.html')
    (root / src.name).write_text(page, encoding="utf-8")
    print("built", src.name)
