/* Athena Leads — front-end. Holds no data and no password; everything comes
   from the gated /api/leads endpoint after a correct password is supplied. */

const $ = (s) => document.querySelector(s);

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function plain(s) { return String(s == null ? "" : s).replace(/[“”"]/g, "").replace(/[().]/g, "").trim(); }

function linkedinUrl(lead) {
  const q = `${plain(lead.name)} ${plain(lead.company)}`.trim();
  return "https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(q);
}

function signalHTML(l) {
  const parts = [];
  if (l.opens6mo) parts.push(`<b>${l.opens6mo}</b> opens · 6mo`);
  if (l.opens30d) parts.push(`<b>${l.opens30d}</b> · 30d`);
  if (l.active30) parts.push(`<b>${l.active30}</b>/30 active`);
  if (!parts.length) return `<span class="signal">low engagement</span>`;
  return `<span class="signal">${parts.join(' <span class="dot">·</span> ')}</span>`;
}

function toolsHTML(lead) {
  const email = esc(lead.email);
  return `<span class="tools">
    <button class="tool" data-copy="${email}">Copy email</button>
    <a class="tool" href="mailto:${email}">Email</a>
    <a class="tool" href="${esc(linkedinUrl(lead))}" target="_blank" rel="noopener">LinkedIn</a>
  </span>`;
}

function entryHTML(lead, kind) {
  const flag = kind === "verify";
  const rank = flag ? `<div class="entry-rank flag">?</div>` : `<div class="entry-rank">${lead.rank}</div>`;
  const geo = lead.usBased ? `<span class="chip us">${esc(lead.location)}</span>` : `<span class="chip intl">${esc(lead.location)}</span>`;
  const ask = lead.ask
    ? `<div class="entry-ask"><b>Suggested first ask</b>${esc(lead.ask)}</div>` : "";
  const tag = lead.tag
    ? `<span class="entry-tag${flag ? " flag" : ""}">${esc(lead.tag)}</span>` : "";
  return `
    <article class="entry">
      ${rank}
      <div class="entry-body">
        <div class="entry-name">${esc(lead.name)}</div>
        <div class="entry-role">${esc(lead.role)} <span class="at">· ${esc(lead.company)}</span> ${tag}</div>
        <p class="entry-why">${esc(lead.why)}</p>
        ${ask}
        <div class="entry-meta">
          ${signalHTML(lead)}
          ${geo}
          <span class="chip conf">${esc(lead.confidence)}</span>
          ${toolsHTML(lead)}
        </div>
      </div>
    </article>`;
}

function rowHTML(lead) {
  return `
    <div class="row">
      <div class="row-main">
        <div class="row-name">${esc(lead.name)} <span class="co">· ${esc(lead.company)}</span></div>
        <div class="row-role">${esc(lead.role)}</div>
        ${lead.note ? `<div class="row-note">${esc(lead.note)}</div>` : ""}
      </div>
      <div class="row-right">
        <span class="row-signal">${lead.opens6mo ? lead.opens6mo + " · 6mo" : "—"}</span>
        <button class="tool" data-copy="${esc(lead.email)}">Copy email</button>
      </div>
    </div>`;
}

function sectionHTML(sec) {
  let inner;
  if (sec.kind === "rows") {
    inner = `<div class="rows">${sec.leads.map(rowHTML).join("")}</div>`;
  } else {
    inner = sec.leads.map((l) => entryHTML(l, sec.kind)).join("");
  }
  return `
    <section class="section ${sec.id === "parked" ? "parked" : ""}">
      <div class="sec-head">
        <span class="sec-kicker">${esc(sec.kicker)}</span>
        <h2 class="sec-title">${esc(sec.title)}</h2>
      </div>
      ${sec.note ? `<p class="sec-note">${esc(sec.note)}</p>` : ""}
      ${inner}
    </section>`;
}

function render(data) {
  const m = data.meta;
  $("#mast-kicker").textContent = m.kicker;
  $("#mast-title").textContent = m.title;
  $("#mast-dek").textContent = m.dek;
  $("#mast-date").textContent = "Updated " + m.updated;

  $("#stats").innerHTML = data.stats.map((s) =>
    `<div class="stat"><div class="stat-num serif">${esc(s.n)}</div><div class="stat-label">${esc(s.label)}</div></div>`
  ).join("");

  $("#content").innerHTML = data.sections.map(sectionHTML).join("");

  document.querySelectorAll(".tool[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = btn.getAttribute("data-copy");
      try { await navigator.clipboard.writeText(email); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = email; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      const prev = btn.textContent;
      btn.textContent = "Copied ✓"; btn.classList.add("copied");
      toast(email + " copied");
      setTimeout(() => { btn.textContent = prev; btn.classList.remove("copied"); }, 1500);
    });
  });
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1700);
}

async function submit(e) {
  e.preventDefault();
  const btn = $("#unlock");
  const label = btn.querySelector(".btn-label");
  const spin = btn.querySelector(".btn-spinner");
  const err = $("#gate-error");
  err.hidden = true;
  label.textContent = "Checking"; spin.hidden = false; btn.disabled = true;
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("#password").value }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Incorrect password");
    }
    const data = await res.json();
    $("#gate").style.display = "none";
    $("#app").hidden = false;
    window.scrollTo(0, 0);
    render(data);
  } catch (e2) {
    err.textContent = e2.message || "Something went wrong";
    err.hidden = false;
    $("#password").value = ""; $("#password").focus();
  } finally {
    label.textContent = "Read brief"; spin.hidden = true; btn.disabled = false;
  }
}

$("#gate-form").addEventListener("submit", submit);
