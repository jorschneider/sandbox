// Server-side gated data endpoint for the Athena Leads site.
//
// Password and contact data live here on the server and are only returned
// after a correct password — they are never shipped in the static bundle.
// Password defaults to "athenaleads"; override with a SITE_PASSWORD env var.

const PASSWORD = process.env.SITE_PASSWORD || "athenaleads";

const PAYLOAD = {
  meta: {
    kicker: "ChinaTalk × Athena · confidential",
    title: "Insurance readers worth Athena's first calls",
    dek: "The ChinaTalk list, screened for people on real insurance domains and re-read through a U.S. insurtech lens — P&C, commercial, specialty, distribution, and AI-assisted operations. Roles checked against public sources. The few that matter are at the top; the long, very-active investment-side tail is parked on purpose.",
    updated: "June 24, 2026",
  },

  stats: [
    { n: "74,741", label: "subscribers screened" },
    { n: "37,365", label: "active readers (≥1 open)" },
    { n: "6", label: "priority targets" },
    { n: "U.S. P&C", label: "specialty / distribution lens" },
  ],

  sections: [
    {
      id: "priority",
      kicker: "Tier A",
      title: "Priority outreach — buyer discovery",
      note: "Start with market sanity checks, not a pitch: where workflows break, what teams already tried, what budget is real, and what would make a new product trustworthy. Each card has a suggested first ask.",
      kind: "priority",
      leads: [
        {
          rank: 1,
          name: "Sanjay R. Mansukhani",
          role: "Group Chief Information Officer",
          company: "HCI Group",
          tag: "Carrier-tech · P&C ops",
          email: "sanjay.mansukhani@hcigco.com",
          location: "Connecticut",
          usBased: true,
          opens6mo: 211, opens30d: 31, active30: 19,
          confidence: "High",
          why: "The strongest direct carrier-technology fit in the list. HCI owns homeowners and commercial-residential carriers; its Exzeo division runs the operations technology. A natural buyer for workflow automation, AI-assisted operations, and underwriting / claims tooling — and the single most engaged relevant reader here.",
          ask: "20-minute operator interview: which carrier workflows — intake, underwriting, servicing, claims, reinsurance / cat, data quality, integration — are painful enough to actually buy for?",
        },
        {
          rank: 2,
          name: "Albert Clark-Castaneda",
          role: "Head of National Broker Strategy",
          company: "NEXT (ERGO NEXT · Munich Re)",
          tag: "Small-commercial distribution",
          email: "albert.c@nextinsurance.com",
          location: "Texas",
          usBased: true,
          opens6mo: 18, opens30d: 3, active30: 3,
          confidence: "High",
          why: "Owns national broker strategy at a leading U.S. small-business carrier, now inside Munich Re / ERGO. The right person on appetite matching, quote / bind, servicing, and broker workflow integrations — a potential design partner or distribution connector.",
          ask: "What do national brokers still need from digital carriers — better appetite signals, faster quotes, clearer documents, smarter servicing, or workflow integrations?",
        },
        {
          rank: 3,
          name: "Marc Waite",
          role: "Area Executive Vice President",
          company: "Arthur J. Gallagher",
          tag: "Commercial brokerage",
          email: "marc_waite@ajg.com",
          location: "Ohio",
          usBased: true,
          opens6mo: 40, opens30d: 12, active30: 11,
          confidence: "High",
          why: "A senior producer-side voice at one of the largest brokers in the world. Ideal for grounded buyer-discovery on what brokers actually live with week to week: submission prep, carrier-appetite confusion, quote delays, and renewal load.",
          ask: "Broker pain interview: what slows teams down every week, where junior staff lose time, which carrier interfaces are worst, and what a tool must do to earn trust?",
        },
        {
          rank: 4,
          name: "Patrick Richmond",
          role: "President, RT ProExec",
          company: "RT Specialty · Ryan Specialty",
          tag: "Specialty · wholesale",
          email: "prichmond@rtspecialty.com",
          location: "Oklahoma",
          usBased: true,
          opens6mo: 2, opens30d: 1, active30: 1,
          confidence: "High (role)",
          why: "The lowest reader signal in this tier, but among the most strategically relevant names: RT ProExec is a major professional & executive-liability wholesale platform. Valuable if Athena touches specialty lines, D&O / E&O, cyber, submission flow, or broker–underwriter collaboration.",
          ask: "Lead with expertise, not engagement: where is broker–carrier workflow most broken in specialty, which manual tasks create quote delays, and what makes a new tool credible to wholesale brokers?",
        },
        {
          rank: 5,
          name: "Michael “Mick” Moloney",
          role: "Partner, Global Head of Insurance & Asset Management",
          company: "Oliver Wyman",
          tag: "Strategy · market map",
          email: "michael.moloney@oliverwyman.com",
          location: "United States",
          usBased: true,
          opens6mo: 24, opens30d: 18, active30: 15,
          confidence: "High",
          why: "Not a buyer, but probably the best strategy node in the list. He can separate real insurance budgets from AI pilots, see where C-suite buyers are focused, and pressure-test market maps across carriers, brokers, MGAs, and reinsurers.",
          ask: "High-level market map: which U.S. insurance functions are moving from pilot to production, what budget owners care about, and which buyer persona Athena should target first?",
        },
        {
          rank: 6,
          name: "Mario Schlosser",
          role: "Co-Founder & Advisor to the CEO",
          company: "Oscar Health",
          tag: "Insurtech founder",
          email: "mario.schlosser@gmail.com",
          location: "United States",
          usBased: true,
          opens6mo: 15, opens30d: 15, active30: 10,
          confidence: "Med-high · personal email",
          why: "An elite insurtech founder and operator. Health rather than P&C, so a different buyer profile from HCI / RT / Gallagher — but unmatched for regulated-AI judgment, product trust, and scaling insurance operations.",
          ask: "Founder / product advice, not a workflow interview: what makes AI credible in regulated insurance, where not to overpromise, and how to build trust with enterprise buyers.",
        },
      ],
    },

    {
      id: "ecosystem",
      kicker: "Tier B",
      title: "Ecosystem & narrative",
      note: "Not direct buyers — connectors who shape how the industry talks and who it trusts.",
      kind: "priority",
      leads: [
        {
          rank: 7,
          name: "Rob Galbraith",
          role: "Insurance futurist · author",
          company: "Insurance Nerds · Forestview Insights",
          tag: "Narrative · community",
          email: "rdgalbraith2@gmail.com",
          location: "California",
          usBased: true,
          opens6mo: 154, opens30d: 18, active30: 16,
          confidence: "Med-high · personal email",
          why: "A well-known insurance writer and community connector, and a very active reader. Less likely to be a direct buyer, but strong for sharpening Athena's messaging and market language, podcast / event reach, and warm intros across the industry.",
          ask: "Positioning + intros: how should Athena talk about this so insurance people trust it, and who are the five people worth meeting first?",
        },
      ],
    },

    {
      id: "verify",
      kicker: "Confirm first",
      title: "Verify identity before outreach",
      note: "Promising signal, but the export doesn't pin down who they are. Two minutes of checking decides whether to pursue.",
      kind: "verify",
      leads: [
        {
          name: "Ryan Hanley",
          role: "President, Linqura — if it's him",
          company: "commercial-insurance AI",
          tag: "Verify identity",
          email: "Ryan.hanley@hotmail.co.uk",
          location: "England, UK",
          usBased: false,
          opens6mo: 110, opens30d: 11, active30: 9,
          confidence: "Low–medium",
          why: "If the identity holds, highly relevant — commercial-insurance AI and agency revenue (Rogue Risk / Bold Penguin / Trusted Choice orbit). But the record is a UK personal Hotmail with no display name, which argues against the U.S.-based founder. Confirm before any outreach.",
        },
        {
          name: "“Will T.” (Tylko)",
          role: "Title not confirmed",
          company: "Sompo International",
          tag: "U.S. specialty insurer",
          email: "Wtylko@sompo-intl.com",
          location: "Massachusetts",
          usBased: true,
          opens6mo: 68, opens30d: 1, active30: 0,
          confidence: "Low",
          why: "A confirmed Sompo International employee (U.S. specialty insurer / reinsurer) and a reasonably engaged reader — but the title couldn't be pinned down. Could well be senior; a LinkedIn check decides it.",
        },
      ],
    },

    {
      id: "capital",
      kicker: "Context only",
      title: "Senior & capital-markets readers — not first-cycle buyers",
      note: "Several of the most active insurance readers sit here. They're investment-side, legal, or global — useful for insurer balance-sheet / capital-markets context and credibility, but not product buyers for a U.S. workflow startup.",
      kind: "rows",
      leads: [
        { name: "James Wu-Ea, CFA", company: "Symetra Investment Mgmt", role: "Credit Analyst — HY & bank loans", email: "james.wu.ea@symetra.com", opens6mo: 442, note: "Most active insurance reader of all — but a buy-side IC. Balance-sheet / credit lens, not a buyer." },
        { name: "Emme Corbet", company: "Allianz Global Investors", role: "Associate Analyst", email: "emme.corbet@allianzgi.com", opens6mo: 319, note: "Very active, but a junior asset-management analyst." },
        { name: "Kathryn Read", company: "Aon (Austria)", role: "Aon-domain · senior role unconfirmed", email: "kathryn.read@aon.at", opens6mo: 265, note: "Extremely active and at a major broker, but Austria-based and the exec role didn't validate." },
        { name: "Jiayi Peng", company: "Zurich Alternative Asset Mgmt", role: "Associate Director", email: "jiayi.peng@zurich.com", opens6mo: 205, note: "Insurer-owned asset management — capital-markets context, not a workflow buyer." },
        { name: "Duncan Buchanan", company: "Prudential plc", role: "Group Director, Govt Relations", email: "duncan.buchanan@prudentialplc.com", opens6mo: 200, note: "Senior and very active, but global / life and gov-affairs — outside the U.S. P&C lens." },
        { name: "David Richter", company: "MetLife Investment Mgmt", role: "Lead Sovereign Strategist, Asia", email: "richter@metlife.com", opens6mo: 86, note: "Macro / sovereign-risk lens; not direct GTM." },
        { name: "Steve Lowe, CFA", company: "Thrivent", role: "SVP & Chief Investment Strategist", email: "steve.lowe@thrivent.com", opens6mo: 49, note: "Genuinely senior at a Fortune 500 insurer, but investment-side — a credibility contact more than a buyer." },
        { name: "Howard Schrader", company: "Chubb", role: "EVP & General Counsel, Overseas General", email: "howard.schrader@chubb.com", opens6mo: 0, note: "C-suite-level but legal / international — a senior relationship, not a first-cycle buyer." },
        { name: "Aileen Mathieson", company: "Aspen Insurance", role: "Group CIO (likely former)", email: "aileen.mathieson@aspen.co", opens6mo: 0, note: "The most senior insurance name overall, but CIO / investments and UK — capital context only." },
      ],
    },

    {
      id: "parked",
      kicker: "Parked",
      title: "De-prioritized for the first cycle",
      note: "At insurers, but junior, back-office, or outside the U.S. P&C / specialty scope. Revisit only if the product broadens.",
      kind: "rows",
      leads: [
        { name: "Thomas Bashford", company: "SCOR", role: "Senior signatory — reinsurance", email: "tbashford@scor.com", note: "Solid reinsurance profile, but non-U.S." },
        { name: "Ish Babbar", company: "InsuranceDekho", role: "Insurtech (India)", email: "ish.babbar@insurancedekho.com", note: "Strong founder / CTO profile, but India — not U.S. commercial / specialty." },
        { name: "Aaron Purcell", company: "Principal", role: "Equity Research Analyst", email: "purcell.aaron@principal.com", note: "Asset / investment-adjacent IC." },
        { name: "Wyatt Nechtman", company: "Voya Financial", role: "Quant Analyst & Developer", email: "wyatt.nechtman@voya.com", note: "Junior technical IC — possibly a hire, not a target." },
        { name: "Frederick Ulbrick", company: "Northwestern Mutual", role: "Director, Portfolio Management", email: "frederick.w.ulbrick@nm.com", note: "HNW wealth management." },
        { name: "Taylor Kean", company: "Northwestern Mutual", role: "Financial Advisor", email: "taylor.kean@nm.com", note: "Front-line single producer." },
        { name: "Michael Dewey, CFA", company: "FM Global", role: "Sr Director, Multi-Asset Investments", email: "michael.dewey@fmglobal.com", note: "Investment side of a commercial insurer." },
        { name: "Chris Delaney", company: "Aegon / Transamerica", role: "Sr Director, Security Operations", email: "cdelaney@aegonusa.com", note: "Internal IT security." },
        { name: "Motria Savaryn-Roy", company: "Sun Life", role: "Director, Geopolitical Economics", email: "motria.savaryn-roy@sunlife.com", note: "Internal macro analyst (Canada)." },
        { name: "Paul Lynch", company: "Prudential (Asia)", role: "Regional Director, Govt Relations", email: "paul.f.lynch@prudential.com.hk", note: "Gov-relations, Hong Kong." },
        { name: "Jeff Macey", company: "Liberty Mutual", role: "Premium auditor (uncertain)", email: "jeff.macey@libertymutual.com", note: "Identity didn't hold under verification; back-office." },
      ],
    },
  ],
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
    setTimeout(() => res.status(401).json({ error: "Incorrect password" }), 400);
    return;
  }

  res.status(200).json(PAYLOAD);
}
