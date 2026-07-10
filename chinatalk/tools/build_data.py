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
}

# Leading honorifics stripped so "Sen. Chris Murphy" == "Chris Murphy".
HONORIFIC_RE = re.compile(
    r"^(?:sen\.?|rep\.?|amb\.?|gen\.?|adm\.?|dr\.?|fmr\.?|ltg|maj\.?|col\.?|secaf|secdef|sec\.?)\s+",
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
    ("Trade & Economics", r"trade war|tariff|econom|\bGDP\b|supply chain|manufactur|decoupl|de-risk|currency|yuan|\bRMB\b|market|invest|finance|debt|growth"),
    ("Chinese Politics", r"\bCCP\b|communist party|xi jinping|politburo|party congress|propaganda|censor|\bmao\b|deng xiaoping|united front|corruption|zhongnanhai|beijing"),
    ("Military & War", r"militar|\bPLA\b|\bwar\b|warfare|defense|defence|missile|nuclear|drone|navy|naval|army|invasion|pentagon|\bNATO\b|deterrence|weapon"),
    ("Taiwan", r"taiwan|cross-strait|taipei"),
    ("US Policy", r"congress|washington|white house|biden|trump|obama|sanction|chips act|industrial policy|senate|state department|commerce department|national security"),
    ("Tech Industry", r"tiktok|bytedance|tencent|alibaba|baidu|internet|startup|e-?commerce|social media|platform|app\b|gaming|xiaomi|wechat"),
    ("Society & Culture", r"culture|history|film|movie|music|book|poetry|novel|food|youth|feminis|society|religion|education|language|literature"),
    ("Energy & Climate", r"energy|climate|solar|\bEVs?\b|electric vehicle|battery|batteries|\bBYD\b|coal|oil\b|renewable|power grid"),
    ("Rest of Asia & World", r"japan|korea|india|russia|europe|southeast asia|vietnam|philippines|australia|africa|middle east|iran|ukraine"),
    ("Covid & Health", r"covid|pandemic|vaccine|lockdown|quarantine|public health|virus"),
]


def classify(text):
    hits = [name for name, pat in TOPIC_RES if pat.search(text)]
    return hits or ["Other"]


TOPIC_RES = [(name, re.compile(pat, re.I)) for name, pat in TOPIC_TAXONOMY]

# Terms tracked in the Language view. Each entry: display label, regex.
TERMS = [
    ("AI", r"\bAI\b|artificial intelligence"),
    ("Semiconductors / chips", r"semiconductor|\bchips?\b|\bfabs?\b"),
    ("Export controls", r"export control"),
    ("Taiwan", r"taiwan"),
    ("Huawei", r"huawei"),
    ("TikTok", r"tiktok"),
    ("Xi Jinping", r"xi jinping"),
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
        episodes.append({
            "title": title,
            "date": date,
            "duration": secs,
            "link": parse_rss_field(it, "link"),
            "guests": extract_guests(title),
            "desc": desc[:420],
        })
    episodes.sort(key=lambda e: e["date"])
    for i, e in enumerate(episodes):
        e["n"] = i + 1

    # ---- substack posts ---------------------------------------------
    raw_posts = json.loads((RAW / "substack_archive.json").read_text())
    posts = []
    for p in raw_posts:
        if p.get("type") == "restack":
            continue
        date = (p.get("post_date") or "")[:10]
        if not date:
            continue
        posts.append({
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
            matched += 1
    print(f"episodes matched to substack posts: {matched}/{len(episodes)} ({exact} exact)")

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
    site = {
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "episodes": len(episodes),
        "audio_hours": round(total_secs / 3600),
        "posts": len(posts),
        "words": sum(p["words"] for p in posts),
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

    # ---- language: term trends + title words ---------------------------
    # Corpus per quarter: episode title+desc, post title+subtitle+blurb.
    docs = []
    for e in episodes:
        docs.append((quarter(e["date"]), f'{e["title"]} {e["desc"]}'))
    for p in posts:
        docs.append((quarter(p["date"]), f'{p["title"]} {p["subtitle"]} {p["blurb"]}'))
    q_docs = Counter(q for q, _ in docs)
    term_data = []
    for label, pat in TERMS:
        rx = re.compile(pat, re.I)
        hits = Counter(q for q, text in docs if rx.search(text))
        term_data.append({
            "term": label,
            "total": sum(hits.values()),
            "trend": [
                round(100 * hits.get(q, 0) / q_docs[q], 1) if q_docs.get(q) else 0
                for q in quarters
            ],
        })
    term_data.sort(key=lambda t: -t["total"])

    # brand-constant words carry no signal in a China-focused show
    title_skip = STOPWORDS | {"china", "chinese", "chinatalk", "u.s", "usa"}
    words = Counter()
    for e in episodes:
        for w in re.findall(r"[A-Za-z][A-Za-z'’-]+", e["title"].lower()):
            if w not in title_skip and len(w) > 1:
                words[w] += 1
    language = {
        "quarters": quarters,
        "docs_per_quarter": [q_docs.get(q, 0) for q in quarters],
        "terms": term_data,
        "title_words": [{"w": w, "n": n} for w, n in words.most_common(40)],
    }

    # ---- engagement ----------------------------------------------------
    engagement = {
        "posts": [
            {"title": p["title"], "date": p["date"], "likes": p["likes"],
             "comments": p["comments"], "words": p["words"], "url": p["url"],
             "paid": p["paid"], "tags": p["tags"], "authors": p["authors"]}
            for p in posts
        ],
        "top": sorted(
            [p for p in posts if p["likes"]],
            key=lambda p: -p["likes"],
        )[:20],
    }

    json.dump(site, open(OUT / "site.json", "w"))
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
    args = ap.parse_args()
    if args.fetch or not (RAW / "megaphone.xml").exists():
        fetch_raw()
    build()
