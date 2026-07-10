#!/usr/bin/env python3
"""Build the ChinaTalk analytics data files from public sources.

Sources:
  1. Megaphone podcast RSS feed (full episode archive with durations)
  2. Substack archive API at chinatalk.media (posts, tags, bylines, engagement)

Usage:
  python3 build_data.py --fetch     # re-download both sources, then build
  python3 build_data.py             # build from cached raw/ files

Outputs JSON into ../data/ . Everything downstream (index.html + app.js)
is static; re-running this script is the whole refresh story.
"""

import argparse
import html
import json
import re
import time
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
OUT = HERE.parent / "data"

PODCAST_FEED = "https://feeds.megaphone.fm/CHTAL4990341033"
ARCHIVE_API = "https://www.chinatalk.media/api/v1/archive?sort=new&offset={offset}&limit=50"
UA = {"User-Agent": "Mozilla/5.0 (chinatalk-analytics builder)"}


# ---------------------------------------------------------------- fetch

def fetch_raw():
    RAW.mkdir(exist_ok=True)
    req = urllib.request.Request(PODCAST_FEED, headers=UA)
    with urllib.request.urlopen(req) as r:
        (RAW / "megaphone.xml").write_bytes(r.read())
    print("fetched podcast feed")

    posts, offset = [], 0
    while True:
        req = urllib.request.Request(ARCHIVE_API.format(offset=offset), headers=UA)
        with urllib.request.urlopen(req) as r:
            batch = json.load(r)
        if not batch:
            break
        posts.extend(batch)
        offset += len(batch)
        print(f"archive offset {offset}", flush=True)
        time.sleep(0.4)
    (RAW / "substack_archive.json").write_text(json.dumps(posts))
    print(f"fetched {len(posts)} substack posts")


def fetch_bodies():
    """Fetch full body_html for every archive post (transcripts live here).

    Paid-only posts return just the free preview. Results accumulate in
    raw/post_bodies.jsonl keyed by slug; already-fetched slugs are skipped,
    so the fetch is resumable.
    """
    posts = json.loads((RAW / "substack_archive.json").read_text())
    out = RAW / "post_bodies.jsonl"
    done = set()
    if out.exists():
        for line in out.read_text().splitlines():
            try:
                done.add(json.loads(line)["slug"])
            except (ValueError, KeyError):
                pass
    todo = [p["slug"] for p in posts if p.get("slug") and p["slug"] not in done]
    print(f"fetching {len(todo)} post bodies ({len(done)} cached)")
    with out.open("a") as f:
        for i, slug in enumerate(todo):
            url = f"https://www.chinatalk.media/api/v1/posts/{slug}"
            for attempt in range(5):
                try:
                    req = urllib.request.Request(url, headers=UA)
                    with urllib.request.urlopen(req, timeout=30) as r:
                        d = json.load(r)
                    f.write(json.dumps({"slug": slug, "body_html": d.get("body_html") or ""}) + "\n")
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 429:  # rate limited: back off hard and retry
                        time.sleep(15 * (attempt + 1))
                        continue
                    print(f"  FAILED {slug}: {e}", flush=True)
                    break
                except Exception as e:  # noqa: BLE001 - keep going, log the slug
                    print(f"  FAILED {slug}: {e}", flush=True)
                    break
            else:
                print(f"  FAILED {slug}: still rate-limited", flush=True)
            if i % 50 == 0:
                print(f"  {i}/{len(todo)}", flush=True)
                f.flush()
            time.sleep(0.8)
    print("bodies done")


# ---------------------------------------------------------------- helpers

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def strip_html(s):
    if not s:
        return ""
    s = re.sub(r"<br\s*/?>|</p>|</li>", " ", s, flags=re.I)
    return WS_RE.sub(" ", html.unescape(TAG_RE.sub(" ", s))).strip()


def norm_title(t):
    t = re.sub(r"[^a-z0-9 ]", " ", (t or "").lower())
    return WS_RE.sub(" ", t).strip()


def d_median(vals):
    vals = sorted(vals)
    return vals[len(vals) // 2] if vals else 0


def quarter(iso_date):
    y, m = int(iso_date[:4]), int(iso_date[5:7])
    return f"{y}-Q{(m - 1) // 3 + 1}"


def parse_rss_field(item, tag):
    m = re.search(rf"<{tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{tag}>", item, re.S)
    return html.unescape(m.group(1).strip()) if m else None


# ------------------------------------------------------- guest extraction

# Words that disqualify a candidate token sequence from being a person name.
NOT_NAME = {
    "the", "a", "an", "china", "chinese", "chip", "chips", "war", "ai",
    "america", "american", "taiwan", "japan", "korea", "india", "russia",
    "emergency", "pod", "podcast", "special", "part", "live", "wartalk",
    "overfit", "inside", "beyond", "how", "why", "what", "who", "when",
    "new", "big", "great", "quantum", "trade", "tech", "silicon", "state",
    "defense", "defence", "export", "nuclear", "rare", "open", "deep",
    # topical title words that pattern-match as name tokens
    "aerial", "acrobatics", "after", "allied", "scale", "blockchain",
    "chicken", "farm", "clashes", "crossover", "episode", "standards",
    "global", "hot", "space", "summer", "incoming", "industrial", "policy",
    "invasion", "land", "wars", "national", "intel", "council", "rainbow",
    "farts", "red", "roulette", "presidential", "elections", "showdown",
    "superpower", "hearing", "twilight", "struggle", "pla", "tiktok",
    "hot", "talk", "econtalk", "chinaecontalk", "semianalysis",
}

# Recurring show segments and title phrases that pattern-match as names.
NOT_GUEST = {
    "second breakfast", "transistor radio", "wartalk", "overfit",
    "emergency pod", "rickover's playbook", "rickover’s playbook",
    "china talk", "chinatalk", "economic warfare", "concrete avalanche",
    "silicon valley", "wall street", "hong kong", "south china",
    # the host is not a guest
    "jordan schneider", "jordan",
}

# Leading honorifics stripped so "Sen. Chris Murphy" == "Chris Murphy".
HONORIFIC_RE = re.compile(
    r"^(?:sen\.?|rep\.?|amb\.?|gen\.?|adm\.?|dr\.?|fmr\.?|ltg|maj\.?|col\.?|secaf|secdef|sec\.?|professor|prof\.?)\s+",
    re.I,
)


def clean_guest(name):
    n = WS_RE.sub(" ", name).strip(" ,.")
    n = re.sub(r"^and\s+", "", n, flags=re.I)
    # "Sinocism's Bill Bishop" -> "Bill Bishop"
    n = re.sub(r"^[A-Z][\w.-]*[’']s\s+", "", n)
    while True:
        stripped = HONORIFIC_RE.sub("", n)
        if stripped == n:
            break
        n = stripped
    words = n.split()
    if n.lower() in NOT_GUEST or len(words) < 2:
        return None
    if any(w.strip(".,'’").lower() in NOT_NAME for w in words):
        return None
    return n


def looks_like_name(s):
    toks = s.replace("&", " and ").replace("+", " and ").split(" and ")
    for part in toks:
        words = part.strip().split()
        if not 1 <= len(words) <= 4:
            return False
        for w in words:
            wl = w.strip(".,'’").lower()
            if wl in NOT_NAME:
                return False
            if not re.match(r"^[A-Z][\w.'’-]*$", w.strip(",")):
                return False
    return True


def split_names(s):
    s = re.sub(r"\s*(?:&|\+|,| and )\s*", "|", s)
    return [WS_RE.sub(" ", n).strip(" ,.") for n in s.split("|") if n.strip(" ,.")]


# A personal name: 2-4 capitalized tokens.
NAME_PAT = r"[A-Z][\w'’.-]+(?: [A-Z][\w'’.-]+){1,3}"
# A list of names: "A", "A and B", "A, B and C"
NAME_LIST = rf"{NAME_PAT}(?:(?:,| and | & | \+ )\s*{NAME_PAT})*"

DESC_GUEST_RES = [
    # "Constanza Vidal Bustamante joins Chris Miller and Zachary Yerushalmi"
    re.compile(rf"({NAME_LIST})(?:,[^.!?]{{0,90}}?)? join(?:s|ed)?\b", ),
    re.compile(rf"\bjoin(?:s|ed)? (?:me|us|by)?\s*({NAME_LIST})"),
    # "interviewed Ian Toll", "sat down with Mike Schmidt and Todd Fisher"
    re.compile(rf"(?:interview(?:s|ed)?|sat down with|sits? down with|in person with|talk(?:s|ed)? (?:to|with)|"
               rf"chat(?:s|ted)? with|conversation with|joined by|welcome(?:s|d)?(?: back)?|features?|featuring)\s+"
               rf"(?:[a-z][\w'’-]*\s+){{0,2}}({NAME_LIST})"),
    # "Chris Miller (chip wars), Chris McGuire (10 year vet) and I discuss"
    re.compile(rf"({NAME_PAT})\s*\([^)]{{2,60}}\)(?:,\s*({NAME_PAT})\s*\([^)]{{2,60}}\))*[^.!?]{{0,40}}?\band I\b"),
    # "X returns to the show / is back on the show"
    re.compile(rf"({NAME_LIST})(?:,[^.!?]{{0,60}}?)? (?:returns?|is back|came back|comes? back)\b"),
    # "our guest(s) X" / "today's guest, X"
    re.compile(rf"guests?,?\s+(?:is|are|:)?\s*({NAME_LIST})"),
]


def extract_guests_from_desc(desc):
    """Pull guest names out of show-notes prose (the first ~700 chars,
    where the guest intro lives)."""
    head = desc[:700]
    names = []
    for rx in DESC_GUEST_RES:
        for m in rx.finditer(head):
            for grp in m.groups():
                if grp:
                    names.extend(split_names(grp))
    return [g for g in (clean_guest(n) for n in names) if g]


def extract_guests(title):
    """Conservative guest extraction from an episode title."""
    t = title.strip()
    names = []
    # "... with First Last" / "... feat. First Last" / "... ft. First Last"
    m = re.search(r"(?:\bwith|\bfeat\.?|\bft\.)\s+([A-Z][\w.'’-]+(?:[\s,&+]+(?:and\s+)?[A-Z][\w.'’-]+)*)\s*$", t)
    if m and looks_like_name(m.group(1)):
        names = split_names(m.group(1))
    if not names:
        # "First Last on Topic" / "First Last and First Last on Topic"
        m = re.match(r"^([A-Z][\w.'’-]+(?:[\s,&+]+(?:and\s+)?[A-Z][\w.'’-]+){0,5})\s+on\s+", t)
        if m and looks_like_name(m.group(1)):
            names = split_names(m.group(1))
    if not names:
        # "First Last: Topic" (require 2-3 words, all name-shaped)
        m = re.match(r"^([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){1,2}):\s", t)
        if m and looks_like_name(m.group(1)):
            names = split_names(m.group(1))
    return [g for g in (clean_guest(n) for n in names) if g]


# ----------------------------------------------------------- topic groups

# Substack tags grouped into families for coloring / rollups. Tags not
# listed fall into "Other". Assignments follow how the show itself uses
# the tags, not any external taxonomy.
# Eight families + "Other" so each family keeps a fixed categorical color.
TAG_GROUPS = {
    "AI": ["AI", "AGI", "OpenAI", "DeepSeek", "Data Centers", "Compute"],
    "Semiconductors": ["Semiconductors", "Export Controls", "Huawei", "TSMC", "Nvidia", "Chips", "SMIC", "Intel"],
    "US-China & Trade": ["US-China", "Trade", "Tariffs", "Decoupling", "TikTok", "Diplomacy"],
    "Chinese Politics": ["Chinese Politics", "CCP", "Xi Jinping", "Xi", "Chinese History", "Chinese Economy", "Hong Kong", "Zero Covid", "Censorship"],
    "Geopolitics & Defense": ["War", "Military", "PLA", "Drones", "Ukraine", "Nuclear", "Defense Tech", "Taiwan", "Japan", "Korea", "India", "Southeast Asia", "Europe", "Russia", "Iran"],
    "US Policy": ["US Politics + Policy", "Industrial Policy", "Immigration", "Antitrust", "Congress", "Trump", "Biden", "S&T Policy"],
    "Tech & Industry": ["Tech", "EVs", "Energy", "Biotech", "Space", "Quantum", "Robotics", "Manufacturing", "Venture Capital", "Emerging Technology", "Industry", "Economics"],
    "Culture & History": ["History", "Culture", "Books", "Film", "Music", "Best Of", "Society", "Arts + Culture", "Cold War", "Event"],
}
TAG_TO_GROUP = {t.lower(): g for g, ts in TAG_GROUPS.items() for t in ts}

# Keyword topic taxonomy. Substack's editorial tags only begin in 2023,
# so full-archive topic trends (2017->today) come from classifying each
# item's title + description text against these patterns. Items can match
# several topics; unmatched items count as "Other".
TOPIC_TAXONOMY = [
    ("AI", r"\bAI\b|artificial intelligence|machine learning|\bLLMs?\b|\bAGI\b|openai|deepseek|anthropic|chatbot|\bGPT|data center|\bcompute\b|algorithm"),
    ("Semiconductors", r"semiconductor|\bchips?\b|\bfabs?\b|tsmc|\bsmic\b|nvidia|intel\b|\basml\b|\beuv\b|lithograph|export control|huawei|micron|foundry"),
    ("Trade & Economics", r"trade war|tariff|econom|\bGDP\b|supply chain|manufactur|decoupl|de-risk|currency|yuan|\bRMB\b|market|invest|financ|banking|property|real estate|evergrande|debt|growth|\bWTO\b|entrepreneur"),
    ("US-China Relations", r"us-china|u\.s\.[\s-]china|china relations|bilateral|engagement|diplomacy|diplomatic|summit|cold war"),
    ("Chinese Politics", r"\bCCP\b|communist party|xi jinping|politburo|party congress|two sessions|propaganda|censor|\bmao\b|deng xiaoping|bo xilai|united front|corruption|zhongnanhai|beijing|tiananmen|xinjiang|uyghur|protest|governance"),
    ("Military & War", r"militar|\bPLA\b|\bwar\b|warfare|defense|defence|missile|nuclear|drone|navy|naval|battleship|army|invasion|pentagon|\bNATO\b|\bNDAA\b|deterrence|weapon|\bCIA\b|intelligence|espionage|\bspy\b"),
    ("Taiwan", r"taiwan|cross-strait|taipei"),
    ("US Policy", r"congress|washington|white house|biden|trump|obama|sanction|chips act|industrial policy|senate|state department|commerce department|national security|think tank|\bCSET\b|foreign aid|\bUSAID\b|competitiveness"),
    ("Tech Industry", r"tiktok|bytedance|tencent|alibaba|baidu|internet|startup|e-?commerce|social media|platform|app\b|gaming|xiaomi|wechat|cyber|data policy|privacy|spacex|innovation|robot"),
    ("Society & Culture", r"culture|history|film|movie|\bTV\b|drama|anime|music|book|poetry|novel|food|youth|feminis|society|religion|education|language|literature|dynasty|warring states|confuci"),
    ("Energy & Climate", r"energy|climate|solar|\bEVs?\b|electric vehicle|battery|batteries|\bBYD\b|coal|oil\b|renewable|power grid|rare earth"),
    ("Rest of Asia & World", r"japan|korea|india|russia|europe|southeast asia|vietnam|philippines|australia|africa|middle east|iran|israel|ukraine|great power|grand strategy|geopolit"),
    ("Covid & Health", r"covid|pandemic|vaccine|lockdown|quarantine|public health|virus"),
]


def classify(text):
    hits = [name for name, pat in TOPIC_RES if pat.search(text)]
    return hits or ["Other"]


TOPIC_RES = [(name, re.compile(pat, re.I)) for name, pat in TOPIC_TAXONOMY]

# Public figures tracked in the People/Language views, counted over the
# full newsletter corpus (which includes the podcast transcripts).
PEOPLE = [
    ("Xi Jinping", r"xi jinping|\bxi\b(?!['’]an)"),
    ("Donald Trump", r"\btrump\b"),
    ("Joe Biden", r"\bbiden\b"),
    ("Mao Zedong", r"\bmao\b"),
    ("Deng Xiaoping", r"\bdeng\b"),
    ("Vladimir Putin", r"\bputin\b"),
    ("Elon Musk", r"elon musk|\bmusk\b"),
    ("Jack Ma", r"jack ma\b"),
    ("Sam Altman", r"sam altman|\baltman\b"),
    ("Jensen Huang", r"jensen huang|\bjensen\b"),
    ("Morris Chang", r"morris chang"),
    ("Li Qiang", r"li qiang"),
    ("Li Keqiang", r"li keqiang"),
    ("Jake Sullivan", r"jake sullivan"),
    ("Nancy Pelosi", r"pelosi"),
    ("Wang Huning", r"wang huning"),
    ("Zhou Enlai", r"zhou enlai"),
    ("Henry Kissinger", r"kissinger"),
    ("Chiang Kai-shek", r"chiang kai-?shek"),
    ("Volodymyr Zelensky", r"zelensky|zelenskyy"),
    ("Kevin Xu", r"kevin xu"),
    ("Chris Miller", r"chris miller"),
    ("Dan Wang", r"dan wang"),
]

# Entities for the co-mention map, all counted from full text.
# Groups are the map's color families (≤ 8).
ENTITIES = {
    "Companies": [
        ("Huawei", r"huawei"), ("TSMC", r"tsmc"), ("Nvidia", r"nvidia"),
        ("SMIC", r"\bsmic\b"), ("Intel", r"\bintel\b"), ("ASML", r"\basml\b"),
        ("OpenAI", r"openai"), ("DeepSeek", r"deepseek"), ("Anthropic", r"anthropic|claude"),
        ("Google", r"google"), ("Apple", r"\bapple\b"), ("Microsoft", r"microsoft"),
        ("Tencent", r"tencent"), ("Alibaba", r"alibaba"), ("TikTok / ByteDance", r"tiktok|bytedance"),
        ("BYD", r"\bbyd\b"), ("SpaceX", r"spacex"), ("Samsung", r"samsung"),
    ],
    "Countries & Regions": [
        ("Taiwan", r"taiwan"), ("Japan", r"japan"), ("Korea", r"\bkorea"),
        ("India", r"\bindia\b"), ("Russia", r"russia"), ("Ukraine", r"ukraine"),
        ("Iran", r"\biran\b"), ("Israel", r"israel"), ("Europe / EU", r"europe|\bEU\b"),
        ("Hong Kong", r"hong kong"), ("Xinjiang", r"xinjiang|uyghur"),
        ("Vietnam", r"vietnam"),
    ],
    "People": [
        ("Xi Jinping", r"xi jinping|\bxi\b(?!['’]an)"), ("Trump", r"\btrump\b"),
        ("Biden", r"\bbiden\b"), ("Mao", r"\bmao\b"), ("Deng Xiaoping", r"\bdeng\b"),
        ("Putin", r"\bputin\b"), ("Jensen Huang", r"jensen huang|\bjensen\b"),
        ("Sam Altman", r"sam altman|\baltman\b"), ("Elon Musk", r"elon|\bmusk\b"),
    ],
    "Technology": [
        ("AI / AGI", r"\bAI\b|artificial intelligence|\bAGI\b|\bLLMs?\b"),
        ("Chips", r"semiconductor|\bchips?\b|\bfabs?\b"),
        ("EUV / lithography", r"\beuv\b|lithograph"),
        ("Drones", r"\bdrones?\b"), ("Nuclear", r"nuclear"),
        ("EVs / batteries", r"\bEVs?\b|electric vehicle|batter(?:y|ies)"),
        ("Rare earths", r"rare earth"), ("Quantum", r"quantum"),
        ("Open source", r"open[- ]source"), ("Data centers", r"data cent(?:er|re)s?"),
    ],
    "Policy & Institutions": [
        ("Export controls", r"export control"), ("Tariffs", r"tariff"),
        ("Sanctions", r"sanction"), ("CHIPS Act", r"chips act"),
        ("Congress", r"congress"), ("Pentagon / DoD", r"pentagon|department of defense|\bDoD\b"),
        ("CCP", r"\bCCP\b|communist party"), ("PLA", r"\bPLA\b"),
        ("CIA / intel community", r"\bCIA\b|intelligence community"),
        ("NATO", r"\bNATO\b"),
    ],
}

# Link hosts that are plumbing rather than citations.
LINK_SKIP = {
    "chinatalk.media", "www.chinatalk.media", "substackcdn.com",
    "substack.com", "www.substack.com", "email.mg1.substack.com",
    "chinatalk.substack.com", "api.substack.com",
    "link.chtbl.com",  # Chartable smart links to the show's own episodes
}

HREF_RE = re.compile(r'<a[^>]+href="(https?://[^"#]+)', re.I)


HOST_ALIAS = {
    "x.com": "twitter / x.com", "twitter.com": "twitter / x.com",
    "a.co": "amazon.com", "amzn.to": "amazon.com",
    "youtu.be": "youtube.com", "m.youtube.com": "youtube.com",
    "en.m.wikipedia.org": "en.wikipedia.org",
}


def link_host(url):
    m = re.match(r"https?://([^/]+)", url)
    if not m:
        return None
    host = m.group(1).lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return HOST_ALIAS.get(host, host)


# Terms tracked in the Language view. Each entry: display label, regex.
TERMS = [
    ("AI", r"\bAI\b|artificial intelligence"),
    ("Chips & semis", r"semiconductor|\bchips?\b|\bfabs?\b"),
    ("Export controls", r"export control"),
    ("Taiwan", r"taiwan"),
    ("Huawei", r"huawei"),
    ("TikTok", r"tiktok"),
    ("Tariffs / trade war", r"tariff|trade war"),
    ("DeepSeek", r"deepseek"),
    ("Nvidia", r"nvidia"),
    ("TSMC", r"tsmc"),
    ("Rare earths", r"rare earth"),
    ("Drones", r"drone"),
    ("Ukraine", r"ukraine"),
    ("EVs / BYD", r"\bEVs?\b|electric vehicle|\bBYD\b"),
    ("Industrial policy", r"industrial policy"),
    ("PLA / military", r"\bPLA\b|military"),
    ("Hong Kong", r"hong kong"),
    ("Covid", r"covid|pandemic|wuhan virus|coronavirus"),
    ("OpenAI", r"openai"),
]

STOPWORDS = set("""a an and are as at be but by for from has have how in is it its
of on or that the this to was what when where which who why will with vs v not
we our your you i they their his her he she new can do does did more most into
s t re ll d o m th us about after all also am been before being between both
each few had if just like me my no now only other out over own same so some
such than then there these those through too under until up very were""".split())


# ---------------------------------------------------------------- build

def build():
    OUT.mkdir(exist_ok=True)

    # ---- podcast episodes -------------------------------------------
    xml = (RAW / "megaphone.xml").read_text(encoding="utf-8", errors="replace")
    items = re.findall(r"<item>(.*?)</item>", xml, re.S)
    episodes = []
    for it in items:
        title = parse_rss_field(it, "title") or ""
        pub = parse_rss_field(it, "pubDate")
        date = datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %z").astimezone(timezone.utc).strftime("%Y-%m-%d")
        dur = parse_rss_field(it, "itunes:duration") or "0"
        secs = 0
        if ":" in dur:
            parts = [int(p) for p in dur.split(":")]
            for p in parts:
                secs = secs * 60 + p
        else:
            secs = int(float(dur))
        desc = strip_html(parse_rss_field(it, "description") or "")
        # drop boilerplate outro that repeats on most episodes
        desc = re.sub(r"(Get bonus content on Patreon.*|Learn more about your ad choices.*|Outtro music.*)$", "", desc, flags=re.I).strip()
        enc = re.search(r'<enclosure url="([^"]+)"', it)
        guests, seen = [], set()
        for g in extract_guests(title) + extract_guests_from_desc(desc):
            if g.casefold() not in seen:
                seen.add(g.casefold())
                guests.append(g)
        episodes.append({
            "title": title,
            "date": date,
            "duration": secs,
            "link": parse_rss_field(it, "link"),
            "audio": enc.group(1) if enc else None,
            "guests": guests,
            "desc": desc[:420],
        })
    episodes.sort(key=lambda e: e["date"])
    for i, e in enumerate(episodes):
        e["n"] = i + 1

    # ---- substack posts ---------------------------------------------
    # Full bodies (transcripts live here) if fetch_bodies() has run.
    bodies = {}
    bodies_file = RAW / "post_bodies.jsonl"
    if bodies_file.exists():
        for line in bodies_file.read_text().splitlines():
            try:
                d = json.loads(line)
                bodies[d["slug"]] = d.get("body_html") or ""
            except (ValueError, KeyError):
                pass

    raw_posts = json.loads((RAW / "substack_archive.json").read_text())
    posts = []
    for p in raw_posts:
        if p.get("type") == "restack":
            continue
        date = (p.get("post_date") or "")[:10]
        if not date:
            continue
        body_html = bodies.get(p.get("slug"), "")
        body_text = strip_html(body_html)
        posts.append({
            "slug": p.get("slug"),
            "body_html": body_html,
            "text": body_text,
            # ≥10 "First Last:" speaker turns marks an interview transcript
            "is_transcript": len(re.findall(r"[A-Z][\w’'-]+(?: [A-Z][\w’'-]+)?:", body_text)) >= 10,
            "title": p.get("title") or "",
            "subtitle": p.get("subtitle") or "",
            "date": date,
            "url": p.get("canonical_url"),
            "words": p.get("wordcount") or 0,
            "likes": p.get("reaction_count") or 0,
            "comments": p.get("comment_count") or 0,
            "paid": p.get("audience") == "only_paid",
            "tags": [t.get("name") for t in (p.get("postTags") or []) if t.get("name")],
            "authors": [b.get("name") for b in (p.get("publishedBylines") or []) if b.get("name")],
            "blurb": strip_html(p.get("truncated_body_text") or p.get("search_engine_description") or "")[:300],
        })
    posts.sort(key=lambda p: p["date"])

    # ---- match podcast episodes to substack posts --------------------
    # Exact normalized-title match first; then token-overlap within a
    # ±10 day window (podcast drop and transcript post rarely share an
    # identical title).
    by_norm = defaultdict(list)
    for i, p in enumerate(posts):
        by_norm[norm_title(p["title"])].append(i)

    def toks(s):
        return {w for w in norm_title(s).split() if w not in STOPWORDS}

    post_toks = [toks(p["title"] + " " + p["subtitle"]) for p in posts]
    post_days = [datetime.strptime(p["date"], "%Y-%m-%d") for p in posts]
    matched = exact = 0
    for e in episodes:
        pi = None
        cands = by_norm.get(norm_title(e["title"]), [])
        if cands:
            pi = cands[0]
            exact += 1
        else:
            et, ed = toks(e["title"]), datetime.strptime(e["date"], "%Y-%m-%d")
            if et:
                best, best_score = None, 0.0
                for i, p in enumerate(posts):
                    if abs((post_days[i] - ed).days) > 10 or not post_toks[i]:
                        continue
                    inter = len(et & post_toks[i])
                    score = inter / min(len(et), len(post_toks[i]))
                    if score > best_score:
                        best, best_score = i, score
                if best is not None and best_score >= 0.6:
                    pi = best
        if pi is not None:
            p = posts[pi]
            e["post"] = p["url"]
            if p["tags"]:
                e["tags"] = p["tags"]
            if p["is_transcript"]:
                e["tr"] = True
            matched += 1
    print(f"episodes matched to substack posts: {matched}/{len(episodes)} ({exact} exact)")

    # ---- machine-generated transcripts (tools/transcribe.py) ----------
    gen_texts = {}  # episode n -> transcript text
    gen_dir = RAW / "transcripts"
    if gen_dir.exists():
        for f in sorted(gen_dir.glob("ep*.json")):
            try:
                d = json.loads(f.read_text())
                if d.get("text"):
                    gen_texts[d["n"]] = d["text"]
            except (ValueError, KeyError):
                pass
    for e in episodes:
        if e["n"] in gen_texts and not e.get("tr"):
            e["gen"] = True
    if gen_texts:
        print(f"machine transcripts merged: {len(gen_texts)}")

    # ---- keyword topics across the full archive -----------------------
    # Classify every episode and post. For trends, matched transcript
    # posts are skipped so an episode and its transcript don't count the
    # same conversation twice.
    matched_urls = {e.get("post") for e in episodes if e.get("post")}
    for e in episodes:
        e["topics"] = classify(f'{e["title"]} {e["desc"]}')
    for p in posts:
        p["topics"] = classify(f'{p["title"]} {p["subtitle"]} {p["blurb"]}')

    kw_items = [(quarter(e["date"]), e["topics"]) for e in episodes]
    kw_items += [
        (quarter(p["date"]), p["topics"])
        for p in posts if p["url"] not in matched_urls
    ]

    # ---- headline stats ----------------------------------------------
    total_secs = sum(e["duration"] for e in episodes)
    corpus_words = sum(len(p["text"].split()) for p in posts)
    site = {
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "episodes": len(episodes),
        "audio_hours": round(total_secs / 3600),
        "posts": len(posts),
        "words": sum(p["words"] for p in posts),
        "corpus_words": corpus_words,
        "transcripts": sum(1 for p in posts if p["is_transcript"]),
        "gen_transcripts": len(gen_texts),
        "first_episode": episodes[0]["date"],
        "last_episode": episodes[-1]["date"],
        "likes": sum(p["likes"] for p in posts),
        "comments": sum(p["comments"] for p in posts),
    }

    # ---- output over time (by quarter) --------------------------------
    q_eps = Counter(quarter(e["date"]) for e in episodes)
    q_posts = Counter(quarter(p["date"]) for p in posts)
    q_words = Counter()
    q_secs = Counter()
    for p in posts:
        q_words[quarter(p["date"])] += p["words"]
    for e in episodes:
        q_secs[quarter(e["date"])] += e["duration"]
    quarters = sorted(set(q_eps) | set(q_posts))
    timeline = [
        {"q": q, "episodes": q_eps.get(q, 0), "posts": q_posts.get(q, 0),
         "words": q_words.get(q, 0), "hours": round(q_secs.get(q, 0) / 3600, 1)}
        for q in quarters
    ]

    # ---- topics --------------------------------------------------------
    tag_count = Counter()
    tag_likes = Counter()
    tag_q = defaultdict(Counter)   # tag -> quarter -> posts
    co = Counter()                 # (tagA, tagB) sorted pair -> count
    for p in posts:
        tags = sorted(set(p["tags"]))
        for t in tags:
            tag_count[t] += 1
            tag_likes[t] += p["likes"]
            tag_q[t][quarter(p["date"])] += 1
        for i in range(len(tags)):
            for j in range(i + 1, len(tags)):
                co[(tags[i], tags[j])] += 1

    # group-level rollup per quarter: posts touching each topic family
    # (drives the "topics over time" view)
    group_q = defaultdict(Counter)
    tagged_q = Counter()
    for p in posts:
        q = quarter(p["date"])
        groups = {TAG_TO_GROUP.get(t.lower(), "Other") for t in p["tags"]}
        if p["tags"]:
            tagged_q[q] += 1
        for g in groups:
            group_q[g][q] += 1

    # full-archive keyword topic trends
    kw_q_total = Counter(q for q, _ in kw_items)
    kw_q_topic = defaultdict(Counter)
    kw_total = Counter()
    for q, tps in kw_items:
        for t in tps:
            kw_q_topic[t][q] += 1
            kw_total[t] += 1

    top_tags = [t for t, _ in tag_count.most_common(60)]
    topics = {
        "quarters": quarters,
        "items_per_quarter": [kw_q_total.get(q, 0) for q in quarters],
        "keyword_topics": [
            {
                "topic": name,
                "total": kw_total.get(name, 0),
                "trend": [kw_q_topic[name].get(q, 0) for q in quarters],
            }
            for name, _ in TOPIC_TAXONOMY + [("Other", None)]
            if kw_total.get(name)
        ],
        "tagged_posts": [tagged_q.get(q, 0) for q in quarters],
        "group_trends": [
            {"group": g, "trend": [group_q[g].get(q, 0) for q in quarters]}
            for g in list(TAG_GROUPS.keys()) + ["Other"]
            if sum(group_q[g].values())
        ],
        "tags": [
            {
                "tag": t,
                "group": TAG_TO_GROUP.get(t.lower(), "Other"),
                "posts": tag_count[t],
                "likes": tag_likes[t],
                "trend": [tag_q[t].get(q, 0) for q in quarters],
            }
            for t in top_tags
        ],
        "links": [
            {"a": a, "b": b, "w": w}
            for (a, b), w in co.most_common()
            if w >= 3 and a in top_tags[:40] and b in top_tags[:40]
        ],
        "groups": list(TAG_GROUPS.keys()) + ["Other"],
    }

    # ---- people --------------------------------------------------------
    author_count = Counter()
    author_likes = Counter()
    for p in posts:
        for a in p["authors"]:
            author_count[a] += 1
            author_likes[a] += p["likes"]
    guest_eps = defaultdict(list)
    for e in episodes:
        for g in e["guests"]:
            guest_eps[g].append(e["n"])
    people = {
        "authors": [
            {"name": a, "posts": c, "likes": author_likes[a]}
            for a, c in author_count.most_common(30)
        ],
        "guests": sorted(
            [{"name": g, "episodes": eps} for g, eps in guest_eps.items()],
            key=lambda x: (-len(x["episodes"]), x["name"]),
        ),
    }

    # ---- language: term/person mentions over the full-text corpus ------
    # The corpus is every fetched post body — which includes the podcast
    # transcripts ChinaTalk publishes — so these are true mention counts,
    # not title matches. Rates are per million words of that quarter's
    # corpus so growing output doesn't masquerade as growing interest.
    # Speaker labels ("Chris Miller: ...") are attribution, not discussion —
    # strip them from transcripts so a guest's own dialogue doesn't count
    # as being mentioned.
    speaker_re = re.compile(r"\b[A-Z][\w'’-]+(?: [A-Z][\w'’-]+){0,2}:(?=\s)")
    q_text = defaultdict(list)      # everything
    q_text_w = defaultdict(list)    # written pieces only
    q_text_t = defaultdict(list)    # transcripts only (published + generated)
    for p in posts:
        if not p["text"]:
            continue
        if p["is_transcript"]:
            text = speaker_re.sub(" ", p["text"])
            q_text_t[quarter(p["date"])].append(f'{p["title"]} {text}')
        else:
            text = p["text"]
            q_text_w[quarter(p["date"])].append(f'{p["title"]} {p["subtitle"]} {text}')
        q_text[quarter(p["date"])].append(f'{p["title"]} {p["subtitle"]} {text}')
    # machine transcripts fill quarters the newsletter never covered
    for e in episodes:
        if e["n"] in gen_texts:
            q_text[quarter(e["date"])].append(f'{e["title"]} {gen_texts[e["n"]]}')
            q_text_t[quarter(e["date"])].append(f'{e["title"]} {gen_texts[e["n"]]}')

    def corpus_words(qt):
        return {q: sum(len(t.split()) for t in texts) for q, texts in qt.items()}

    q_words = corpus_words(q_text)
    q_words_w = corpus_words(q_text_w)
    q_words_t = corpus_words(q_text_t)

    def mention_series(pat):
        rx = re.compile(pat, re.I)

        def series(qt, qw):
            counts = {q: sum(len(rx.findall(t)) for t in texts) for q, texts in qt.items()}
            trend = [
                round(1e6 * counts.get(q, 0) / qw[q]) if qw.get(q, 0) >= 20000 else 0
                for q in quarters
            ]
            return sum(counts.values()), trend

        total, trend = series(q_text, q_words)
        _, trend_w = series(q_text_w, q_words_w)
        _, trend_t = series(q_text_t, q_words_t)
        return total, trend, trend_w, trend_t

    term_data = []
    for label, pat in TERMS:
        total, trend, tw, tt = mention_series(pat)
        term_data.append({"term": label, "total": total, "trend": trend, "w": tw, "t": tt})
    term_data.sort(key=lambda t: -t["total"])

    people_data = []
    for label, pat in PEOPLE:
        total, trend, tw, tt = mention_series(pat)
        people_data.append({"term": label, "total": total, "trend": trend, "w": tw, "t": tt})
    people_data.sort(key=lambda t: -t["total"])

    # ---- entity co-mention map -----------------------------------------
    # One "item" = one conversation or piece: every post, plus episodes
    # without a matched post (their feed description + any generated
    # transcript). An entity counts as present when it's mentioned at
    # least twice in long texts (once in short ones) — passing mentions
    # in hour-long transcripts shouldn't create edges.
    items = []
    for p in posts:
        text = speaker_re.sub(" ", p["text"]) if p["is_transcript"] else p["text"]
        items.append({
            "text": f'{p["title"]} {p["subtitle"]} {text}',
            "title": p["title"], "url": p["url"], "date": p["date"], "likes": p["likes"],
        })
    for e in episodes:
        if not e.get("post"):
            items.append({
                "text": f'{e["title"]} {e["desc"]} {gen_texts.get(e["n"], "")}',
                "title": e["title"], "url": e["link"], "date": e["date"], "likes": 0,
            })

    ent_res = [
        (name, group, re.compile(pat, re.I))
        for group, ents in ENTITIES.items() for name, pat in ents
    ]
    ent_items = defaultdict(list)   # entity -> list of item indexes
    for idx, item in enumerate(items):
        long_text = len(item["text"]) > 9000
        present = []
        for name, _group, rx in ent_res:
            hits = rx.findall(item["text"])
            if len(hits) >= (2 if long_text else 1):
                present.append(name)
        item["ents"] = present
        for name in present:
            ent_items[name].append(idx)

    pair_counts = Counter()
    for item in items:
        ents = sorted(set(item["ents"]))
        for i in range(len(ents)):
            for j in range(i + 1, len(ents)):
                pair_counts[(ents[i], ents[j])] += 1

    # keep the strongest ~160 links, plus each node's single strongest
    # link so nothing floats disconnected
    top_links = set(p for p, _ in pair_counts.most_common(160))
    for name in ent_items:
        best = None
        for pair, w in pair_counts.items():
            if name in pair and (best is None or w > pair_counts[best]):
                best = pair
        if best:
            top_links.add(best)

    map_data = {
        "items": len(items),
        "entities": [
            {
                "name": name,
                "group": group,
                "items": len(ent_items[name]),
                "top": [
                    {"t": items[i]["title"], "u": items[i]["url"],
                     "d": items[i]["date"], "l": items[i]["likes"]}
                    for i in sorted(ent_items[name], key=lambda i: -items[i]["likes"])[:8]
                ],
            }
            for name, group, _rx in ent_res if ent_items[name]
        ],
        "links": [
            {"a": a, "b": b, "w": pair_counts[(a, b)]}
            for (a, b) in sorted(top_links, key=lambda p: -pair_counts[p])
        ],
        "groups": list(ENTITIES.keys()),
    }

    # ---- writing: the archive minus the transcripts --------------------
    written = [p for p in posts if not p["is_transcript"]]
    trans_posts = [p for p in posts if p["is_transcript"]]
    wq_posts = Counter(quarter(p["date"]) for p in written)
    wq_words = Counter()
    wq_likes = Counter()
    for p in written:
        wq_words[quarter(p["date"])] += p["words"]
        wq_likes[quarter(p["date"])] += p["likes"]
    tq_posts = Counter(quarter(p["date"]) for p in trans_posts)
    w_topics = Counter()
    for p in written:
        for t in p["topics"]:
            w_topics[t] += 1
    w_authors = Counter()
    w_author_likes = Counter()
    for p in written:
        for a in p["authors"]:
            w_authors[a] += 1
            w_author_likes[a] += p["likes"]

    def slim(p):
        return {"title": p["title"], "date": p["date"], "url": p["url"],
                "likes": p["likes"], "comments": p["comments"], "words": p["words"],
                "authors": p["authors"]}

    writing = {
        "quarters": quarters,
        "written_per_quarter": [wq_posts.get(q, 0) for q in quarters],
        "transcripts_per_quarter": [tq_posts.get(q, 0) for q in quarters],
        "words_per_quarter": [wq_words.get(q, 0) for q in quarters],
        "likes_per_quarter": [wq_likes.get(q, 0) for q in quarters],
        "posts": len(written),
        "words": sum(p["words"] for p in written),
        "likes": sum(p["likes"] for p in written),
        "median_likes_written": d_median([p["likes"] for p in written if p["date"] >= "2024-01-01"]),
        "median_likes_transcript": d_median([p["likes"] for p in trans_posts if p["date"] >= "2024-01-01"]),
        "top": [slim(p) for p in sorted(written, key=lambda p: -p["likes"])[:20]],
        "longest": [slim(p) for p in sorted(written, key=lambda p: -p["words"])[:12]],
        "authors": [
            {"name": a, "posts": c, "likes": w_author_likes[a]}
            for a, c in w_authors.most_common(15)
        ],
        "topics": [
            {"topic": t, "posts": c} for t, c in w_topics.most_common()
            if t != "Other"
        ],
    }

    # ---- what's still unclassified --------------------------------------
    other_items = []
    for p in posts:
        if p["topics"] == ["Other"]:
            other_items.append({"t": p["title"], "d": p["date"], "u": p["url"]})
    for e in episodes:
        if e["topics"] == ["Other"] and not e.get("post"):
            other_items.append({"t": e["title"], "d": e["date"], "u": e["link"]})
    other_items.sort(key=lambda x: x["d"], reverse=True)

    # brand-constant words carry no signal in a China-focused show
    title_skip = STOPWORDS | {"china", "chinese", "chinatalk", "u.s", "usa"}
    words = Counter()
    for e in episodes:
        for w in re.findall(r"[A-Za-z][A-Za-z'’-]+", e["title"].lower()):
            if w not in title_skip and len(w) > 1:
                words[w] += 1
    language = {
        "quarters": quarters,
        "words_per_quarter": [q_words.get(q, 0) for q in quarters],
        "words_per_quarter_w": [q_words_w.get(q, 0) for q in quarters],
        "words_per_quarter_t": [q_words_t.get(q, 0) for q in quarters],
        "terms": term_data,
        "people": people_data,
        "title_words": [{"w": w, "n": n} for w, n in words.most_common(40)],
    }

    # ---- references: outbound links in post bodies ---------------------
    host_links = Counter()
    host_posts = Counter()
    for p in posts:
        if not p["body_html"]:
            continue
        hosts = [link_host(u) for u in HREF_RE.findall(p["body_html"])]
        hosts = [h for h in hosts if h and h not in LINK_SKIP]
        host_links.update(hosts)
        host_posts.update(set(hosts))
    references = {
        "total_links": sum(host_links.values()),
        "posts_with_bodies": sum(1 for p in posts if p["body_html"]),
        "domains": [
            {"domain": h, "links": n, "posts": host_posts[h]}
            for h, n in host_links.most_common(40)
        ],
    }

    # ---- engagement ----------------------------------------------------
    slim_posts = [
        {"title": p["title"], "date": p["date"], "likes": p["likes"],
         "comments": p["comments"], "words": p["words"], "url": p["url"],
         "paid": p["paid"], "tags": p["tags"], "authors": p["authors"]}
        for p in posts
    ]
    engagement = {
        "posts": slim_posts,
        "top": sorted(
            [p for p in slim_posts if p["likes"]],
            key=lambda p: -p["likes"],
        )[:20],
    }

    topics["other_items"] = other_items[:40]

    json.dump(site, open(OUT / "site.json", "w"))
    json.dump(references, open(OUT / "references.json", "w"))
    json.dump(map_data, open(OUT / "map.json", "w"))
    json.dump(writing, open(OUT / "writing.json", "w"))
    json.dump(episodes, open(OUT / "episodes.json", "w"))
    json.dump(timeline, open(OUT / "timeline.json", "w"))
    json.dump(topics, open(OUT / "topics.json", "w"))
    json.dump(people, open(OUT / "people.json", "w"))
    json.dump(language, open(OUT / "language.json", "w"))
    json.dump(engagement, open(OUT / "engagement.json", "w"))
    for f in sorted(OUT.glob("*.json")):
        print(f"{f.name:18} {f.stat().st_size / 1024:8.1f} KB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true", help="re-download raw sources first")
    ap.add_argument("--fetch-bodies", action="store_true", help="fetch full post bodies (resumable)")
    args = ap.parse_args()
    if args.fetch or not (RAW / "megaphone.xml").exists():
        fetch_raw()
    if args.fetch_bodies:
        fetch_bodies()
    build()
