/* Athena Leads — front-end. Holds no data and no password; everything comes
   from the gated /api/leads endpoint after a correct password is supplied. */

const $ = (sel) => document.querySelector(sel);

const AVATAR_COLORS = [
  ["#6366f1", "#4338ca"],
  ["#0ea5e9", "#0369a1"],
  ["#10b981", "#047857"],
  ["#f59e0b", "#b45309"],
  ["#ec4899", "#be185d"],
  ["#8b5cf6", "#6d28d9"],
  ["#14b8a6", "#0f766e"],
];

function initials(name) {
  const clean = name.replace(/[“”"().]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function firstEmail(email) {
  return email.split(/[·,]/)[0].trim();
}

function linkedinUrl(lead) {
  const q = `${lead.name.replace(/[“”"().]/g, "")} ${lead.company}`.trim();
  return "https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(q);
}

function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

function cardHTML(lead) {
  const [c1, c2] = colorFor(lead.company + lead.name);
  const eng = Math.max(0, Math.min(100, Math.round((lead.engagement / 120) * 100)));
  const geoClass = lead.usBased ? "geo-us" : "geo-x";
  const geoLabel = lead.usBased ? "US-based" : "Non-US";
  const single = firstEmail(lead.email);
  return `
    <article class="card" style="--accent:${esc(lead._accent)}">
      <div class="card-top">
        <div class="avatar" style="background:linear-gradient(135deg,${c1},${c2})">${esc(initials(lead.name))}</div>
        <div class="card-id">
          <div class="card-name">${esc(lead.name)}</div>
          ${lead.alt ? `<div class="card-alt">${esc(lead.alt)}</div>` : ""}
          <div class="card-co"><span class="co-name">${esc(lead.company)}</span>${lead.companyTag ? `<span class="co-tag">${esc(lead.companyTag)}</span>` : ""}</div>
        </div>
      </div>

      <div class="pills">
        <span class="pill">${esc(lead.seniority)}</span>
        <span class="pill ${geoClass}">${geoLabel} · ${esc(lead.location)}</span>
        <span class="pill conf-${esc(lead.confidence)}">${esc(lead.confidence)} confidence</span>
      </div>

      <div class="card-role">${esc(lead.role)}</div>
      <div class="card-why">${esc(lead.why)}</div>

      <div class="engage" title="Newsletter engagement (emails opened)">
        <div class="engage-track"><div class="engage-fill" style="width:${eng}%"></div></div>
        <div class="engage-txt">${lead.engagement ? lead.engagement + " opens" : "no data"}</div>
      </div>

      <div class="card-action"><span class="action-flag">▸</span> ${esc(lead.action)}</div>

      <div class="card-tools">
        <button class="tool" data-copy="${esc(single)}">Copy email</button>
        <a class="tool" href="mailto:${esc(single)}">Email</a>
        <a class="tool" href="${esc(linkedinUrl(lead))}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </article>`;
}

function render(data) {
  // brand tag + stats
  $("#brand-tag").textContent = data.generated;
  const s = data.stats;
  $("#stats").innerHTML = [
    [s.screened.toLocaleString(), "subscribers screened"],
    [s.insuranceContacts, "on insurance domains"],
    [s.priority, "priority targets"],
    [s.usBased, "US-based & relevant"],
  ].map(([n, l]) => `<div class="stat"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`).join("");

  // tiers
  let html = "";
  data.tiers.forEach((tier) => {
    tier.leads.forEach((l) => (l._accent = tier.accent));
    html += `
      <section class="tier">
        <div class="tier-head">
          <span class="tier-dot" style="background:${esc(tier.accent)}"></span>
          <span class="tier-label">${esc(tier.label)}</span>
          <span class="tier-count">${tier.leads.length} ${tier.leads.length === 1 ? "person" : "people"}</span>
        </div>
        <p class="tier-blurb">${esc(tier.blurb)}</p>
        <div class="cards">${tier.leads.map(cardHTML).join("")}</div>
      </section>`;
  });

  // skip list
  html += `
    <section class="skip">
      <div class="skip-head">Deprioritized — engaged, but not a fit</div>
      <p class="skip-sub">The trap of this list: high engagement usually means an <em>investment-side</em> reader, not an insuretech decision-maker. These ${data.skip.length} are at insurers but junior, back-office, or buy-side.</p>
      <div class="skip-grid">
        ${data.skip.map((p) => `
          <div class="skip-row">
            <div class="skip-eng">${p.engagement ? p.engagement : "—"}</div>
            <div class="skip-main">
              <div class="skip-name">${esc(p.name)} <span>· ${esc(p.company)}</span></div>
              <div class="skip-reason">${esc(p.role)} — ${esc(p.reason)}</div>
            </div>
          </div>`).join("")}
      </div>
    </section>`;

  $("#content").innerHTML = html;

  // copy buttons
  document.querySelectorAll(".tool[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = btn.getAttribute("data-copy");
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = email; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      btn.textContent = "Copied ✓";
      btn.classList.add("copied");
      toast(email + " copied");
      setTimeout(() => { btn.textContent = "Copy email"; btn.classList.remove("copied"); }, 1600);
    });
  });
}

function reveal() {
  $("#gate").style.display = "none";
  const app = $("#app");
  app.hidden = false;
  window.scrollTo(0, 0);
}

async function submit(e) {
  e.preventDefault();
  const btn = $("#unlock");
  const label = btn.querySelector(".btn-label");
  const spin = btn.querySelector(".btn-spinner");
  const err = $("#gate-error");
  const pw = $("#password").value;

  err.hidden = true;
  label.textContent = "Checking";
  spin.hidden = false;
  btn.disabled = true;

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Incorrect password");
    }
    const data = await res.json();
    reveal();
    render(data);
  } catch (e2) {
    err.textContent = e2.message || "Something went wrong";
    err.hidden = false;
    $("#password").value = "";
    $("#password").focus();
  } finally {
    label.textContent = "Unlock";
    spin.hidden = true;
    btn.disabled = false;
  }
}

$("#gate-form").addEventListener("submit", submit);
