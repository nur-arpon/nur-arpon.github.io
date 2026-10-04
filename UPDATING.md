# Updating the SpaceZ website

Everything that changes often lives in `data/site.json`. Edit that file, check it, commit, push.

    python -m json.tool data/site.json

## Common jobs

- **Contact address.** `contact.email`. The Hire page builds the address from this value with JavaScript, so it never appears in the page source. Also update the one no-JS line in `hire.html` (search for `[at]`).
- **A project's status.** `projects.<name>.label` and `.state`. States: `live` (lime dot), `build` (amber), `dev` (blue), `test` (pink). The pages also keep the same words as plain text for search engines: search the HTML for the old label and change it too.
- **Photos of Arpon.** Put a WebP (about 900 px wide, under 300 KB) in `assets/img/me/`, then add it to `photos`:
  `{ "src": "assets/img/me/arpon-1.webp", "alt": "Nur Ifran Arpon", "width": 900, "height": 1100 }`.
  The first photo appears in the centre of the home page orbit, the second (or the first, if there is only one) beside the story. With `photos: []` the pages look complete without one.
- **Budget and timing choices** in the brief builder: `hire.budgets` and `hire.timelines`.

## Header and footer

They are repeated in every page. Change them once in `tools/partials/header.html` or `footer.html`, then run:

    python tools/build_partials.py

## New page

Copy `privacy.html`, give it its own title, description and canonical, add it to `tools/partials/*.html` and `sitemap.xml`, then run the partials script.

## Share image

`assets/img/og.png` is rendered from `tools/og.html` (1200 x 630). Re-render it after a name change.

## Analytics

The site has none today and `privacy.html` says so. If Google Analytics is added, update the "What this website collects" and "What may change" sections of `privacy.html` in the same commit.
