#!/usr/bin/env python3
"""Rebuild the 2015 CyberFair site yam51103 (Namo WebEditor framesets + layout tables)
as a clean, responsive static site.  Usage: build_yam.py SRC_DIR OUT_DIR ASSET_DIR"""
import os, re, sys, shutil, struct, argparse, html as htmlmod
from pathlib import Path
from lxml import html, etree

TOOL_DIR = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description="Build the v4 Jinshan field journal from the original Namo site.")
parser.add_argument("source", help="Original Namo site")
parser.add_argument("output", help="Generated site directory")
parser.add_argument("assets", nargs="?", default=str(TOOL_DIR), help="Canonical CSS, JS and img directory")
args = parser.parse_args()
SRC, OUT, ASSETS = (os.path.abspath(a) for a in (args.source, args.output, args.assets))
# Validate inputs before replacing any output directory.
for required in (Path(SRC) / "index.htm", Path(ASSETS) / "site.css", Path(ASSETS) / "site.js", TOOL_DIR / "templates/home.html"):
    if not required.is_file():
        parser.error(f"Missing build input: {required}")
for required in ("jinshan-harvest-1000.webp", "jinshan-harvest-600.webp", "mascot-trio.webp", "mascot-adventures.webp", "chapter-companions.webp"):
    if not (Path(ASSETS) / "img" / required).is_file():
        parser.error(f"Missing artwork: {required}")
for protected in (Path(SRC), Path(ASSETS), TOOL_DIR, Path.cwd()):
    if Path(OUT) == protected or Path(OUT) in protected.parents:
        parser.error(f"Output must not contain source files or the working directory: {OUT}")
SITE = "來去金山，FUN藷假"
LEGACY_DIR = "original"          # the 2015 site, copied verbatim into the output so both versions share one host
LEGACY_BAR = "remake-bar.htm"    # thin top frame with the "back to the 2026 remake" button
LEGACY_BAR_ROWS = "40"

# line icons (24x24, stroke = currentColor) for the eight units + home
ICONS = {
    "home":    '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h11v-8.5"/><path d="M10 19v-5h4v5"/>',
    "legacy":  '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l2.8 1.7"/>',
    "how":     '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/><path d="M11 8c-2 .3-3 1.4-3.2 3.2"/>',
    "jinshan": '<path d="M3 19 9 9l3.5 5.5L15 11l6 8H3Z"/><circle cx="17.5" cy="6" r="2"/>',
    "yam":     '<path d="M4.5 14.5c0-4 4-8.5 9.5-8.5 4 0 6 2.5 6 5.5 0 4-4 8-9.5 8-4 0-6-2-6-5Z"/><path d="M13 6c.5-2 2-3 3.5-3.5"/><path d="M9 13c1.5-.5 3-.5 4.5 0"/>',
    "sweet":   '<path d="M3 20h18"/><path d="M6 20v-3c0-1 .7-1.7 1.7-1.7h8.6c1 0 1.7.7 1.7 1.7v3"/><path d="M12 15V9"/><path d="M12 9c0-3-2.2-5-5-5 0 3 2.2 5 5 5Z"/><path d="M12 11c0-3 2.2-5 5-5 0 3-2.2 5-5 5Z"/>',
    "money":   '<path d="M4 10 5.5 5h13L20 10"/><path d="M4 10c0 1.4 1.1 2.5 2.5 2.5S9 11.4 9 10c0 1.4 1.1 2.5 2.5 2.5S14 11.4 14 10c0 1.4 1.1 2.5 2.5 2.5S20 11.4 20 10"/><path d="M5.5 12.5V19h13v-6.5"/><path d="M10 19v-4h4v4"/>',
    "fun":     '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3 2-5 3.5-7 .4 1.5 1.2 2.4 2 3 .5-2.5 2-5.5 4.5-7 0 3 1.2 4.6 2.3 6.2A7.3 7.3 0 0 1 18.5 15c0 3.4-2.6 6-6.5 6Z"/><path d="M12 21c-1.7 0-3-1.3-3-3 0-1.6 1.3-2.6 2-4 1 1 1.6 1.7 2.2 2.8.5.7.8 1.3.8 1.2 0 1.7-1.3 3-2 3Z"/>',
    "people":  '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.5-3.3 2.6-5 5.5-5s5 1.7 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.6.2 4.3 1.8 4.8 4.8"/>',
    "about":   '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 15.5h5M10 9h2"/>',
}
def icon(name, cls="ic"):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{ICONS[name]}</svg>')
# The red-fleshed sweet potato character marks Jinshan in the header, footer and browser tabs.
LOGO_MARK = (TOOL_DIR / "icons/brand-mark.svg").read_text(encoding="utf-8").strip()

# ---------------------------------------------------------------- site map
# (slug, nav label, section badge, [(old page, new file, nav label, h1, badge)])
SECTIONS = [
    ("how", "地瓜知多少", "images/1.png", [
        ("how-data/how-html/how1-1.htm", "1.html", "研究動機", "研究動機", "how-data/how-html/images/1-1.png"),
        ("how-data/how-html/how2-1.htm", "2.html", "研究目標", "研究目標", "how-data/how-html/images/1-2.png"),
        ("how-data/how-html/how3-1.htm", "3.html", "研究方法", "研究方法", "how-data/how-html/images/1-3.png"),
        ("how-data/how-html/how4-1.htm", "4.html", "研究設計", "研究設計", "how-data/how-html/images/1-4.png"),
    ]),
    ("jinshan", "來去金山", "images/2.png", [
        ("Jinshan-data/Jinshan-html/Jinshan1-1.htm", "1.html", "地理位置", "地理位置", "Jinshan-data/Jinshan-html/images/2-1.png"),
        ("Jinshan-data/Jinshan-html/Jinshan2-1.htm", "2.html", "歷史角色", "歷史角色", "Jinshan-data/Jinshan-html/images/2-2.png"),
        ("Jinshan-data/Jinshan-html/Jinshan3-1.htm", "3.html", "自然景觀", "自然景觀", "Jinshan-data/Jinshan-html/images/2-3.png"),
        ("Jinshan-data/Jinshan-html/Jinshan4-1.htm", "4.html", "歡迎來玩", "歡迎來玩", "Jinshan-data/Jinshan-html/images/2-4.png"),
    ]),
    ("yam", "藷支藷支", "images/3.png", [
        ("yam-data/yam-html/yam1-1.htm", "1.html", "悉藷回憶", "悉藷回憶", "yam-data/yam-html/images/3-5.png"),
        ("yam-data/yam-html/yam2-1.htm", "2.html", "超級比一比", "超級比一比", "yam-data/yam-html/images/3-2.png"),
        ("yam-data/yam-html/yam3-1.htm", "3.html", "食在好吃", "食在好吃", "yam-data/yam-html/images/3-3.png"),
        ("yam-data/yam-html/yam4-1.htm", "4.html", "食在小心", "食在小心", "yam-data/yam-html/images/3-4.png"),
    ]),
    ("sweet", "地瓜全紀錄", "images/4.png", [
        ("sweet-data/sweet-html/sweet1-1.htm", "1.html", "覓金山情", "覓金山情", "sweet-data/sweet-html/images/4-1.png"),
        ("sweet-data/sweet-html/sweet2-1.htm", "2.html", "瓜瓜記錄", "瓜瓜記錄", "sweet-data/sweet-html/images/4-2.png"),
        ("sweet-data/sweet-html/sweet3-1.htm", "3.html", "藷在害怕", "藷在害怕", "sweet-data/sweet-html/images/4-3.png"),
    ]),
    ("money", "藷來實地", "images/5.png", [
        ("money-data/money-html/money1-1.htm", "1.html", "甘藷節慶", "金山甘藷節", "money-data/money-html/images/5-1.png"),
        ("money-data/money-html/money2-1.htm", "2.html", "農特產品", "農特產品", "money-data/money-html/images/5-2.png"),
        ("money-data/money-html/money3-1.htm", "3.html", "老街探訪", "老街探訪", "money-data/money-html/images/5-3.png"),
        ("money-data/money-html/money4-1.htm", "4.html", "旺旺地瓜園", "旺旺地瓜園", "money-data/money-html/images/5-4.png"),
    ]),
    ("fun", "FUN藷假", "images/6.png", [
        ("Fun-data/Fun-html/Fun1-1.htm", "1.html", "挖地瓜體驗", "挖地瓜體驗", "Fun-data/Fun-html/images/6-1.png"),
        ("Fun-data/Fun-html/Fun2-1.htm", "2.html", "焢窯好好玩", "焢窯好好玩", "Fun-data/Fun-html/images/6-2.png"),
        ("Fun-data/Fun-html/Fun3-1.htm", "3.html", "料理DIY", "創意料理ＤＩＹ", "Fun-data/Fun-html/images/6-3.png"),
    ]),
    ("people", "藷在好棒", "images/7.png", [
        ("People-data/People-html/People1-1.htm", "1.html", "藷小孩", "藷小孩", "People-data/People-html/images/7-1.png"),
        ("People-data/People-html/People2-1.htm", "2.html", "藷老師", "藷老師", "People-data/People-html/images/7-2.png"),
        ("People-data/People-html/People3-1.htm", "3.html", "謝誌", "謝誌", "People-data/People-html/images/7-3.png"),
        ("People-data/People-html/People4-1.htm", "4.html", "工作日誌", "藷在記錄－工作日誌", "People-data/People-html/images/7-4.png"),
        ("People-data/People-html/People5-1.htm", "5.html", "參考資料", "藷在認真－參考資料", "People-data/People-html/images/7-5.png"),
    ]),
    ("about", "專題簡報", "images/8.png", [
        ("narrative-data/narrative-html/A.htm", "1.html", "相關資訊", "相關資訊", None),
        ("narrative-data/narrative-html/B.htm", "2.html", "計畫總覽", "計畫總覽", None),
        ("narrative-data/narrative-html/C.htm", "3.html", "計劃要素", "計劃要素", None),
        ("narrative-data/narrative-html/D.htm", "4.html", "貢獻列表", "貢獻列表", None),
    ]),
]
EXTRA_ASSETS = ["photo/39.png", "photo/zz.gif", "photo/6.png", "photo/cc-by-nc-sa-88x31.png"]

# old page path -> new page path (site-relative)
PAGE_MAP = {}
for slug, _, _, pages in SECTIONS:
    for old, new, *_ in pages:
        PAGE_MAP[old] = f"{slug}/{new}"
for old in ("index.htm", "Frist.htm", "all-2.htm", "switch.htm"):
    PAGE_MAP[old] = "index.html"
PAGE_MAP["narrative.htm"] = "about/1.html"
PAGE_MAP["narrative-data/narrative-html/up.htm"] = "about/1.html"

# ---------------------------------------------------------------- helpers
def img_size(path):
    try:
        with open(path, "rb") as f:
            head = f.read(32)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                return struct.unpack(">II", head[16:24])
            if head[:6] in (b"GIF87a", b"GIF89a"):
                return struct.unpack("<HH", head[6:10])
            if head[:2] == b"\xff\xd8":
                f.seek(2)
                while True:
                    m = f.read(2)
                    if len(m) < 2 or m[0] != 0xFF:
                        return None
                    if m[1] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                        f.read(3)
                        h, w = struct.unpack(">HH", f.read(4))
                        return w, h
                    if m[1] == 0xD8 or 0xD0 <= m[1] <= 0xD7 or m[1] == 0x01:
                        continue
                    (L,) = struct.unpack(">H", f.read(2))
                    f.seek(L - 2, 1)
    except Exception:
        return None
    return None

_case_cache = {}
def resolve_ci(abs_path):
    """Resolve a path case-insensitively (Windows-authored links vs. real file names)."""
    if abs_path == SRC:
        return abs_path
    parent, name = os.path.split(abs_path)
    parent = resolve_ci(parent) if parent and parent != abs_path else parent
    if not parent or not os.path.isdir(parent):
        return None
    key = (parent, name.lower())
    if key not in _case_cache:
        _case_cache[key] = {n.lower(): n for n in os.listdir(parent)}.get(name.lower())
    real = _case_cache[key]
    return os.path.join(parent, real) if real else None

copied = {}
missing_imgs = []
def asset_dest(old_rel):
    """Map an original image path (site-relative) to its new site-relative path."""
    parts = old_rel.split("/")
    name = parts[-1]
    m = re.match(r"^(how|Jinshan|yam|sweet|money|People|Fun|narrative)-data/\1-photo/(.*)$", old_rel)
    if m:
        slug = {"Jinshan": "jinshan", "People": "people", "Fun": "fun", "narrative": "about"}.get(m.group(1), m.group(1))
        return f"{slug}/photo/{m.group(2)}"
    if parts[0] == "photo":
        return f"assets/img/{name}"
    if parts[0] == "images" or (len(parts) >= 3 and parts[2] == "images"):
        return f"assets/img/nav/{name}"
    return f"assets/img/misc/{name}"

def copy_asset(old_rel):
    """Copy an original asset into the new tree; returns new site-relative path or None."""
    src = resolve_ci(os.path.join(SRC, old_rel))
    if not src:
        missing_imgs.append(old_rel)
        return None
    real_rel = os.path.relpath(src, SRC)
    dest_rel = asset_dest(real_rel)
    dest = os.path.join(OUT, dest_rel)
    if dest_rel not in copied:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        copied[dest_rel] = src
    return dest_rel

def rel(from_page, to_site_rel):
    return os.path.relpath(to_site_rel, os.path.dirname(from_page) or ".").replace(os.sep, "/")

def norm_anchor(s):
    return re.sub(r"[\s　]+", "_", s.strip())

def text_of(el):
    return re.sub(r"[\s　\xa0]+", "", el.text_content() or "")

def is_data_table(tb):
    """A bordered table with no nested tables is real tabular data; bordered wrappers around other tables are layout."""
    bordered = (tb.get("border") or "0").strip() not in ("0", "") or tb.get("bordercolordark") is not None
    return bordered and tb.find(".//table") is None

NBSP_RUN = re.compile(r"[\xa0 ]{3,}")
DASH_LINE = re.compile(r"^[\-－—_–＿\s\xa0]{8,}$")
PT = re.compile(r"font-size:\s*([0-9.]+)pt", re.I)
COLOR_CLASS = {"red": "c-red", "#ff0000": "c-red", "blue": "c-blue", "#0c4ca8": "c-blue",
               "#330066": "c-purple", "#9900ff": "c-purple", "#009900": "c-green"}
KEEP_ATTRS = {"a": {"href", "target", "rel", "id", "title", "class"}, "img": {"src", "alt", "width", "height", "loading", "class"},
              "td": {"colspan", "rowspan", "id"}, "th": {"colspan", "rowspan", "id"}, "table": {"class"},
              "div": {"class", "style", "id"}, "span": {"class", "id"}, "p": {"id", "class"}, "h2": {"id"}, "h3": {"id"},
              "hr": set()}

# ---------------------------------------------------------------- conversion
def convert_page(old_rel, new_rel, h1):
    path = os.path.join(SRC, old_rel)
    doc = html.parse(path)
    body = doc.getroot().body
    stats = {"imgs": 0, "rows": 0, "data_tables": 0, "h2": 0}

    # 1. junk (Namo leaves class="MsoNormal" etc.; real classes are assigned later)
    for el in list(body.iter("script", "style", "meta", "base", "noscript", "link")):
        el.drop_tree()
    for el in body.iter("p"):
        if el.get("class"): del el.attrib["class"]
    for c in list(body.iter(etree.Comment)):
        c.drop_tree()

    # 2. remember heading candidates before inline tags are unwrapped
    heading_candidates = set()
    for p in body.iter("p"):
        sizes = [float(m.group(1)) for el in p.iter("span", "font", "p") for m in [PT.search(el.get("style") or "")] if m]
        txt = text_of(p)
        bold = p.find(".//b") is not None and any(text_of(b) == txt for b in p.iter("b"))
        colored = any((f.get("color") or "").lower() in COLOR_CLASS for f in p.iter("font"))
        big = bool(sizes) and max(sizes) >= 18
        in_table = any(is_data_table(t) for t in p.iterancestors("table"))
        if bold and not in_table and 0 < len(txt) <= 30 and p.find(".//img") is None and (big or (colored and len(txt) <= 20)):
            heading_candidates.add(p)

    # 3. javascript popup links -> ordinary links in a new tab
    for a in body.iter("a"):
        href = a.get("href") or ""
        m = re.match(r"javascript:na_open_window\('[^']*',\s*'([^']+)'", href)
        if m:
            a.set("href", m.group(1)); a.set("target", "_blank"); a.set("rel", "noopener")

    # 4. inline presentation: colors survive as classes, everything else unwrapped
    for f in list(body.iter("font")):
        col = (f.get("color") or "").lower()
        cls = COLOR_CLASS.get(col)
        if cls and text_of(f):
            f.tag = "span"; f.attrib.clear(); f.set("class", cls)
        else:
            f.drop_tag()
    for el in list(body.iter("span")):
        if not (el.get("class") or "").startswith("c-"):
            el.drop_tag()
    for el in list(body.iter("center", "div", "blockquote", "u", "tbody")):
        el.drop_tag()
    for el in list(body.iter("ul", "ol")):
        if el.find("li") is None:
            el.drop_tag()

    # 5. "TOP↑" back-links
    removed_anchors = set()
    for a in list(body.iter("a")):
        if re.fullmatch(r"TOP\s*↑?", (a.text_content() or "").strip(), re.I):
            parent = a.getparent()
            a.drop_tree()
            while parent is not None and parent.tag in ("p", "b", "strong", "td") and not text_of(parent) and parent.find(".//img") is None:
                gp = parent.getparent(); parent.drop_tree(); parent = gp

    # 6. tables: data tables stay, layout tables become flex rows
    is_data = is_data_table
    def cell_empty(td):
        return not text_of(td) and td.find(".//img") is None and td.find(".//table") is None
    while True:
        # innermost layout tables first; a layout table may still contain (finished) data tables
        layout = [tb for tb in body.iter("table")
                  if not is_data(tb) and not any(not is_data(d) for d in tb.iterdescendants("table"))]
        if not layout:
            break
        for tb in layout:
            wrapper = html.Element("div"); wrapper.set("class", "layout")
            for tr in tb.xpath("./tr|./tbody/tr|./thead/tr|./tfoot/tr"):   # own rows only, never a nested table's
                cells = [c for c in tr if c.tag in ("td", "th") and not cell_empty(c)]
                if not cells:
                    continue
                if len(cells) == 1:
                    cell = cells[0]
                    if cell.text and cell.text.strip():
                        p = html.Element("p"); p.text = cell.text; wrapper.append(p)
                    for child in list(cell):
                        wrapper.append(child)
                    continue
                widths = [c.get("width") for c in cells]
                if all(w and w.isdigit() for w in widths):
                    weights = [int(w) for w in widths]
                else:
                    weights = [int(c.get("colspan") or 1) for c in cells]
                total = sum(weights) or 1
                row = html.Element("div"); row.set("class", "row")
                for c, w in zip(cells, weights):
                    cell = html.Element("div"); cell.set("class", "cell")
                    cell.set("style", f"--basis:{100 * w / total:.0f}%")
                    if c.text and c.text.strip():
                        p = html.Element("p"); p.text = c.text; cell.append(p)
                    for child in list(c):
                        cell.append(child)
                    if c.find(".//img") is not None and not text_of(c):
                        cell.set("class", "cell cell-media")
                    row.append(cell)
                wrapper.append(row); stats["rows"] += 1
            tb.getparent().replace(tb, wrapper)
        # nested data tables keep their place inside the new wrappers
    for tb in body.iter("table"):
        tb.attrib.clear(); tb.set("class", "data"); stats["data_tables"] += 1
        for cell in tb.iter("td", "th"):
            for k in list(cell.attrib):
                if k not in ("colspan", "rowspan"):
                    del cell.attrib[k]
        for tr in tb.iter("tr"):
            tr.attrib.clear()
    for el in list(body.iter("div")):
        if el.get("class") == "layout":
            el.drop_tag()
    for tb in list(body.iter("table")):            # top-level data tables scroll sideways on small screens
        if not any(anc.tag == "table" for anc in tb.iterancestors()):
            wrap = html.Element("div"); wrap.set("class", "table-wrap")
            tb.addprevious(wrap); wrap.append(tb)
            wrap.tail, tb.tail = tb.tail, None

    # 7. images
    n = 0
    for img in list(body.iter("img")):
        src = img.get("src") or ""
        if not src or src.startswith(("http:", "https:", "data:")):
            continue
        old_abs = os.path.normpath(os.path.join(os.path.dirname(old_rel), htmlmod.unescape(src)))
        dest_rel = copy_asset(old_abs)
        if not dest_rel:
            img.drop_tree(); continue
        n += 1; stats["imgs"] += 1
        img.attrib.clear()
        img.set("src", rel(new_rel, dest_rel)); img.set("alt", f"{h1}照片{n}")
        size = img_size(os.path.join(OUT, dest_rel))
        if size:
            img.set("width", str(size[0])); img.set("height", str(size[1]))
        if n > 2:
            img.set("loading", "lazy")
        if size and max(size) > 360 and img.getparent().tag != "a":
            a = html.Element("a"); a.set("href", img.get("src")); a.set("class", "zoom")
            img.addprevious(a); a.append(img)
            a.tail, img.tail = img.tail, None

    # 8. anchors & links
    for a in body.iter("a"):
        if a.get("name"):
            a.set("id", norm_anchor(a.get("name"))); del a.attrib["name"]
        href = a.get("href")
        if a.get("target") in ("_top", "_parent", "_self", "main", "detail", "win"):
            del a.attrib["target"]
        if href and href.startswith(("http:", "https:")):
            a.set("target", "_blank"); a.set("rel", "noopener")
            continue
        if not href or href.startswith(("mailto:", "#")):
            if href and href.startswith("#"):
                a.set("href", "#" + norm_anchor(htmlmod.unescape(href[1:])))
            continue
        target, _, frag = href.partition("#")
        old_abs = os.path.normpath(os.path.join(os.path.dirname(old_rel), htmlmod.unescape(target))).replace(os.sep, "/")
        if old_abs.startswith("../"):            # link out of this sub-site (e.g. ../../index.htm)
            old_abs = "index.htm"
        if old_abs in PAGE_MAP:
            new = rel(new_rel, PAGE_MAP[old_abs])
            a.set("href", new + ("#" + norm_anchor(frag) if frag else ""))

    # 9. whitespace, empty paragraphs, separators
    for el in body.iter():
        if isinstance(el.tag, str):
            if el.text: el.text = NBSP_RUN.sub(" ", el.text)
            if el.tail: el.tail = NBSP_RUN.sub(" ", el.tail)
    for p in list(body.iter("p")):
        if DASH_LINE.fullmatch(p.text_content() or "") and p.find(".//img") is None:
            hr = html.Element("hr"); p.getparent().replace(p, hr); continue
        if not text_of(p) and p.find(".//img") is None:
            p.drop_tree()
    for p in list(body.iter("p")):            # trailing <br> clutter
        while len(p) and p[-1].tag == "br" and not (p[-1].tail or "").strip():
            p.remove(p[-1])
    for p in body.iter("p"):                  # figure captions / source notes / image-only paragraphs
        t = (p.text_content() or "").strip()
        if re.match(r"^(圖片來源|照片來源|資料來源|參考文獻|資料參考)", t):
            p.set("class", "caption")
        elif p.find(".//img") is not None and not text_of(p):
            p.set("class", "fig")

    # 10. attribute whitelist
    for el in body.iter():
        if not isinstance(el.tag, str):
            continue
        keep = KEEP_ATTRS.get(el.tag, {"id"})
        for k in list(el.attrib):
            if k not in keep:
                del el.attrib[k]

    # 11. headings: drop the duplicated page title, promote sub-headings
    target_txt = re.sub(r"[\s　\-－]+", "", h1)
    for p in list(body.iter("p")):
        if p in heading_candidates or text_of(p) == target_txt:
            if re.sub(r"[\-－]", "", text_of(p)) == target_txt:
                for a in p.iter("a"):
                    if a.get("id"): removed_anchors.add(a.get("id"))
                p.drop_tree()
            elif p in heading_candidates:
                p.tag = "h2"; stats["h2"] += 1
                for b in list(p.iter("b", "strong", "span")):
                    b.drop_tag()
                if p.text: p.text = p.text.strip()
    for a in body.iter("a"):
        href = a.get("href") or ""
        if href.startswith("#") and href[1:] in removed_anchors:
            a.set("href", "#top")

    inner = (body.text or "") + "".join(html.tostring(c, encoding="unicode", method="html") for c in body)
    return inner.strip(), stats

# ---------------------------------------------------------------- templates
def page_shell(new_rel, title, body_html, current_slug=None, section=None, page_idx=None):
    root = rel(new_rel, "index.html")[:-len("index.html")]
    is_home = new_rel == "index.html"
    theme_attrs = ' class="home"' if is_home else ''
    chapter_continue = ""
    if current_slug:
        category, note, invitation, background, accent = CHAPTER_COVERS[current_slug]
        theme_attrs = (f' class="article-page article-{current_slug}" '
                       f'style="--chapter-bg:{background};--chapter-accent:{accent}"')
    nav = [f'<li{" class=\"current\"" if is_home else ""}><a href="{root}index.html">{icon("home")}<span>首頁</span></a></li>']
    for slug, label, badge, pages in SECTIONS:
        cur = ' class="current"' if slug == current_slug else ""
        nav.append(f'<li{cur}><a href="{root}{slug}/{pages[0][1]}">{icon(slug)}<span>{label}</span></a></li>')
    nav.append(f'<li class="legacy"><a href="{root}{LEGACY_DIR}/index.htm" title="瀏覽 2015 年的原版網站">{icon("legacy")}<span>2015 原版</span></a></li>')
    side = ""
    pager = ""
    if section:
        slug, label, badge, pages = section
        items = []
        for i, (_, new, nlabel, *_rest) in enumerate(pages):
            cur = ' aria-current="page"' if i == page_idx else ""
            items.append(f'<li><a href="{root}{slug}/{new}"{cur}><span class="n">{i+1:02d}</span>{nlabel}</a></li>')
        guide, skin, action = COMPANIONS[slug]
        side = (f'<aside class="side-nav" aria-label="{label}章節導覽">'
                f'<div class="side-cover"><span class="side-edition">CHAPTER {SECTIONS.index(section)+1:02d}</span>'
                f'<span class="side-mascot">{chapter_drawing(slug)}</span>'
                f'<span class="side-cover-label">{category}</span></div>'
                f'<div class="side-head"><div><p class="eyebrow">{guide}帶你讀</p><h2>{label}</h2></div></div>'
                f'<ul>{"".join(items)}</ul><a class="side-home" href="{root}index.html#chapter-results">'
                f'<span aria-hidden="true">↖</span> 回到地瓜地方誌</a></aside>')
        next_section = SECTIONS[(SECTIONS.index(section)+1) % len(SECTIONS)]
        next_slug, next_label, _, next_pages = next_section
        chapter_continue = (f'<aside class="chapter-continue"><div><p class="eyebrow">ANOTHER LITTLE STORY</p>'
                            f'<h2>下一段故事，也有藷甜。</h2><p>讓好奇心繼續，翻開「{next_label}」。</p></div>'
                            f'<a class="btn btn-primary" href="{root}{next_slug}/{next_pages[0][1]}">探索下一章 <span aria-hidden="true">↗</span></a></aside>')
        prev_ = f'<a class="prev" href="{root}{slug}/{pages[page_idx-1][1]}"><span class="k">上一頁</span>{pages[page_idx-1][2]}</a>' if page_idx > 0 else "<span></span>"
        next_ = f'<a class="next" href="{root}{slug}/{pages[page_idx+1][1]}"><span class="k">下一頁</span>{pages[page_idx+1][2]}</a>' if page_idx < len(pages) - 1 else "<span></span>"
        pager = f'<nav class="pager" aria-label="上一頁／下一頁">{prev_}{next_}</nav>'
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="一口地瓜，一段土地的故事。跟著金山高中「地瓜金正讚」小組走進北海岸的田野與老街，翻開關於風土、滋味與在地日常的金山地瓜地方誌。">
<link rel="icon" type="image/svg+xml" href="{root}assets/img/brand-favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/site.css">
</head>
<body id="top"{theme_attrs}>
<a class="skip" href="#main">跳到主要內容</a>
<header class="site-header">
  <div class="edition-bar"><span>金山地瓜地方誌</span><span>一片土地・一群人・一顆地瓜</span><span>JINSHAN FIELD NOTES — 2015</span></div>
  <div class="bar">
    <a class="brand" href="{root}index.html" aria-label="{SITE} 首頁">{LOGO_MARK}<span class="wordmark"><span class="w1">來去金山</span><span class="w2">FUN 藷假</span></span></a>
    <nav class="top-nav" aria-label="主選單"><ul>{"".join(nav)}</ul></nav>
  </div>
</header>
<div class="page{' with-side' if side else ''}">
  {side}
  <main id="main">
{body_html}
{pager}
{chapter_continue}
  </main>
</div>
<footer class="site-footer">
  <div class="foot-grid">
    <div>
      <p class="foot-brand">{LOGO_MARK}<span>來去金山，FUN 藷假</span></p>
      <p class="foot-text">2015 台灣網界博覽會參賽作品，由新北市立金山高中「地瓜金正讚」小組製作，記錄金山地瓜的土地、人與故事。</p>
      <p class="foot-text"><a class="foot-legacy" href="{root}{LEGACY_DIR}/index.htm">瀏覽 2015 年原版網站 <span aria-hidden="true">↗</span></a></p>
    </div>
    <div>
      <p class="foot-title">專題單元</p>
      <ul class="foot-links">{"".join(f'<li><a href="{root}{s}/{p[0][1]}">{l}</a></li>' for s, l, _, p in SECTIONS)}</ul>
    </div>
    <div>
      <p class="foot-title">製作與授權</p>
      <p class="foot-text">指導老師：洪華欣、徐鳳英、黃美玲<br>研究完成：民國 104 年 2 月</p>
      <p class="foot-text">本網站採創用 CC 授權<br><img src="{root}assets/img/cc-by-nc-sa-88x31.png" alt="創用 CC 姓名標示－非商業性－相同方式分享" width="88" height="31"></p>
    </div>
  </div>
</footer>
<a class="to-top" href="#top" aria-label="回到頁首">▲</a>
<script src="{root}assets/site.js"></script>
</body>
</html>
"""

CHAPTER_COVERS = {'how': ('研究手記', '把好奇心，變成一場田野研究。', '從提問開始', '#efe7ed', '#79506c'), 'jinshan': ('山海散策', '沿著山與海，讀懂金山的模樣。', '跟著海風走', '#e5eadc', '#466046'), 'yam': ('滋味圖鑑', '剝開一顆地瓜，也翻開一段回憶。', '認識這一味', '#f2e2d5', '#965034'), 'sweet': ('田間觀察', '從一片葉子，看見土地的回答。', '走進地瓜田', '#e6ead5', '#476139'), 'money': ('老街尋味', '推開店門，遇見在地人的日常。', '聽地方說故事', '#f2e9ce', '#776032'), 'fun': ('動手玩藷', '沾點泥、起個火，把快樂端上桌。', '今天自己來', '#f1dfd5', '#965034'), 'people': ('人物誌', '每一份認真，都有一張熟悉的臉。', '遇見這群人', '#eee3e9', '#79506c'), 'about': ('幕後編輯室', '一趟探索，如何成為一本地方誌？', '翻開製作筆記', '#e3e8e5', '#42645b')}
COMPANIONS = {
    "how": ("紫藷研究員", "#95749a", "research"),
    "jinshan": ("黃藷小旅人", "#e6bd4c", "travel"),
    "yam": ("紅藷品味家", "#bd6b52", "taste"),
    "sweet": ("黃藷小農夫", "#e6bd4c", "garden"),
    "money": ("紫藷逛老街", "#95749a", "shop"),
    "fun": ("紅藷小廚師", "#bd6b52", "cook"),
    "people": ("黃藷記錄員", "#e6bd4c", "report"),
    "about": ("紫藷編輯室", "#95749a", "read"),
}

def chapter_drawing(slug):
    # One transparent illustrated sheet, four columns x two rows.
    index = list(COMPANIONS).index(slug)
    x = (index % 4) * 100 / 3
    y = (index // 4) * 100
    return (f'<span class="chapter-drawing" style="background-position:{x:.6f}% {y}%" '
            f'aria-hidden="true"></span>')

def build_index():
    cards = []
    for i, (slug, label, badge, pages) in enumerate(SECTIONS, 1):
        sub = "・".join(p[2] for p in pages)
        category, note, invitation, background, accent = CHAPTER_COVERS[slug]
        guide, skin, action = COMPANIONS[slug]
        cards.append(
            f'<a class="card card-{slug}" href="{slug}/{pages[0][1]}" style="--cover-bg:{background};--cover-accent:{accent}">'
            f'<span class="card-cover"><span class="card-num" aria-hidden="true">{i:02d}</span>'
            f'<span class="card-category">{category}</span>{chapter_drawing(slug)}</span>'
            f'<span class="card-content"><span class="card-guide" style="--guide-color:{skin}"><span aria-hidden="true"></span>{guide}</span><span class="card-title">{label}</span>'
            f'<span class="card-note">{note}</span><span class="card-sub">{sub}</span>'
            f'<span class="card-bottom"><span class="card-invitation">{invitation}</span>'
            f'<span class="card-pages">{len(pages):02d} 篇</span><span class="card-go" aria-hidden="true">↗</span></span></span></a>')
    body = (TOOL_DIR / "templates/home.html").read_text(encoding="utf-8")
    body = body.replace("{{ cards }}", "\n".join(cards))
    return page_shell("index.html", "金山地瓜地方誌｜把日子，過得藷甜。", body)

# ---------------------------------------------------------------- run
if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, "assets", "img", "nav"), exist_ok=True)
shutil.copy(os.path.join(ASSETS, "site.css"), os.path.join(OUT, "assets", "site.css"))
shutil.copy(os.path.join(ASSETS, "site.js"), os.path.join(OUT, "assets", "site.js"))
for brand_icon in ("brand-mark.svg", "brand-favicon.svg"):
    shutil.copy2(TOOL_DIR / "icons" / brand_icon, Path(OUT) / "assets/img" / brand_icon)
for artwork in (Path(ASSETS) / "img").glob("*.webp"):
    shutil.copy2(artwork, Path(OUT) / "assets/img" / artwork.name)
readme = TOOL_DIR / "README_site.md"
if readme.is_file():
    shutil.copy2(readme, Path(OUT) / "README.md")
for a in EXTRA_ASSETS:
    copy_asset(a)

report = []
for section in SECTIONS:
    slug, label, badge, pages = section
    copy_asset(badge)
    for i, (old, new, nlabel, h1, pbadge) in enumerate(pages):
        new_rel = f"{slug}/{new}"
        legacy_href = rel(new_rel, f"{LEGACY_DIR}/go/{slug}-{i+1}.htm")
        inner, st = convert_page(old, new_rel, h1)
        # Canonical polished articles are independent of the legacy Namo conversion.
        content_file = TOOL_DIR / "content" / new_rel
        if content_file.is_file():
            inner = content_file.read_text(encoding="utf-8")
        badge_html = ""
        if pbadge:
            b = copy_asset(pbadge)
            if b:
                badge_html = f'<img class="badge" src="{rel(new_rel, b)}" alt="" width="150" height="77">'
        category, note, invitation, background, accent = CHAPTER_COVERS[slug]
        guide, skin, action = COMPANIONS[slug]
        unit_number = SECTIONS.index(section) + 1
        body = (f'<nav class="article-breadcrumb" aria-label="麵包屑"><a href="../index.html">地方誌首頁</a>'
                f'<span aria-hidden="true">/</span><a href="1.html">{label}</a><span aria-hidden="true">/</span><span aria-current="page">{h1}</span></nav>'
                f'<header class="page-head article-cover"><div class="article-cover-text">'
                f'<p class="eyebrow">CHAPTER {unit_number:02d} <span aria-hidden="true">・</span> {category}</p>'
                f'<h1 class="page-title">{h1}</h1><p class="article-deck">{note}</p>'
                f'<div class="article-cover-meta"><span>{guide}陪你讀</span><span>{i+1:02d} / {len(pages):02d} 篇</span>'
                f'<a class="legacy-link" href="{legacy_href}">看 2015 原版 <span aria-hidden="true">↗</span></a></div></div>'
                f'<div class="article-portrait">{chapter_drawing(slug)}<span class="portrait-caption">{label}</span></div></header>\n'
                f'<article class="prose">\n{inner}\n</article>')
        out = page_shell(new_rel, f"{h1}｜{label}｜{SITE}", body, slug, section, i)
        os.makedirs(os.path.dirname(os.path.join(OUT, new_rel)), exist_ok=True)
        with open(os.path.join(OUT, new_rel), "w", encoding="utf-8") as f:
            f.write(out)
        report.append((old, new_rel, st))

with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
    f.write(build_index())
with open(os.path.join(OUT, "index.htm"), "w", encoding="utf-8") as f:   # keeps old deep links alive
    f.write('<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=index.html"><title>來去金山，FUN藷假</title></head><body><a href="index.html">前往新版首頁</a></body></html>\n')

# ---------------------------------------------------------------- the 2015 site, served next to the remake
# 2015-original stays untouched; this copy is build output and gets a return bar plus per-page entry framesets.
LEGACY_OUT = Path(OUT) / LEGACY_DIR
shutil.copytree(SRC, LEGACY_OUT, ignore=shutil.ignore_patterns(".*", "*.UAS", "*.uas"))

# Static hosts such as GitHub Pages send "text/html; charset=utf-8" for every page, which overrides the
# <meta charset=big5> inside the Big5-encoded unit framesets, so the copy is transcoded to UTF-8.
BIG5_META = re.compile(rb"charset=big5", re.I)
transcoded = 0
for legacy_page in sorted(LEGACY_OUT.rglob("*.htm")):
    data = legacy_page.read_bytes()
    if not BIG5_META.search(data):
        data.decode("utf-8")          # every non-Big5 page must already be valid UTF-8
        continue
    text = data.decode("cp950")       # strict: a bad byte should stop the build, not ship mojibake
    legacy_page.write_bytes(BIG5_META.sub(b"charset=utf-8", text.encode("utf-8")))
    transcoded += 1

def legacy_patch(rel_path, replacements):
    """Byte-level ASCII substitutions so Big5 and UTF-8 pages are handled alike; each must match exactly once."""
    target = LEGACY_OUT / rel_path
    data = target.read_bytes()
    for old, new in replacements:
        old_b, new_b = old.encode("utf-8"), new.encode("utf-8")
        assert data.count(old_b) == 1, f"{rel_path}: expected exactly one occurrence of {old!r}"
        data = data.replace(old_b, new_b)
    target.write_bytes(data)

def bar_frame(src):
    return f'<frame name="remake" scrolling="no" noresize marginwidth="0" marginheight="0" frameborder="0" src="{src}">'

(LEGACY_OUT / LEGACY_BAR).write_text(f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>2015 原版網站</title>
<style>
html, body {{ margin: 0; height: 100%; overflow: hidden; }}
body {{ font: 14px/1 "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; background: #2f4a36; color: #f6f1e5; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; white-space: nowrap; box-sizing: border-box; }}
a {{ color: #ffd86b; font-weight: 700; text-decoration: none; border: 1px solid #ffd86b; border-radius: 3px; padding: 6px 12px; flex: none; }}
a:hover {{ background: #ffd86b; color: #2f4a36; }}
@media (max-width: 640px) {{ span {{ display: none; }} }}
</style>
</head>
<body>
<span>這是 2015 年的原版網站（Namo WebEditor 頁框版，內容保留當年原樣）。</span>
<a id="back" href="../index.html" target="_top">回到 2026 重製版 ↗</a>
<script>
(function () {{
  var m = /[?&]to=([a-z]+\\/[0-9]+\\.html)(?:&|$)/.exec(location.search);
  if (!m) return;
  var a = document.getElementById("back");
  a.href = "../" + m[1];
  a.textContent = "回到 2026 重製版的這一頁 ↗";
}})();
</script>
</body>
</html>
""", encoding="utf-8")

legacy_patch("index.htm", [(
    '<p align="center"><b><span style="font-size:12pt;">建議最佳瀏覽解析度',
    '<p align="center"><a href="../index.html" style="font-size:14pt;">◎ 這是 2015 年的原版網站，點此前往 2026 年重製版</a></p>\n'
    '<p align="center"><b><span style="font-size:12pt;">建議最佳瀏覽解析度')])
legacy_patch("all-2.htm", [(
    '<frameset rows="32%, 68%" cols="1*" border="0">',
    f'<frameset rows="{LEGACY_BAR_ROWS}, 32%, 68%" cols="1*" border="0">{bar_frame(LEGACY_BAR)}')])
legacy_patch("narrative.htm", [(
    '<frameset rows="46%, 54%" cols="1*" border="0">',
    f'<frameset rows="{LEGACY_BAR_ROWS}, 46%, 54%" cols="1*" border="0">{bar_frame(LEGACY_BAR)}')])

def legacy_entry(title, rows, header_src, main_src, new_rel, main_attrs='scrolling="auto"'):
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>{title}｜{SITE}（2015 原版）</title>
</head>
<frameset rows="{LEGACY_BAR_ROWS}, {rows}" cols="1*" border="0">
{bar_frame(f"../{LEGACY_BAR}?to={new_rel}")}
<frame name="header" scrolling="no" marginwidth="10" marginheight="14" src="{header_src}" noresize>
<frame name="main" {main_attrs} marginwidth="10" marginheight="14" src="{main_src}">
<noframes>
<body>
<p><a href="{main_src}">{title}</a>（2015 原版）／<a href="../../{new_rel}">2026 重製版</a></p>
</body>
</noframes>
</frameset>
</html>
"""

(LEGACY_OUT / "go").mkdir()
legacy_entries = 0
for slug, label, badge, pages in SECTIONS:
    for i, (old, new, nlabel, h1, pbadge) in enumerate(pages):
        new_rel = f"{slug}/{new}"
        old_dir, old_name = os.path.split(old)
        if slug == "about":
            # narrative.htm: the "up.htm" header frame plus one of A–D.htm
            html_out = legacy_entry(h1, "46%, 54%", "../narrative-data/narrative-html/up.htm", f"../{old}", new_rel, 'scrolling="yes"')
        else:
            # all-2.htm: the switch.htm button bar plus the unit's own contents/detail frameset,
            # cloned so the detail frame opens on this page instead of the unit's first page.
            prefix = os.path.basename(old_dir).replace("-html", "")
            entry = f"{old_dir}/{prefix}-all-1.htm"
            assert (LEGACY_OUT / entry).is_file(), f"missing unit frameset {entry}"
            if i == 0:
                unit_src = entry
            else:
                unit_src = f"{old_dir}/go-{i+1}.htm"
                shutil.copy2(LEGACY_OUT / entry, LEGACY_OUT / unit_src)
                legacy_patch(unit_src, [(f'src="{os.path.basename(pages[0][0])}"', f'src="{old_name}"')])
            html_out = legacy_entry(h1, "32%, 68%", "../switch.htm", f"../{unit_src}", new_rel)
        (LEGACY_OUT / "go" / f"{slug}-{i+1}.htm").write_text(html_out, encoding="utf-8")
        legacy_entries += 1

# unreferenced originals (for the report only; the full original tree is backed up elsewhere)
all_src = {os.path.relpath(os.path.join(dp, f), SRC) for dp, _, fs in os.walk(SRC) for f in fs
           if not f.startswith(".") and not f.lower().endswith((".htm", ".uas"))}
used = {os.path.relpath(v, SRC) for v in copied.values()}
unused = sorted(all_src - used)

print(f"pages built: {len(report) + 1}   images copied: {len(copied)}   missing image refs: {len(missing_imgs)}")
print(f"2015 site copied to {LEGACY_DIR}/ ({transcoded} Big5 pages transcoded to UTF-8) with a return bar and {legacy_entries} per-page entry framesets in {LEGACY_DIR}/go/")
for old, new, st in report:
    print(f"  {old:46s} -> {new:14s} imgs={st['imgs']:3d} rows={st['rows']:3d} data-tables={st['data_tables']:2d} h2={st['h2']}")
if missing_imgs:
    print("missing image references (dropped):"); [print("   ", m) for m in missing_imgs]
print(f"original image files not referenced by any page (left out, kept in backup): {len(unused)}")
for u in unused: print("   ", u)
