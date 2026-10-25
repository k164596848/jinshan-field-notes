#!/usr/bin/env python3
"""Small structural touch-ups after apply_copy.py: promote label paragraphs to headings.
Usage: post_fixes.py SITE_DIR"""
import sys, os, re

site = sys.argv[1]
RULES = {
    "fun/2.html":    [(r"<p>焢窯需要的器材</p>", "<h2>焢窯需要的器材</h2>")],
    "fun/3.html":    [(r"<p>材料準備</p>", "<h3>材料準備</h3>")],
    "money/1.html":  [(r"<p>活動介紹</p>", "<h2>活動介紹</h2>")],
    "people/2.html": [(r"<p>(<b>)?參加心得：?(</b>)?</p>", "<h3>參加心得</h3>"),
                      (r"<p>(<b>)?給孩子們的話：?(</b>)?</p>", "<h3>給孩子們的話</h3>")],
    "people/1.html": [(r"<p>(<b>)?心得：?(</b>)?</p>", "<h3>心得</h3>")],
    "fun/1.html":    [(r"心得：</", "心得</")],
}
for page, rules in RULES.items():
    p = os.path.join(site, page)
    s = open(p, encoding="utf-8").read()
    for pat, rep in rules:
        s = re.sub(pat, rep, s)
    open(p, "w", encoding="utf-8").write(s)
print("post fixes applied to", len(RULES), "pages")
