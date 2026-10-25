#!/usr/bin/env python3
"""Apply copy edits to the deployed yam51103 pages.
Usage: apply_copy.py SITE_DIR edits_*.py ...
Each edits file defines EDITS = [(page, old_prefix, new_text), ...].
old_prefix: the start (>= 8 chars) of a paragraph / heading's text, unique within the page.
new_text: replacement text; "\n" becomes <br>. Inline markup inside the old block is dropped
(blocks that contain links or images are never touched, so nothing structural is lost)."""
import sys, os, re, html as htmlmod
from lxml import html

site = os.path.abspath(sys.argv[1])
EDITS = []
for f in sys.argv[2:]:
    ns = {}
    exec(open(f, encoding="utf-8").read(), ns)
    EDITS += ns["EDITS"]

def norm(s):
    return re.sub(r"[\s　]+", " ", s or "").strip()

def blocks(root):
    art = root.xpath("//article")[0]
    for el in art.iter("p", "h2"):
        yield el

changed = {}
problems = []
by_page = {}
for page, old, new in EDITS:
    by_page.setdefault(page, []).append((old, new))

for page, items in by_page.items():
    path = os.path.join(site, page)
    doc = html.parse(path)
    root = doc.getroot()
    for old, new in items:
        o = norm(old)
        hits = [el for el in blocks(root) if norm(el.text_content()).startswith(o)]
        if len(hits) != 1:
            problems.append((page, old[:30], len(hits))); continue
        el = hits[0]
        if el.xpath(".//a|.//img|.//table"):
            problems.append((page, old[:30], "has link/img")); continue
        for child in list(el):
            el.remove(child)
        el.text = None
        parts = new.split("\n")
        el.text = parts[0]
        for part in parts[1:]:
            br = html.Element("br"); br.tail = part; el.append(br)
        changed[page] = changed.get(page, 0) + 1
    # global polish on this page: drop full-width indents, normalise dashes/ellipses
    for el in blocks(root):
        if el.xpath(".//img"): continue
        if el.text: el.text = re.sub(r"^[\s　]+", "", el.text)
        for node in el.iter():
            for attr in ("text", "tail"):
                v = getattr(node, attr)
                if v:
                    v = v.replace("－－", "──").replace("...", "……").replace("。。", "。")
                    setattr(node, attr, v)
    for el in list(blocks(root)):             # paragraphs emptied by an edit
        if not norm(el.text_content()) and not el.xpath(".//img"):
            el.drop_tree()
    out = html.tostring(root, encoding="unicode", method="html", doctype="<!DOCTYPE html>")
    open(path, "w", encoding="utf-8").write(out)

total = sum(changed.values())
print(f"applied {total} edits across {len(changed)} pages")
for p, n in sorted(changed.items()): print(f"  {p}: {n}")
if problems:
    print(f"PROBLEMS ({len(problems)}):")
    for p in problems: print("  ", p)
