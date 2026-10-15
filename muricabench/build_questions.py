#!/usr/bin/env python3
"""Render muricabench/questions.html — the Question Bank.

Every prompt on the current eval, grouped by division and category, each with
KEEP / REWORK / CUT controls and a note field. Choices persist in localStorage;
the drawer's "Copy feedback" button produces a paste-ready digest for the chat.
"""
import html, json, os
import mb_common as mb

HERE = mb.HERE
CANON_DIV = {"I": "Vibes", "II": "Knowledge", "III": "Steerability",
             "IV": "Commitment to the Bit", "V": "Applied Freedom"}


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def main():
    items = mb.load_json(os.path.join(HERE, "data", "prompts.json"))

    body, last_div, last_cat = [], None, None
    n = 0
    for it in items:
        div_label = f"Division {it['division']} · {CANON_DIV.get(it['division'], it['division_name'])}"
        if div_label != last_div:
            body.append(f'<div class="qdiv eyebrow">{esc(div_label)}</div>')
            last_div = div_label
            last_cat = None
        if it["category"] != last_cat:
            cat_n = sum(1 for x in items if x["category"] == it["category"])
            body.append(f'<h2 class="qcat">{esc(it["category"])} <span class="mono qn">{cat_n} prompts</span></h2>')
            last_cat = it["category"]
        n += 1
        body.append(f'''<div class="q" data-id="{esc(it["id"])}">
  <div class="qhead"><span class="mono qid">{esc(it["id"])}</span>
    <span class="qbtns">
      <button class="qb qb-keep" data-v="KEEP">🦅 keep</button>
      <button class="qb qb-rework" data-v="REWORK">🔧 rework</button>
      <button class="qb qb-cut" data-v="CUT">✂️ cut</button>
    </span></div>
  <p class="qprompt">{esc(it["prompt"])}</p>
  <details class="qrub"><summary>grading rubric</summary><pre>{esc(it["rubric"])}</pre>
    <p class="qnote"><b>Why it exists:</b> {esc(it.get("notes", ""))}</p></details>
  <textarea class="qtxt" rows="1" placeholder="note for Claude (optional)…"></textarea>
</div>''')

    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>'MuricaBench — Question Bank</title>
<meta name="description" content="Every prompt on the eval, with committee feedback controls.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦅</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
:root{--paper:#FAF8F3;--ink:#1C2433;--ink2:#4A5468;--ink3:#8A8FA0;--rule:#D8D3C8;--red:#B22234;
  --navy:#3C5A99;--gold:#8A6508;--card:#FFFFFF;--cardline:#E4DFD4;
  --shadow:0 1px 2px rgba(28,36,51,.06),0 4px 14px rgba(28,36,51,.05)}
@media (prefers-color-scheme: dark){:root{--paper:#131A26;--ink:#EAE6DC;--ink2:#9AA3B5;--ink3:#6B7488;
  --rule:#2A3345;--red:#E05C68;--navy:#5B7FC7;--gold:#C9A227;--card:#182130;--cardline:#263144;
  --shadow:0 1px 2px rgba(0,0,0,.35),0 4px 14px rgba(0,0,0,.3)}}
:root[data-theme="dark"]{--paper:#131A26;--ink:#EAE6DC;--ink2:#9AA3B5;--ink3:#6B7488;--rule:#2A3345;
  --red:#E05C68;--navy:#5B7FC7;--gold:#C9A227;--card:#182130;--cardline:#263144;
  --shadow:0 1px 2px rgba(0,0,0,.35),0 4px 14px rgba(0,0,0,.3)}
:root[data-theme="light"]{--paper:#FAF8F3;--ink:#1C2433;--ink2:#4A5468;--ink3:#8A8FA0;--rule:#D8D3C8;
  --red:#B22234;--navy:#3C5A99;--gold:#8A6508;--card:#FFFFFF;--cardline:#E4DFD4;
  --shadow:0 1px 2px rgba(28,36,51,.06),0 4px 14px rgba(28,36,51,.05)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font:16px/1.65 'Libre Caslon Text',Georgia,serif;
  -webkit-font-smoothing:antialiased}
body::before{content:"";display:block;height:6px;
  background:linear-gradient(to bottom,var(--red) 0 2px,#F4F1E8 2px 4px,#1F3A6E 4px 6px)}
.mono{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.eyebrow{font-family:system-ui,sans-serif;font-size:11.5px;font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;color:var(--ink2)}
nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
nav .in{max-width:900px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;gap:22px}
nav a.wordmark{font-family:'Libre Caslon Text',Georgia,serif;font-weight:700;font-size:18px;
  color:var(--ink);text-decoration:none}
nav a.wordmark .apo{color:var(--red)}
nav .links{margin-left:auto;display:flex;gap:18px}
nav .links a{font-family:system-ui,sans-serif;font-size:12.5px;letter-spacing:.04em;color:var(--ink2);
  text-decoration:none;text-transform:uppercase}
.wrap{max-width:900px;margin:0 auto;padding:0 22px 160px}
header{padding:44px 0 10px}
h1{font-size:clamp(30px,4.5vw,44px);font-weight:700;letter-spacing:-.01em}
h1 .apo{color:var(--red)}
.sub{color:var(--ink2);font-style:italic;margin-top:8px;max-width:64ch}
.qdiv{color:var(--red);margin:44px 0 2px}
.qcat{font-size:24px;font-weight:700;margin:18px 0 4px}
.qcat .qn{font-size:11.5px;color:var(--ink3);font-weight:400;margin-left:8px}
.q{background:var(--card);border:1px solid var(--cardline);border-radius:10px;box-shadow:var(--shadow);
  padding:16px 18px;margin:12px 0}
.q.f-KEEP{border-left:4px solid var(--gold)}
.q.f-REWORK{border-left:4px solid var(--navy)}
.q.f-CUT{border-left:4px solid var(--red);opacity:.75}
.qhead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.qid{font-size:11px;color:var(--ink3)}
.qbtns{display:flex;gap:6px}
.qb{font:11.5px system-ui,sans-serif;letter-spacing:.04em;padding:4px 10px;border-radius:999px;
  border:1.5px solid var(--cardline);background:transparent;color:var(--ink2);cursor:pointer}
.qb:hover{border-color:var(--ink3)}
.q.f-KEEP .qb-keep{border-color:var(--gold);color:var(--gold);font-weight:700}
.q.f-REWORK .qb-rework{border-color:var(--navy);color:var(--navy);font-weight:700}
.q.f-CUT .qb-cut{border-color:var(--red);color:var(--red);font-weight:700}
.qprompt{margin-top:10px;font-size:16.5px}
.qrub{margin-top:10px}
.qrub summary{cursor:pointer;font:12px system-ui,sans-serif;color:var(--navy)}
.qrub pre{margin-top:8px;white-space:pre-wrap;font:12.5px ui-monospace,Menlo,monospace;
  color:var(--ink2);background:color-mix(in srgb,var(--paper) 60%,var(--card));border-radius:6px;padding:10px}
.qrub .qnote{margin-top:8px;font-size:13px;color:var(--ink3);font-style:italic}
.qtxt{display:block;width:100%;margin-top:10px;border:1px solid var(--cardline);border-radius:6px;
  background:transparent;color:var(--ink);font:13.5px system-ui,sans-serif;padding:7px 10px;resize:vertical}
.qtxt:focus{outline:2px solid var(--navy);outline-offset:1px}
/* drawer */
#drawer{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--card);
  border-top:1px solid var(--cardline);box-shadow:0 -6px 24px rgba(0,0,0,.12)}
#drawer .in{max-width:900px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
#drawer .stat{font:13px system-ui,sans-serif;color:var(--ink2)}
#drawer .stat b{color:var(--ink)}
#drawer button{font:13px system-ui,sans-serif;font-weight:600;padding:9px 18px;border-radius:6px;cursor:pointer}
#copybtn{background:var(--red);color:#fff;border:none}
#clearbtn{background:transparent;color:var(--ink3);border:1px solid var(--cardline)}
#copied{font:12px system-ui,sans-serif;color:var(--gold);display:none}
</style></head>
<body>
<nav><div class="in">
  <a class="wordmark" href="index.html"><span class="apo">&rsquo;</span>MuricaBench</a>
  <div class="links"><a href="index.html">Results</a><a href="index.html#events">Events</a><a href="index.html#baseline">Dale</a></div>
</div></nav>
<div class="wrap">
<header>
  <div class="eyebrow">Committee Review Materials</div>
  <h1>The Question Bank</h1>
  <p class="sub">Every prompt currently on the eval — __N__ prompts across __NCAT__ categories. Mark each one keep, rework, or cut, add notes where useful, then hit <b>Copy feedback</b> and paste the digest to Claude. Your marks persist in this browser.</p>
</header>
__BODY__
</div>
<div id="drawer"><div class="in">
  <span class="stat"><b id="nmarked">0</b> marked &middot; <b id="nnotes">0</b> notes</span>
  <button id="copybtn">Copy feedback for Claude</button>
  <button id="clearbtn">Clear all</button>
  <span id="copied">Copied — paste it in the chat.</span>
</div></div>
<script>
(function(){
  const KEY='mb-question-feedback';
  const state = JSON.parse(localStorage.getItem(KEY) || '{}');
  const qs = Array.from(document.querySelectorAll('.q'));
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); refresh(); }
  function refresh(){
    let marked=0, notes=0;
    qs.forEach(q => {
      const id=q.dataset.id, st=state[id]||{};
      q.classList.remove('f-KEEP','f-REWORK','f-CUT');
      if (st.v) { q.classList.add('f-'+st.v); marked++; }
      if (st.t) notes++;
      const ta=q.querySelector('.qtxt');
      if (document.activeElement!==ta) ta.value = st.t||'';
    });
    document.getElementById('nmarked').textContent = marked;
    document.getElementById('nnotes').textContent = notes;
  }
  qs.forEach(q => {
    const id=q.dataset.id;
    q.querySelectorAll('.qb').forEach(b => b.addEventListener('click', () => {
      const st=state[id]||(state[id]={});
      st.v = (st.v===b.dataset.v) ? null : b.dataset.v;
      save();
    }));
    q.querySelector('.qtxt').addEventListener('input', e => {
      (state[id]||(state[id]={})).t = e.target.value.trim(); save();
    });
  });
  document.getElementById('copybtn').addEventListener('click', async () => {
    const lines=['MuricaBench question feedback:'];
    qs.forEach(q => {
      const id=q.dataset.id, st=state[id]||{};
      if (!st.v && !st.t) return;
      let line=(st.v||'NOTE')+' '+id;
      if (st.t) line += ' \\u2014 "'+st.t+'"';
      lines.push(line);
    });
    if (lines.length===1) lines.push('(nothing marked yet)');
    const text=lines.join('\\n');
    try { await navigator.clipboard.writeText(text); }
    catch(e){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove(); }
    const c=document.getElementById('copied'); c.style.display='inline';
    setTimeout(()=>{c.style.display='none';}, 2400);
  });
  document.getElementById('clearbtn').addEventListener('click', () => {
    if (confirm('Clear all marks and notes?')) { Object.keys(state).forEach(k=>delete state[k]); save(); }
  });
  refresh();
})();
</script>
</body></html>"""

    page = (page.replace("__BODY__", "\n".join(body))
                .replace("__N__", str(n))
                .replace("__NCAT__", str(len({i["category"] for i in items}))))
    out = os.path.join(HERE, "questions.html")
    with open(out, "w") as f:
        f.write(page)
    print(f"wrote {out} ({os.path.getsize(out)//1024} KB) — {n} questions")


if __name__ == "__main__":
    main()
