// Server-side gated data endpoint for the Athena Leads site.
//
// The password and the actual contact data live here on the server and are
// only returned after a correct password is supplied — they are never shipped
// to the browser as part of the static bundle. This is a real gate, not a
// client-side "hide the div" trick.
//
// Password: defaults to "athenaleads" but can be overridden by setting a
// SITE_PASSWORD environment variable in the Vercel project.

const PASSWORD = process.env.SITE_PASSWORD || "athenaleads";

const TIERS = [
  {
    id: "bullseye",
    label: "Reach out first",
    blurb:
      "Senior distribution people at a US insuretech peer and a top-3 global broker. Distribution is everything in insuretech — these two are the genuine bullseyes.",
    accent: "#16a34a",
    leads: [
      {
        name: "Albert Clark",
        alt: "Albert Clark-Castaneda",
        company: "NEXT Insurance",
        companyTag: "US insuretech peer",
        role: "Head of National Broker Strategy",
        seniority: "SVP / Head",
        email: "albert.c@nextinsurance.com",
        location: "Houston, TX",
        usBased: true,
        engagement: 15,
        confidence: "High",
        why: "Senior distribution leader at a leading American insuretech. The single best contact on the list — an ideal advisor, design partner, or broker-channel connector.",
        action: "Warm intro — top priority",
      },
      {
        name: "Marc Waite",
        company: "Arthur J. Gallagher",
        companyTag: "Top-3 global broker",
        role: "Area Executive Vice President",
        seniority: "SVP / EVP",
        email: "marc_waite@ajg.com",
        location: "Greater Cleveland, OH",
        usBased: true,
        engagement: 35,
        confidence: "High",
        why: "Senior exec at one of the world's largest insurance brokers. Brokers are the core distribution channel for insuretech — a potential channel partner or customer.",
        action: "Warm intro — top priority",
      },
    ],
  },
  {
    id: "senior-us",
    label: "Senior, US — worth a warm hello",
    blurb:
      "Heavyweight names at major US carriers. A Jordan intro carries weight since they read ChinaTalk. Investment/legal functions, so door-openers more than direct buyers.",
    accent: "#2563eb",
    leads: [
      {
        name: "Steve Lowe",
        alt: "Stephen D. Lowe, CFA",
        company: "Thrivent",
        companyTag: "Fortune 500 insurer",
        role: "SVP & Chief Investment Strategist (Head of Fixed Income)",
        seniority: "SVP / Head",
        email: "steve.lowe@thrivent.com",
        location: "Minneapolis, MN",
        usBased: true,
        engagement: 41,
        confidence: "High",
        why: "A genuinely senior exec at a Fortune 500 insurer. Investment-side rather than product-side, but a high-value door-opener and senior carrier contact.",
        action: "Warm hello / network builder",
      },
      {
        name: "Howard Schrader",
        company: "Chubb",
        companyTag: "Major P&C carrier",
        role: "EVP & General Counsel, Overseas General",
        seniority: "C-suite",
        email: "howard.schrader@chubb.com",
        location: "New York area (list says GA)",
        usBased: true,
        engagement: 8,
        confidence: "Medium",
        why: "C-suite-level name at a major P&C carrier. Legal / international function so a fit-stretch, but a heavyweight brand and seniority.",
        action: "Warm hello if a legal/regulatory angle is relevant",
      },
    ],
  },
  {
    id: "senior-other",
    label: "Senior, but wrong-function or non-US",
    blurb:
      "Formers are fine (per Athena) — so these count. The most senior insurance names in the whole list, but their remits (investments, reinsurance, gov-affairs) or geography limit direct fit.",
    accent: "#7c3aed",
    leads: [
      {
        name: "Aileen Mathieson",
        company: "Aspen Insurance",
        companyTag: "Specialty insurer · likely former",
        role: "Group Chief Investment Officer",
        seniority: "C-suite",
        email: "aileen.mathieson@aspen.co",
        location: "London, UK",
        usBased: false,
        engagement: 2,
        confidence: "High",
        why: "The most senior insurance exec in the entire list — and likely now a 'former' (appears to have departed after the Sompo takeover). Investments remit + UK base, so a notable name more than a direct fit.",
        action: "Optional — brand-name connection",
      },
      {
        name: "Thomas Bashford",
        company: "SCOR",
        companyTag: "Global reinsurer",
        role: "Authorized signatory (Prokurist) — senior manager",
        seniority: "VP / Director",
        email: "tbashford@scor.com",
        location: "Cologne, Germany",
        usBased: false,
        engagement: 21,
        confidence: "Medium",
        why: "A senior figure at a major reinsurer. Reinsurance capacity matters to insuretech, but he's Germany-based and his exact function is unconfirmed.",
        action: "Secondary",
      },
      {
        name: "Duncan Buchanan",
        company: "Prudential plc",
        companyTag: "Asia/Africa life insurer",
        role: "Group Director — Government Relations & Public Policy",
        seniority: "SVP / Head",
        email: "duncan.buchanan@prudentialplc.com",
        location: "London, UK",
        usBased: false,
        engagement: 71,
        confidence: "High",
        why: "Very engaged and senior, but a gov-affairs role focused on Asia/Africa markets — low functional fit for a US insuretech.",
        action: "Skip unless a regulatory / Asia angle emerges",
      },
    ],
  },
  {
    id: "qualify",
    label: "Quick LinkedIn check, then decide",
    blurb:
      "Promising signals but an unconfirmed title or identity. Two minutes on LinkedIn tells you whether to pursue.",
    accent: "#d97706",
    leads: [
      {
        name: "“Will T” (Tylko)",
        company: "Sompo International",
        companyTag: "US specialty insurer",
        role: "Title unconfirmed — confirmed Sompo employee",
        seniority: "Unknown",
        email: "Wtylko@sompo-intl.com",
        location: "Massachusetts",
        usBased: true,
        engagement: 66,
        confidence: "Low",
        why: "A highly engaged contact at a US specialty insurer/reinsurer. Could well be senior — the title just couldn't be confirmed. Worth a 2-minute look.",
        action: "Check LinkedIn, then decide",
      },
      {
        name: "Oscar Health contacts",
        company: "Oscar Health",
        companyTag: "US health insuretech",
        role: "Names/roles couldn't be confirmed",
        seniority: "Unknown",
        email: "lwestbrooks@hioscar.com · ellen@hioscar.com",
        location: "US (likely)",
        usBased: true,
        engagement: 0,
        confidence: "None",
        why: "A relevant peer US health-insuretech in principle, but the two contacts couldn't be identified to specific people or roles.",
        action: "Check LinkedIn; low effort / low certainty",
      },
    ],
  },
];

// Deprioritized — engaged but investment-side, junior, or back-office.
const SKIP = [
  { name: "Jiayi Peng", company: "Zurich (Alt. Asset Mgmt)", role: "Associate Director — asset management", email: "jiayi.peng@zurich.com", engagement: 87, reason: "Most engaged insurance reader of all, but works in the insurer's hedge-fund/PE arm — not an insuretech decision-maker." },
  { name: "David Richter", company: "MetLife Investment Mgmt", role: "Lead Sovereign Strategist — Asia", email: "richter@metlife.com", engagement: 81, reason: "Buy-side EM-debt strategist (Tokyo/Paris); asset-management function." },
  { name: "James Wu-Ea, CFA", company: "Symetra", role: "Credit Analyst — High Yield & Bank Loans", email: "james.wu.ea@symetra.com", engagement: 118, reason: "Highest engagement of anyone, but a junior buy-side analyst." },
  { name: "Wyatt Nechtman", company: "Voya Financial", role: "Quantitative Analyst & Developer", email: "wyatt.nechtman@voya.com", engagement: 52, reason: "Junior quant/dev — possibly a hire, not a BD target." },
  { name: "Aaron Purcell", company: "Principal Financial", role: "Equity Research Analyst (Aligned Investors)", email: "purcell.aaron@principal.com", engagement: 53, reason: "Junior buy-side analyst." },
  { name: "Emme Corbet", company: "Allianz Global Investors", role: "Associate Analyst — Business Analysis", email: "emme.corbet@allianzgi.com", engagement: 101, reason: "Recent-grad junior analyst at the asset-management arm." },
  { name: "Michael Dewey, CFA", company: "FM Global (FM)", role: "Senior Director — Multi-Asset Investments", email: "michael.dewey@fmglobal.com", engagement: 1, reason: "Investment side of a major commercial insurer; not product/distribution." },
  { name: "Frederick Ulbrick", company: "Northwestern Mutual", role: "Director of Portfolio Management (Park Avenue Capital)", email: "frederick.w.ulbrick@nm.com", engagement: 22, reason: "HNW wealth-management portfolio role." },
  { name: "Taylor Kean", company: "Northwestern Mutual", role: "Financial Advisor / Registered Rep", email: "taylor.kean@nm.com", engagement: 12, reason: "Front-line single producer." },
  { name: "Chris Delaney", company: "Aegon / Transamerica", role: "Senior Director — Security Operations", email: "cdelaney@aegonusa.com", engagement: 1, reason: "Internal cybersecurity/IT leadership — not innovation/product." },
  { name: "Motria Savaryn-Roy", company: "Sun Life Financial", role: "Director of Geopolitical Economics", email: "motria.savaryn-roy@sunlife.com", engagement: 1, reason: "Internal macro/geopolitics analyst — explains the ChinaTalk sub; not insuretech-relevant." },
  { name: "Paul Lynch", company: "Prudential plc (Asia)", role: "Regional Director — Government Relations", email: "paul.f.lynch@prudential.com.hk", engagement: 1, reason: "Gov-relations, Asia; only relevant if Asia regulatory help is needed later." },
  { name: "Jeff Macey", company: "Liberty Mutual", role: "Senior Premium Auditor (uncertain)", email: "jeff.macey@libertymutual.com", engagement: 1, reason: "Identity did not hold under verification; back-office function." },
];

const PAYLOAD = {
  generated: "From a 74,741-subscriber ChinaTalk export · roles verified against public sources",
  stats: {
    screened: 74741,
    insuranceContacts: 28,
    priority: 4,
    usBased: 6,
  },
  tiers: TIERS,
  skip: SKIP,
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const supplied = (body && body.password ? String(body.password) : "").trim();

  if (supplied !== PASSWORD) {
    // Small delay to take the edge off brute-forcing.
    setTimeout(() => res.status(401).json({ error: "Incorrect password" }), 400);
    return;
  }

  res.status(200).json(PAYLOAD);
}
