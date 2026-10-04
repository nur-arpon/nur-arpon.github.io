"""Copy the shared header and footer into every page.

Edit tools/partials/header.html or footer.html, then run:  python tools/build_partials.py
Each page keeps its own copy between the <!-- header:start --> / <!-- header:end --> and
<!-- footer:start --> / <!-- footer:end --> markers, so the pages stay plain static HTML.
{{root}} becomes "" for normal pages and "/" for 404.html (GitHub Pages serves 404 at any path).
{{cur:name}} becomes aria-current="page" on the page with that name."""
import pathlib
import re

SITE = pathlib.Path(__file__).resolve().parent.parent
PARTS = SITE / "tools" / "partials"
PAGES = ["index", "work", "story", "hire", "privacy", "404"]


def fill(text, page):
    root = "/" if page == "404" else ""
    text = text.replace("{{root}}", root)
    text = re.sub(r"\{\{cur:(\w+)\}\}", lambda m: ' aria-current="page"' if m.group(1) == page else "", text)
    return text.rstrip("\n")


for page in PAGES:
    f = SITE / f"{page}.html"
    if not f.exists():
        print("missing", f.name)
        continue
    html = f.read_text(encoding="utf-8")
    for part in ("header", "footer"):
        block = fill((PARTS / f"{part}.html").read_text(encoding="utf-8"), page)
        pat = re.compile(rf"(<!-- {part}:start -->)(.*?)(<!-- {part}:end -->)", re.S)
        if not pat.search(html):
            print(f"{f.name}: no {part} markers")
            continue
        html = pat.sub(lambda m: m.group(1) + "\n" + block + "\n" + m.group(3), html)
    f.write_text(html, encoding="utf-8", newline="\n")
    print("ok", f.name)
