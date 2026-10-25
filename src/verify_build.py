from pathlib import Path
from lxml import html
from urllib.parse import urlsplit, unquote
import re, subprocess, sys, tempfile
base=Path(__file__).resolve().parents[1]
site=base/'site'
tool=Path(__file__).resolve().parent
temporary=tempfile.TemporaryDirectory(prefix='yam-verify-')
built=Path(temporary.name)/'site'
subprocess.run([sys.executable,str(tool/'build_yam.py'),str(base/'original'),str(built)],check=True,stdout=subprocess.DEVNULL)

for folder in (site,built):
 errors=[]
 for page in folder.rglob('*.html'):
  doc=html.fromstring(page.read_text())
  for value in doc.xpath('//@src | //@href'):
   u=urlsplit(value)
   if u.scheme or u.netloc:continue
   target=(page.parent/unquote(u.path)).resolve() if u.path else page
   if not target.exists():errors.append((str(page.relative_to(folder)),value))
   if u.fragment and target.suffix in ('.html','.htm') and target.exists():
    tree=html.fromstring(target.read_text())
    if not tree.xpath('//*[@id=$id or @name=$id]',id=unquote(u.fragment)):errors.append((str(page.relative_to(folder)),value))
 assert not errors,errors
 print(folder.name,': all local links, images and anchors exist')
for page in site.glob('*/*.html'):
 rebuilt=built/page.relative_to(site)
 a=html.fromstring(page.read_text()).xpath('//article')[0]
 b=html.fromstring(rebuilt.read_text()).xpath('//article')[0]
 assert re.sub(rb'>\s+<',b'><',html.tostring(a,with_tail=False))==re.sub(rb'>\s+<',b'><',html.tostring(b,with_tail=False)),str(page)
for filename in ('site.css','site.js'):
 assert (site/'assets'/filename).read_bytes()==(built/'assets'/filename).read_bytes()
home=html.fromstring((site/'index.html').read_text()).xpath('//main')[0]
built_home=html.fromstring((built/'index.html').read_text()).xpath('//main')[0]
def compact(el):return re.sub(r'>\s+<','><',html.tostring(el,encoding='unicode')).strip()
assert compact(home)==compact(built_home),'Home template differs'
print('Home, all 31 article bodies, CSS and JS match a clean rebuild')

for page in built.rglob('*.html'):
 assert page.read_bytes()==(site/page.relative_to(built)).read_bytes(),f"Output differs: {page.relative_to(built)}"
print('All 32 published HTML pages exactly match the clean build')
temporary.cleanup()
