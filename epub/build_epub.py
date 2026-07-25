#!/usr/bin/env python3
"""Build an EPUB from Anton Leicht's 'Politics & AI Policy' tagged posts."""
import json, os, re, hashlib, subprocess, uuid, zipfile, html, urllib.parse, io
from datetime import datetime, timezone
from bs4 import BeautifulSoup, NavigableString, Tag
import lxml.html
import lxml.etree as etree
from PIL import Image, ImageDraw, ImageFont

SCRATCH = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(SCRATCH, 'posts')
IMG_DIR = os.path.join(SCRATCH, 'images')
os.makedirs(IMG_DIR, exist_ok=True)

BOOK_TITLE = "Politics & AI Policy"
BOOK_SUBTITLE = "Essays from writing.antonleicht.me"
AUTHOR = "Anton Leicht"
SOURCE_URL = "https://writing.antonleicht.me/t/politics"
COMPILED = "2026-07-25"

# ---------------------------------------------------------------- load posts
posts = []
for fn in os.listdir(POSTS_DIR):
    d = json.load(open(os.path.join(POSTS_DIR, fn)))
    posts.append(d)
posts.sort(key=lambda p: p['post_date'])
print(f"Loaded {len(posts)} posts")

# ---------------------------------------------------------------- images
img_manifest = {}  # url -> (filename, media_type)

def fetch_image(src):
    if src in img_manifest:
        return img_manifest[src]
    h = hashlib.sha1(src.encode()).hexdigest()[:12]
    # Rewrite substackcdn transform to a bounded width
    url = src
    m = re.match(r'(https://substackcdn\.com/image/fetch/)([^/]*)/(.*)$', src)
    if m:
        inner = m.group(3)
        ext_m = re.search(r'\.(png|jpe?g|gif|webp|heic)(?:$|\?)', urllib.parse.unquote(inner), re.I)
        ext = (ext_m.group(1).lower() if ext_m else 'png')
        fmt = {'png': 'f_png', 'jpg': 'f_jpg', 'jpeg': 'f_jpg', 'gif': 'f_auto',
               'webp': 'f_png', 'heic': 'f_jpg'}[ext]
        url = f"{m.group(1)}w_1200,c_limit,{fmt},q_auto:good/{inner}"
    raw_path = os.path.join(IMG_DIR, h + '.bin')
    if not os.path.exists(raw_path):
        r = subprocess.run(['curl', '-sS', '--fail', '-L', url, '-o', raw_path],
                           capture_output=True, text=True)
        if r.returncode != 0:
            # fall back to the original src
            r2 = subprocess.run(['curl', '-sS', '--fail', '-L', src, '-o', raw_path],
                                capture_output=True, text=True)
            if r2.returncode != 0:
                print(f"  !! image failed: {src[:100]}")
                return None
    with open(raw_path, 'rb') as f:
        magic = f.read(16)
    if magic.startswith(b'\x89PNG'):
        ext, mt = 'png', 'image/png'
    elif magic.startswith(b'\xff\xd8'):
        ext, mt = 'jpg', 'image/jpeg'
    elif magic.startswith(b'GIF8'):
        ext, mt = 'gif', 'image/gif'
    elif magic[:4] == b'RIFF' and magic[8:12] == b'WEBP':
        # convert webp -> png for reader compatibility
        im = Image.open(raw_path).convert('RGBA')
        im.save(raw_path + '.png')
        os.replace(raw_path + '.png', raw_path)
        ext, mt = 'png', 'image/png'
    else:
        print(f"  !! unknown image type {magic[:8]} for {src[:80]}")
        ext, mt = 'png', 'image/png'
    fname = f"img_{h}.{ext}"
    final = os.path.join(IMG_DIR, fname)
    if not os.path.exists(final):
        os.link(raw_path, final)
    img_manifest[src] = (fname, mt)
    return img_manifest[src]

# ---------------------------------------------------------------- HTML cleaning
KEEP_ATTRS = {'href', 'src', 'alt', 'id', 'colspan', 'rowspan'}

def clean_body(body_html, slug):
    soup = BeautifulSoup(body_html, 'html.parser')

    # 1. Drop interactive/subscription cruft
    for sel in ['form', 'input', 'button', 'svg', 'script', 'style', 'audio', 'video']:
        for el in soup.find_all(sel):
            el.decompose()
    for cls in ['button-wrapper', 'subscription-widget-wrap', 'subscription-widget',
                'subscribe-widget', 'image-link-expand', 'poll-embed',
                'install-substack-app-embed']:
        for el in soup.find_all(class_=cls):
            el.decompose()

    # 2. Embedded publication cards -> simple linked paragraph
    for el in soup.find_all(class_='embedded-publication-wrap'):
        try:
            attrs = json.loads(el.get('data-attrs', '{}'))
            name = attrs.get('name', 'publication')
            base = attrs.get('base_url', '')
            p = soup.new_tag('p')
            p['class'] = 'embed-note'
            em = soup.new_tag('em')
            em.string = "[Embedded publication: "
            p.append(em)
            a = soup.new_tag('a', href=base) if base else soup.new_tag('em')
            a.string = name
            p.append(a)
            em2 = soup.new_tag('em'); em2.string = "]"
            p.append(em2)
            el.replace_with(p)
        except Exception:
            el.decompose()

    # 2b. Mentions (client-rendered, name lives in data-attrs) -> text/link
    for el in soup.find_all(class_='mention-wrap'):
        try:
            attrs = json.loads(el.get('data-attrs', '{}'))
            name = attrs.get('name', '').strip()
            url = attrs.get('url')
            if name and url:
                a = soup.new_tag('a', href=url)
                a.string = name
                el.replace_with(a)
            elif name:
                el.replace_with(NavigableString(name))
            else:
                el.decompose()
        except Exception:
            el.decompose()

    # 3. Digest post embeds (related-post cards) -> quoted teaser
    for el in soup.find_all(class_='digest-post-embed'):
        try:
            attrs = json.loads(el.get('data-attrs', '{}'))
            title = attrs.get('title', 'Related post')
            caption = attrs.get('caption', '')
            url = attrs.get('canonical_url') or attrs.get('url') or ''
            bq = soup.new_tag('blockquote')
            bq['class'] = 'embed-note'
            p1 = soup.new_tag('p')
            strong = soup.new_tag('strong')
            if url:
                a = soup.new_tag('a', href=url); a.string = title; strong.append(a)
            else:
                strong.string = title
            p1.append(strong)
            bq.append(p1)
            if caption:
                p2 = soup.new_tag('p')
                em = soup.new_tag('em'); em.string = caption
                p2.append(em)
                bq.append(p2)
            el.replace_with(bq)
        except Exception:
            el.decompose()

    # 4. iframes -> link
    for el in soup.find_all('iframe'):
        src = el.get('src', '')
        if src:
            p = soup.new_tag('p')
            a = soup.new_tag('a', href=src); a.string = f"[Embedded content: {src}]"
            p.append(a)
            el.replace_with(p)
        else:
            el.decompose()

    # 5. Figures -> clean <figure><img/><figcaption/></figure>
    for fig in soup.find_all('figure'):
        img = fig.find('img')
        cap = fig.find('figcaption')
        if img is None or not img.get('src'):
            fig.decompose()
            continue
        got = fetch_image(img['src'])
        if got is None:
            fig.decompose()
            continue
        fname, _ = got
        new_fig = soup.new_tag('figure')
        new_img = soup.new_tag('img', src=f"images/{fname}")
        new_img['alt'] = img.get('alt', '')
        new_fig.append(new_img)
        if cap and cap.get_text(strip=True):
            new_cap = soup.new_tag('figcaption')
            for child in list(cap.children):
                new_cap.append(child.extract() if isinstance(child, Tag) else NavigableString(str(child)))
            new_fig.append(new_cap)
        fig.replace_with(new_fig)

    # 6. Bare imgs outside figures
    for img in soup.find_all('img'):
        src = img.get('src', '')
        if src.startswith('images/'):
            continue
        if not src:
            img.decompose()
            continue
        got = fetch_image(src)
        if got is None:
            img.decompose()
            continue
        img.attrs = {'src': f"images/{got[0]}", 'alt': img.get('alt', '')}

    # 7. Footnote anchors: make sure they render superscript
    for a in soup.find_all('a', class_='footnote-anchor'):
        a.attrs = {'href': a.get('href', ''), 'id': a.get('id', ''), 'class': 'footnote-anchor'}
        if a.parent.name != 'sup':
            sup = soup.new_tag('sup')
            a.wrap(sup)

    # 8. Footnote blocks: normalize
    footnotes = soup.find_all('div', class_='footnote')
    if footnotes:
        section = soup.new_tag('section')
        section['class'] = 'footnotes'
        hr = soup.new_tag('hr')
        section.append(hr)
        h = soup.new_tag('h2'); h.string = "Notes"
        section.append(h)
        for fn in footnotes:
            num_a = fn.find('a', class_='footnote-number')
            content = fn.find('div', class_='footnote-content')
            wrap = soup.new_tag('div'); wrap['class'] = 'footnote-item'
            if num_a:
                wrap['id'] = num_a.get('id', '')
                a = soup.new_tag('a', href=num_a.get('href', ''))
                a['class'] = 'footnote-num'
                a.string = (num_a.get_text(strip=True) or '*') + '.'
                wrap.append(a)
            if content:
                for child in list(content.children):
                    wrap.append(child.extract())
            fn.extract()
            section.append(wrap)
        soup.append(section)

    # 9. Unwrap styling spans and stray anchors wrapping images
    for span in soup.find_all('span'):
        span.unwrap()
    for a in soup.find_all('a', class_='image-link'):
        a.unwrap()

    # 10. Attribute whitelist
    for el in soup.find_all(True):
        keep = {}
        for k, v in el.attrs.items():
            if k in KEEP_ATTRS:
                keep[k] = v
            elif k == 'class':
                cls = [c for c in (v if isinstance(v, list) else [v])
                       if c in ('footnote-anchor', 'footnote-item', 'footnote-num',
                                'footnotes', 'embed-note', 'image-caption')]
                if cls:
                    keep['class'] = cls
        el.attrs = keep

    # 11. Demote in-body h1 -> h2 (chapter title owns h1)
    for h1 in soup.find_all('h1'):
        h1.name = 'h2'

    # 12. Drop empty paragraphs / divs
    for el in soup.find_all(['p', 'div']):
        if not el.get_text(strip=True) and not el.find(['img', 'hr']):
            el.decompose()

    return str(soup)

def to_xhtml_fragment(html_str):
    """Parse an HTML fragment and serialize as well-formed XML."""
    root = lxml.html.fragment_fromstring(html_str, create_parent='div')
    out = []
    if root.text:
        out.append(html.escape(root.text))
    for child in root:
        out.append(etree.tostring(child, method='xml', encoding='unicode'))
    return ''.join(out)

XHTML_TMPL = '''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <title>{title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
{body}
</body>
</html>
'''

# ---------------------------------------------------------------- chapters
chapters = []  # (idx, filename, title, xhtml_bytes)
for i, p in enumerate(posts, 1):
    slug = p['slug']
    title = p['title'].strip()
    subtitle = (p.get('subtitle') or '').strip()
    date = datetime.fromisoformat(p['post_date'].replace('Z', '+00:00'))
    date_str = date.strftime('%B %-d, %Y')
    url = p['canonical_url']
    print(f"[{i:2d}] {title}")
    body_clean = clean_body(p['body_html'], slug)
    frag = to_xhtml_fragment(body_clean)
    header = f'<h1 class="chapter-title">{html.escape(title)}</h1>\n'
    if subtitle:
        header += f'<p class="chapter-subtitle"><em>{html.escape(subtitle)}</em></p>\n'
    header += (f'<p class="chapter-meta">{date_str} · '
               f'<a href="{html.escape(url)}">original post</a></p>\n<hr/>\n')
    doc = XHTML_TMPL.format(title=html.escape(title),
                            body=f'<section class="chapter">\n{header}{frag}\n</section>')
    # validate well-formedness
    etree.fromstring(doc.encode('utf-8'))
    fname = f"ch{i:02d}_{slug[:40]}.xhtml"
    chapters.append((i, fname, title, date_str, doc.encode('utf-8')))

# ---------------------------------------------------------------- cover
def make_cover():
    W, H = 1600, 2560
    bg = (26, 32, 44)       # dark slate
    accent = (214, 158, 46)  # warm gold
    fg = (240, 238, 230)
    im = Image.new('RGB', (W, H), bg)
    dr = ImageDraw.Draw(im)
    serif_b = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
    serif = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
    serif_i = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'
    f_title = ImageFont.truetype(serif_b, 150)
    f_amp = ImageFont.truetype(serif_i if os.path.exists(serif_i) else serif, 120)
    f_sub = ImageFont.truetype(serif, 64)
    f_auth = ImageFont.truetype(serif_b, 92)
    f_small = ImageFont.truetype(serif, 52)
    dr.rectangle([120, 200, 1480, 214], fill=accent)
    y = 420
    for line, f in [("Politics", f_title), ("&", f_amp), ("AI Policy", f_title)]:
        w = dr.textlength(line, font=f)
        dr.text(((W - w) / 2, y), line, font=f, fill=fg)
        y += int(f.size * 1.35)
    y += 90
    for line in ["Twenty-two essays on the politics", "of artificial intelligence"]:
        w = dr.textlength(line, font=f_sub)
        dr.text(((W - w) / 2, y), line, font=f_sub, fill=(180, 184, 196))
        y += 92
    w = dr.textlength(AUTHOR, font=f_auth)
    dr.text(((W - w) / 2, 1880), AUTHOR, font=f_auth, fill=accent)
    tagline = "writing.antonleicht.me · 2025–2026"
    w = dr.textlength(tagline, font=f_small)
    dr.text(((W - w) / 2, 2060), tagline, font=f_small, fill=(150, 155, 170))
    dr.rectangle([120, 2346, 1480, 2360], fill=accent)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()

cover_png = make_cover()

# ---------------------------------------------------------------- static files
CSS = '''
body { font-family: serif; line-height: 1.55; margin: 0 5%; }
h1.chapter-title { font-size: 1.7em; margin-bottom: 0.2em; }
p.chapter-subtitle { font-size: 1.15em; color: #555; margin-top: 0; }
p.chapter-meta { font-size: 0.85em; color: #777; }
h2 { font-size: 1.3em; margin-top: 1.4em; }
h3 { font-size: 1.15em; }
figure { margin: 1.4em 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; }
figcaption, .image-caption { font-size: 0.85em; color: #666; margin-top: 0.4em; text-align: center; }
blockquote { margin: 1.2em 1.5em; font-style: normal; border-left: 3px solid #ccc; padding-left: 1em; }
blockquote.embed-note { border-left: 3px solid #d69e2e; background: #faf7f0; padding: 0.6em 1em; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em auto; width: 60%; }
a.footnote-anchor { text-decoration: none; font-size: 0.8em; }
section.footnotes { font-size: 0.9em; }
section.footnotes h2 { font-size: 1.1em; }
.footnote-item { margin: 0.7em 0; }
a.footnote-num { text-decoration: none; font-weight: bold; margin-right: 0.35em; }
.titlepage { text-align: center; margin-top: 18%; }
.titlepage h1 { font-size: 2.3em; margin-bottom: 0.1em; }
.titlepage .subtitle { font-size: 1.2em; color: #555; }
.titlepage .author { font-size: 1.4em; margin-top: 2.5em; }
.titlepage .note { font-size: 0.85em; color: #777; margin-top: 4em; }
.toc-date { color: #888; font-size: 0.85em; }
'''

titlepage = XHTML_TMPL.format(title=html.escape(BOOK_TITLE), body=f'''
<section class="titlepage">
  <h1>Politics &amp; AI Policy</h1>
  <p class="subtitle">Twenty-two essays on the politics of artificial intelligence</p>
  <p class="author">{AUTHOR}</p>
  <p class="note">Compiled on {COMPILED} from the
  <a href="{SOURCE_URL}">Politics &amp; AI Policy</a> tag at writing.antonleicht.me.<br/>
  All essays © {AUTHOR}. Compiled for personal reading.</p>
</section>''')
etree.fromstring(titlepage.encode())

nav_items = '\n'.join(
    f'      <li><a href="{fname}">{html.escape(t)}</a></li>'
    for _, fname, t, _, _ in chapters)
nav = f'''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><title>Contents</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
      <li><a href="titlepage.xhtml">Title Page</a></li>
{nav_items}
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden="hidden">
    <ol>
      <li><a epub:type="cover" href="cover.xhtml">Cover</a></li>
      <li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>
      <li><a epub:type="bodymatter" href="{chapters[0][1]}">Start of Content</a></li>
    </ol>
  </nav>
</body>
</html>'''
etree.fromstring(nav.encode())

cover_xhtml = XHTML_TMPL.format(title="Cover", body='''
<div style="text-align:center; margin:0; padding:0;">
  <img src="images/cover.png" alt="Politics &amp; AI Policy — Anton Leicht" style="max-width:100%; max-height:100%;"/>
</div>''')
etree.fromstring(cover_xhtml.encode())

# ---------------------------------------------------------------- OPF + NCX
book_id = str(uuid.uuid5(uuid.NAMESPACE_URL, SOURCE_URL))
modified = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

img_items = '\n'.join(
    f'    <item id="im{i}" href="images/{fname}" media-type="{mt}"/>'
    for i, (fname, mt) in enumerate(sorted(set(img_manifest.values()))))
ch_items = '\n'.join(
    f'    <item id="c{i}" href="{fname}" media-type="application/xhtml+xml"/>'
    for i, fname, *_ in chapters)
ch_spine = '\n'.join(f'    <itemref idref="c{i}"/>' for i, *_ in chapters)

opf = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:{book_id}</dc:identifier>
    <dc:title id="title">{html.escape(BOOK_TITLE)}</dc:title>
    <dc:creator id="author">{AUTHOR}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>{COMPILED}</dc:date>
    <dc:publisher>writing.antonleicht.me</dc:publisher>
    <dc:description>{html.escape("Twenty-two essays on the politics of artificial intelligence, compiled from the 'Politics &amp; AI Policy' tag of Anton Leicht's newsletter.")}</dc:description>
    <dc:source>{SOURCE_URL}</dc:source>
    <meta property="dcterms:modified">{modified}</meta>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="cover-img" href="images/cover.png" media-type="image/png" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>
{ch_items}
{img_items}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover" linear="no"/>
    <itemref idref="titlepage"/>
    <itemref idref="nav"/>
{ch_spine}
  </spine>
</package>'''
etree.fromstring(opf.encode())

ncx_points = '\n'.join(f'''    <navPoint id="np{i}" playOrder="{i + 1}">
      <navLabel><text>{html.escape(t)}</text></navLabel>
      <content src="{fname}"/>
    </navPoint>''' for i, fname, t, _, _ in chapters)
ncx = f'''<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:{book_id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{html.escape(BOOK_TITLE)}</text></docTitle>
  <navMap>
    <navPoint id="np-title" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>
{ncx_points}
  </navMap>
</ncx>'''
etree.fromstring(ncx.encode())

# ---------------------------------------------------------------- zip it
out_path = os.path.join(SCRATCH, 'ai-politics-and-policy-anton-leicht.epub')
container = '''<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>'''

with zipfile.ZipFile(out_path, 'w') as z:
    z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', zipfile.ZIP_STORED)
    z.writestr('META-INF/container.xml', container, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/content.opf', opf, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/nav.xhtml', nav, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/toc.ncx', ncx, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/style.css', CSS, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/titlepage.xhtml', titlepage, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/cover.xhtml', cover_xhtml, zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/images/cover.png', cover_png, zipfile.ZIP_DEFLATED)
    for _, fname, _, _, data in chapters:
        z.writestr(f'OEBPS/{fname}', data, zipfile.ZIP_DEFLATED)
    for fname, mt in sorted(set(img_manifest.values())):
        z.write(os.path.join(IMG_DIR, fname), f'OEBPS/images/{fname}', zipfile.ZIP_DEFLATED)

size = os.path.getsize(out_path)
print(f"\nWrote {out_path} ({size/1024/1024:.1f} MB), {len(chapters)} chapters, {len(set(img_manifest.values()))} images")
