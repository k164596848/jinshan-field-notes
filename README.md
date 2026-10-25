# Jinshan Field Notes

金山地瓜地方誌 (Jinshan Sweet Potato Field Notes; tagline「來去金山，FUN 藷假」, "Come to Jinshan for a FUN sweet-potato summer"): the 2015 Taiwan Schools Cyberfair entry by the「地瓜金正讚」(Jinshan Sweet Potatoes Are the Best) team from New Taipei Municipal Jinshan High School, together with its 2026 remake.

**Live site:** https://k164596848.github.io/jinshan-field-notes/ (the remake's home page; "2015 原版" in the main menu switches to the original site)

| Folder | Contents |
|---|---|
| `2015-original/` | The original 2015 site (Namo WebEditor output; framesets and Big5 pages left untouched). This is the only source manuscript. Do not edit it. |
| `src/` | The authoritative source of the remake: build scripts, home-page template, the 31 articles, stylesheet, interactive scripts, images and icons. Edit here to change the site. |
| `2026-remake/` | The finished site built from `src/` (the remake). Open `2026-remake/index.html` directly or put it on any static host. Its `original/` folder is a copy of the 2015 original made at build time, and each version has a button that switches to the other, so hosting this one folder serves both versions. |
| `index.html` | A redirect page at the repository root that jumps straight to `2026-remake/`, so the whole repository can be hosted on GitHub Pages or a similar service. |

## Rebuilding

Requires Python 3 and `lxml` (`pip install lxml`). Run from this folder:

```sh
python3 src/build_yam.py 2015-original /tmp/jfn-preview   # build into a temporary directory first and check it
python3 src/verify_build.py                           # confirm that 2026-remake/ matches a clean rebuild
```

Once the output looks right, replace the whole of `2026-remake/` with it. The build script refuses to write its output into the source directory.

## Publishing

After a push to `main`, `.github/workflows/pages.yml` rebuilds and verifies the site, then publishes `2026-remake/` (including the 2015 original under `original/`) to GitHub Pages at https://k164596848.github.io/jinshan-field-notes/ . For first-time setup, open the repository's Settings → Pages and set Source to "GitHub Actions".

GitHub Pages serves every page with `charset=utf-8`, so the build converts the original site's Big5 unit framesets to UTF-8 (the `2015-original/` manuscript stays untouched). The `.nojekyll` file at the root stops GitHub Pages from running Jekyll on this repository.

## Local preview

```sh
cd 2026-remake && python3 -m http.server 8000     # open http://localhost:8000/
```

See `src/README.md` for the detailed source layout and the change log of each revision.
