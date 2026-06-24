// Content for TRACK ONE. Every fact is drawn from Matt Sheehan's essay,
// "Who should the U.S. talk to in China on AI?" (June 2026). The roster,
// tracks, and scenario deck were authored and then adversarially
// fact-checked and balance-checked against that source; dominated options
// and over-stated ratings were corrected. The engine (game.js) is fully
// data-driven, so this file is the single source of truth.

export const DATA = {

  /* ---------------- THE ROSTER ---------------- *
   * power    = real internal political influence (1–5)
   * openness = experience & willingness to engage foreign officials (1–5)
   * The article's central tension lives in the gap between these two:
   * the powerful (CAC, NDRC) are closed; the open (MFA) are lighter on clout. */
  actors: [
    { id: 'cac', name: 'CAC', fullName: 'Cyberspace Administration of China',
      kind: 'mixed', tag: 'The Regulator', power: 5, openness: 1,
      leader: 'Cai Qi · chairs the parent Cyberspace Affairs Commission',
      blurb: "China's lead AI regulator: mandatory model registration and pre-deployment testing. Built for 'content security,' now widening to frontier risk. A direct line to power — but party-centric and largely domestic-facing." },

    { id: 'ndrc', name: 'NDRC', fullName: 'National Development and Reform Commission',
      kind: 'state', tag: 'The Coordinator', power: 5, openness: 2,
      leader: 'Zheng Shanjie · He Lifeng protégé',
      blurb: "A 'super-ministry' macro-planner tasked after ChatGPT with coordinating AI policy across the government. Leads the AI+ diffusion plan. Deep ties to He Lifeng — and almost no foreign-engagement track record." },

    { id: 'most', name: 'MOST', fullName: 'Ministry of Science and Technology',
      kind: 'mixed', tag: 'The Big Picture', power: 3, openness: 3,
      leader: 'Yin Hejun · director of the CSTC office',
      blurb: "'The OSTP of China.' Wrote the 2017 AI plan; now home of the Party's science commission office. Advises leadership on the long-run trajectory; sent a former AI scientist to the UK Safety Summit." },

    { id: 'miit', name: 'MIIT', fullName: 'Ministry of Industry and Information Technology',
      kind: 'state', tag: 'Tech Support', power: 4, openness: 3,
      leader: 'Zhang Guoqing · led the 2025 Paris delegation',
      blurb: "Leads industrial applications of AI. Co-signs the CAC's regulations and does the technical legwork — testing, certification, standards — often through CAICT." },

    { id: 'mfa', name: 'MFA', fullName: 'Ministry of Foreign Affairs',
      kind: 'state', tag: 'The Diplomats', power: 3, openness: 5,
      leader: 'Central Foreign Affairs Commission',
      blurb: "Leads China's global AI diplomacy and multilateral engagement. Fluent abroad — but not a power center on domestic AI policy." },

    { id: 'mfa_arms', name: 'MFA · Arms Control', fullName: 'MFA Department of Arms Control',
      kind: 'subordinate', tag: 'AI Coordinator', power: 2, openness: 5,
      leader: "'Coordinator for AI affairs'",
      blurb: "The MFA unit given the AI-coordination brief; its chief holds the title 'coordinator for AI affairs.' A real upgrade on the North America Department that led in 2024." },

    { id: 'mof', name: 'MOF', fullName: 'Ministry of Finance',
      kind: 'state', tag: 'The Treasury Parallel', power: 3, openness: 3,
      leader: 'Liao Min · helped set up the dialogue',
      blurb: "Little direct role in AI — but VM Liao Min helped set up these talks, and the Finance–Treasury parallel could make it a convener of the dialogue." },

    { id: 'mss', name: 'MSS', fullName: 'Ministry of State Security',
      kind: 'state', tag: 'The Spies', power: 4, openness: 1,
      leader: '—',
      blurb: "The foreign intelligence service. Involved in testing and evaluation around cyber vulnerabilities — relevant to AI-misuse testing, allergic to foreigners in the room." },

    { id: 'mps', name: 'MPS', fullName: 'Ministry of Public Security',
      kind: 'state', tag: 'The Enforcers', power: 3, openness: 2,
      leader: '—',
      blurb: "The law-enforcement side of AI regulation. Important domestically, peripheral to a frontier-AI dialogue." },

    { id: 'mofcom', name: 'MOFCOM', fullName: 'Ministry of Commerce',
      kind: 'state', tag: 'Export Controls', power: 3, openness: 4,
      leader: '—',
      blurb: "Handles trade and export controls. Externally engaged, but its file is chips and tariffs, not AI governance." },

    { id: 'tc260', name: 'TC260', fullName: 'National Cybersecurity Standards Committee',
      kind: 'subordinate', tag: 'The Standards Node', power: 2, openness: 2,
      leader: 'under the CAC',
      blurb: "The standards body under the CAC. Its new AI Safety/Security Working Group (WG9) co-wrote the Framework 2.0 risk taxonomy and is becoming a key node on frontier-risk testing. Delighted to convene; cannot sign treaties." },

    { id: 'cncert', name: 'CNCERT', fullName: 'National Computer Emergency Response Team',
      kind: 'subordinate', tag: 'Cyber Responders', power: 2, openness: 2,
      leader: 'under the CAC',
      blurb: "The CAC's cybersecurity coordinator; co-author of the AI Safety & Governance Framework 2.0. A real expert node on cross-border-threat testing, with no authority to commit the state." },

    { id: 'caict', name: 'CAICT', fullName: 'China Academy of Information and Communications Technology',
      kind: 'subordinate', tag: 'The Test Lab', power: 2, openness: 3,
      leader: 'under MIIT',
      blurb: "MIIT's technical institute. Does much of the actual testing, evaluation, and certification work behind China's AI standards. Useful for a working group, not a counterpart with clout." },

    { id: 'nda', name: 'NDA', fullName: 'National Data Administration',
      kind: 'subordinate', tag: 'The Data Office', power: 3, openness: 2,
      leader: 'under the NDRC',
      blurb: "Created in 2023 to unleash data as a productive force — taking some data turf from the CAC. A young, narrow administration that touches AI policy through data." },

    { id: 'cnaisda', name: 'CnAISDA', fullName: 'China AI Safety and Development Association',
      kind: 'subordinate', tag: "The Faux AISI", power: 2, openness: 4,
      leader: 'under NDRC · Andrew Yao, Xue Lan',
      blurb: "China's first pass at an 'AI safety institute' — but an association of existing labs (Shanghai AI Lab, CAICT), not a true counterpart to the UK AISI or US CAISI. A tempting distractor on safety." },
  ],

  /* ---------------- THE TRACKS ---------------- */
  topics: [
    { id: 'testing', title: 'Frontier Model Testing & Standards',
      prompt: 'Mandatory testing, evaluation, and technical standards for frontier AI models.',
      idealActorIds: ['cac'],
      plausibleActorIds: ['tc260', 'cncert', 'caict', 'mss'],
      rationale: "The CAC built China's mandatory registration and pre-deployment testing regime — good for a working group, even if its roots are in 'content security' rather than catastrophic risk. TC260/CNCERT are its technical nodes." },

    { id: 'policy', title: 'Overarching AI Policy',
      prompt: 'The whole-of-government balance between developing AI and governing it.',
      idealActorIds: ['ndrc'],
      plausibleActorIds: ['most', 'cac', 'nda'],
      rationale: "After ChatGPT, leadership tasked the NDRC with coordinating AI policy across ministries. It's the natural counterpart for the big-picture conversation — and the logical delegation lead." },

    { id: 'science', title: 'Scientific Trajectory & Long-Term Risk',
      prompt: 'Where the science is heading, and the strategic, long-run impacts of AI.',
      idealActorIds: ['most'],
      plausibleActorIds: ['cnaisda', 'ndrc', 'cac'],
      rationale: "MOST advises the top leadership on S&T trajectory through the Party's science commission, and sent a former AI scientist to the UK Safety Summit. The right room for the long view." },

    { id: 'applications', title: 'Real-World Applications & Industry Standards',
      prompt: 'Deploying AI across industry, and the conformity standards that come with it.',
      idealActorIds: ['miit'],
      plausibleActorIds: ['caict', 'cac', 'ndrc'],
      rationale: "MIIT leads on industrial applications, co-signs the CAC's rules, and does the technical standards-and-testing work, much of it through CAICT." },

    { id: 'international', title: 'International & Multilateral Governance',
      prompt: 'Global AI governance — summits, multilateral rules, the diplomatic arena.',
      idealActorIds: ['mfa'],
      plausibleActorIds: ['mfa_arms', 'most', 'ndrc'],
      rationale: "The MFA leads China's global AI diplomacy (with the Central Foreign Affairs Commission behind it). For the multilateral file, the diplomats are the right counterpart." },

    { id: 'lead', title: 'Lead of the Chinese Delegation',
      prompt: 'Who heads the delegation and sets its agenda — the single most consequential pick.',
      idealActorIds: ['ndrc'],
      plausibleActorIds: ['mfa_arms', 'mof', 'mfa'],
      rationale: "The NDRC's coordinating role and ties to He Lifeng make it the strongest lead. If not the NDRC, the MFA's Arms Control Department — the 'coordinator for AI affairs' — is the fallback." },
  ],

  /* ---------------- THE SCENARIO DECK ---------------- *
   * Effects are {trust, progress, usBacking, chinaBuyin}, each −20…+20.
   * Every option sits on the Pareto frontier — no choice strictly dominates. */
  scenarios: [
    { id: 'who-leads', title: 'Who Sits at the Head of the Table', relatedTopic: 'lead',
      situation: "Beijing proposes the delegation be led, as in 2024, by the MFA's Department of North American and Oceanian Affairs — smooth, English-speaking, used to managing Americans. Your China hands note that desk handles the relationship, not the substance: it can host you beautifully and decide nothing. The article's preferred lead is the MFA's Department of Arms Control, whose chief actually holds the title 'coordinator for AI affairs' — or, better still, the NDRC.",
      options: [
        { label: 'Accept the North America Desk as lead — keep the channel warm.',
          effects: { trust: 10, progress: 2, usBacking: 3, chinaBuyin: -8 },
          feedback: "The most comfortable counterpart is the one organized to manage you, not to deliver. You will have lovely meetings about nothing." },
        { label: "Insist the Arms Control Dept — the 'coordinator for AI affairs' — take the lead.",
          effects: { trust: -5, progress: 8, usBacking: 4, chinaBuyin: 7 },
          feedback: "Routing through the actual AI coordinator is the article's upgrade — friction now, but you're at least talking to the title that owns the file." },
        { label: 'Push for the NDRC to lead, given its cross-ministry mandate.',
          effects: { trust: -9, progress: 6, usBacking: -3, chinaBuyin: 14 },
          feedback: "The NDRC coordinates AI policy across ministries and is tied to He Lifeng — but it doesn't do diplomacy, and demanding it spooks the people who do." },
        { label: 'Keep the MFA out front, seat the NDRC as substantive co-chair.',
          effects: { trust: 8, progress: 6, usBacking: 4, chinaBuyin: 5 },
          feedback: "Diplomats run the room, the coordinator owns the substance — the article's pragmatic middle. Two seats, one awkward handoff." },
      ] },

    { id: 'treasury-channel', title: 'The Treasury Parallel', relatedTopic: 'policy',
      situation: "Secretary Bessent's standing counterpart is He Lifeng — Vice Premier, Politburo member, former NDRC chair, the man who runs the CFEAC office. Liao Min, the MOF vice minister who helped set up this dialogue, quietly suggests anchoring AI in the economic channel, Finance-to-Treasury, where the relationship already works. Your AI staff worry the file gets swallowed by tariffs and capital flows.",
      options: [
        { label: 'Anchor the dialogue in the Bessent–He Lifeng economic channel.',
          effects: { trust: 6, progress: -3, usBacking: 8, chinaBuyin: 13 },
          feedback: "He Lifeng can actually deliver — that's the whole point — but pour AI into the economic channel and it competes with everything Treasury already fights about." },
        { label: 'Use Liao Min as a coordinating side-channel; keep AI on its own track.',
          effects: { trust: 7, progress: 6, usBacking: 5, chinaBuyin: 4 },
          feedback: "A Finance-to-Treasury back channel for plumbing, a dedicated track for substance. Tidy — if both halves actually talk to each other." },
        { label: 'Decline; keep AI insulated from the economic relationship entirely.',
          effects: { trust: -2, progress: 5, usBacking: 7, chinaBuyin: -9 },
          feedback: "Your own side likes keeping AI clear of trade concessions — but you forfeit your only proven line to someone with Politburo-level clout." },
      ] },

    { id: 'cac-testing', title: "Whose Definition of 'Testing'", relatedTopic: 'testing',
      situation: "On frontier-model testing the article's pick is clear: the CAC and its bodies TC260 (the WG9 safety working group) and CNCERT, who built China's mandatory registration and pre-deployment testing. But across the table the CAC keeps steering 'safety' back to content security — political risk, lawful speech, information control — not the cross-border catastrophic risks you came to discuss.",
      options: [
        { label: 'Engage the CAC on its terms; accept the content-security framing for now.',
          effects: { trust: 9, progress: -4, usBacking: -3, chinaBuyin: 8 },
          feedback: "You get the right office and the wrong subject. Their 'testing' is about what a model says, not whether it helps build a weapon." },
        { label: "Reframe around TC260's WG9 and Framework 2.0 — frontier risk specifically.",
          effects: { trust: 3, progress: 11, usBacking: 5, chinaBuyin: 4 },
          feedback: "Anchor on the new AI-safety working group and the shared framework, and 'safety' starts to mean the thing you both actually fear." },
        { label: "Push past the CAC toward MIIT's technical testing bodies instead.",
          effects: { trust: -6, progress: 12, usBacking: 4, chinaBuyin: -7 },
          feedback: "CAICT and the standards labs do the real evaluation work — but the CAC is the office wired to power, and going around it is noticed." },
      ] },

    { id: 'binding-vs-best-practice', title: 'Binding Commitments or Best Practices', relatedTopic: 'testing',
      situation: "The article's most promising topic is sharing best practices on testing models for mutual, border-crossing threats. Your principals want something signable — a binding commitment — to show the summit produced more than talk. The Chinese side will trade information freely but stiffens the moment 'binding' or 'verification' appears.",
      options: [
        { label: 'Hold out for a binding, verifiable testing commitment.',
          effects: { trust: -10, progress: 9, usBacking: 6, chinaBuyin: -8 },
          feedback: "Binding is what your bosses want and what theirs cannot give early. You may win the clause and lose the room." },
        { label: 'Settle for a structured best-practice exchange on cross-border threats.',
          effects: { trust: 11, progress: 7, usBacking: -4, chinaBuyin: 3 },
          feedback: "The article's actual recommendation: start where information flows. Modest, durable, and easy to mock back home as 'just talking.'" },
        { label: 'Spend domestic backing to upgrade best-practice into a pilot with milestones.',
          effects: { trust: 4, progress: 8, usBacking: -9, chinaBuyin: 9 },
          feedback: "Leverage: burn political capital to harden a soft win into something with deliverables. Expensive, but it gives the thing teeth." },
      ] },

    { id: 'party-vs-state', title: 'Party Bodies or Comfortable Ministries', relatedTopic: 'policy',
      situation: "Here is the central tension in one decision. The state ministries — MFA, MOST, MIIT — are experienced, available, and pleasant to deal with, but real authority increasingly sits in Party commissions: the Central Cyberspace Affairs Commission (now chaired by Cai Qi, Xi's chief of staff), the CSTC, the CFEAC. You can keep talking to people who pick up the phone, or chase the people who actually decide.",
      options: [
        { label: 'Work the state ministries — engage-able, experienced, willing.',
          effects: { trust: 12, progress: 6, usBacking: 2, chinaBuyin: -10 },
          feedback: "Easy to convene, light on clout. You'll have a productive dialogue with people who must phone someone else to agree to anything." },
        { label: 'Press for visibility into the Party commissions where power sits.',
          effects: { trust: -8, progress: 4, usBacking: 3, chinaBuyin: 14 },
          feedback: "Reaching toward Cai Qi's commission touches real authority — and powerful actors spook when foreigners reach for them too directly." },
        { label: 'Layer it: ministries at the table, a quiet Party-channel above.',
          effects: { trust: 5, progress: 5, usBacking: -5, chinaBuyin: 8 },
          feedback: "The realistic compromise — work the willing, signal to the powerful. It costs capital to run two tracks and trust neither fully." },
      ] },

    { id: 'most-trajectory', title: "A Back Channel to the Leadership's Ear", relatedTopic: 'science',
      situation: "MOST is no longer a frontline regulator, but after the 2023 reorg it houses the office of the revived Central Science and Technology Commission, chaired by Ding Xuexiang. Its job now is advising top leadership on where the technology is going. You could use MOST less to negotiate and more to put a sober reading of AI's long-run trajectory — and its catastrophic tails — in front of people who matter.",
      options: [
        { label: 'Use MOST as a quiet channel to brief leadership on long-run risk.',
          effects: { trust: 8, progress: 5, usBacking: 1, chinaBuyin: 9 },
          feedback: "MOST can't sign much, but via the CSTC it whispers to the people who can. A long bet on shifting how the top understands the stakes." },
        { label: 'Treat MOST as a working partner on concrete science cooperation.',
          effects: { trust: 10, progress: 7, usBacking: -2, chinaBuyin: -3 },
          feedback: "Real, friendly, technically rich — and largely indirect to power now. Good science, modest leverage on governance." },
        { label: "Pass — MOST's regulatory role is gone; don't overinvest.",
          effects: { trust: -4, progress: -2, usBacking: 4, chinaBuyin: -5 },
          feedback: "You save your bandwidth and forfeit the one apolitical line into the leadership's understanding of the science. Efficient, maybe shortsighted." },
      ] },

    { id: 'mss-cyber', title: 'The Spies in the Testing Room', relatedTopic: 'testing',
      situation: "When the conversation reaches testing models for cyber-vulnerability exploitation, the Chinese side indicates the Ministry of State Security — its foreign intelligence service — would have to be involved, since cyber threat assessment is partly their turf. Sharing how you red-team models for offensive cyber capability with an intelligence service is exactly the kind of thing that makes your own agencies nervous.",
      options: [
        { label: 'Accept the MSS at the table for cyber-vuln testing discussions.',
          effects: { trust: 6, progress: 8, usBacking: -11, chinaBuyin: 7 },
          feedback: "On cyber, the spies are unavoidable — but inviting the MSS in burns interagency goodwill back home faster than almost anything else you can do." },
        { label: 'Wall off cyber-vuln testing; keep it to civilian safety bodies only.',
          effects: { trust: -5, progress: -4, usBacking: 9, chinaBuyin: -3 },
          feedback: "Your agencies sleep better and the most operationally relevant testing topic stays off the table. Safe, and a little hollow." },
        { label: 'Propose abstracted methodology-sharing — no live vulnerabilities, no MSS.',
          effects: { trust: 4, progress: 5, usBacking: 3, chinaBuyin: -2 },
          feedback: "Talk about how you test, never what you find. Threads the needle, and skeptics on both sides will call it security theater." },
      ] },

    { id: 'cnaisda-aisi', title: 'Is the CnAISDA an AISI?', relatedTopic: 'science',
      situation: "Beijing offers the China AI Safety and Development Association as its node opposite your CAISI and the UK AISI — launched with fanfare at the 2025 Paris summit, fronted by names like Andrew Yao and Xue Lan. Your staff flag that it's an 'association' of existing bodies under the NDRC, not a real institute with its own mandate, staff, or testing capacity. Treating it as a peer would be a category error; refusing the only thing on offer leaves you with no counterpart node at all.",
      options: [
        { label: 'Accept the CnAISDA as the formal AISI counterpart.',
          effects: { trust: 10, progress: -6, usBacking: -7, chinaBuyin: 4 },
          feedback: "You get a named partner and a photo. You also legitimize an association-of-associations as the equal of an institute that actually tests models." },
        { label: 'Engage it pragmatically without granting peer-institute status.',
          effects: { trust: 4, progress: 6, usBacking: 3, chinaBuyin: 2 },
          feedback: "Use it as a convening shell while reaching the real bodies inside it — Shanghai AI Lab, CAICT. Honest about what it is, useful for what it can pass along." },
        { label: 'Insist on a true testing institute or no AISI-track at all.',
          effects: { trust: -8, progress: 2, usBacking: 6, chinaBuyin: -6 },
          feedback: "You hold the line on what 'institute' means and may get nothing for it — China's AISI doesn't exist to be insisted into being." },
      ] },

    { id: 'miit-applications', title: 'Standards Where the Products Are', relatedTopic: 'applications',
      situation: "On real-world applications and industry standards the article points to MIIT, which does much of the technical work behind the CAC's rules through bodies like CAICT, and is overseen by Vice Premier Zhang Guoqing — who led China's 2025 Paris delegation. MIIT is eager: standards cooperation is concrete, deliverable, and flattering to both sides. The risk is spending your limited time polishing interoperability specs while the governance questions that brought you here go untouched.",
      options: [
        { label: 'Lean into MIIT — build out applications and standards cooperation.',
          effects: { trust: 9, progress: 8, usBacking: 6, chinaBuyin: -4 },
          feedback: "Standards work is the easiest win in the building and the safest to show your bosses. It also quietly defines 'AI cooperation' downward." },
        { label: "Use MIIT's Zhang Guoqing tie to elevate testing standards toward leadership.",
          effects: { trust: 4, progress: 7, usBacking: 2, chinaBuyin: 9 },
          feedback: "Zhang led Paris; routing standards through his shop links the technical work to a Vice Premier. Substance with an upward cable attached." },
        { label: 'Keep MIIT narrow; reserve bandwidth for frontier-safety tracks.',
          effects: { trust: -3, progress: 3, usBacking: 6, chinaBuyin: -2 },
          feedback: "You decline the easy deliverable to protect the hard one. Disciplined — and you may go home with neither if the hard track stalls." },
      ] },

    { id: 'international-mfa', title: 'Bilateral, or Punt to the UN', relatedTopic: 'international',
      situation: "On multilateral governance the MFA and the Central Foreign Affairs Commission push to frame AI cooperation through global forums — China's Global AI Governance Initiative, the UN track, the next big summit. It's where the MFA is strongest and most comfortable. But the article is blunt that the most important AI-governance actions are domestic, not bilateral, and that diffusing this dialogue into multilateral process is a way to look busy while committing to nothing.",
      options: [
        { label: 'Embrace the multilateral frame — work it through the MFA and CFAC.',
          effects: { trust: 11, progress: -5, usBacking: -4, chinaBuyin: 2 },
          feedback: "The most diplomatic move and the least consequential. Everyone signs a communiqué about future communiqués; no model gets tested." },
        { label: 'Keep it bilateral and concrete; treat multilateral as garnish.',
          effects: { trust: -6, progress: 9, usBacking: 7, chinaBuyin: 3 },
          feedback: "You hold the dialogue to things that bite, which the article favors — at the cost of the warm multilateral optics China prefers." },
        { label: 'Trade a multilateral gesture for a concrete bilateral testing pilot.',
          effects: { trust: 6, progress: 6, usBacking: -3, chinaBuyin: 6 },
          feedback: "Give them the summit photo, take home the pilot. Horse-trading optics for substance — provided they actually deliver the substance." },
      ] },
  ],

  /* ---------------- PROSE ---------------- */
  copy: {
    brief: [
      "<p>In May, after the Trump&ndash;Xi summit, Washington and Beijing agreed to open the first government-to-government dialogue on artificial intelligence. Agreeing to <em>talk</em> is the easy part.</p>",
      "<p class='pull'>The hard question: who in China do you actually talk to?</p>",
      "<p>You are the U.S. delegation, led by Treasury Secretary Bessent. China's AI apparatus is a thicket of ministries, commissions, and standards bodies &mdash; and here's the trap: <strong>the people most willing to meet you often hold the least power, and the people with real power rarely take the meeting.</strong></p>",
      "<p>Staff each track with the right counterpart. Survive the negotiation. Bring home something better than a photo op.</p>",
    ],

    meters: {
      trust:      { name: 'Trust',        short: 'Trust' },
      progress:   { name: 'Progress',     short: 'Prog' },
      usBacking:  { name: 'U.S. Backing',  short: 'U.S.' },
      chinaBuyin: { name: 'China Buy-In',  short: 'Buy-in' },
    },

    endings: {
      breakthrough: { name: 'Breakthrough Communiqué', gradeLabel: 'A',
        lead: "The delegations announce a substantive joint framework on AI testing and shared risk &mdash; the rare U.S.&ndash;China document with verbs in it." },
      working: { name: 'Working-Level Progress', gradeLabel: 'B',
        lead: "The two sides stood up working groups and set a date to meet again. Modest, real, and more than the last round produced." },
      stalemate: { name: 'A Polite Stalemate', gradeLabel: 'C',
        lead: "The delegations had a 'candid and constructive' exchange &mdash; diplomatic for: nobody moved, but nobody walked." },
      adjourn: { name: 'Adjourned Without a Date', gradeLabel: 'D',
        lead: "Talks closed with warm words and no follow-up scheduled, which in this business is a quiet way of saying not yet." },
      recrimination: { name: 'Recriminations', gradeLabel: 'F',
        lead: "Each side briefed its own press blaming the other. The dialogue survives mainly as a grievance now." },
      collapse: { name: 'The Talks Collapse', gradeLabel: 'F',
        lead: "A delegation walked. What began as a dialogue ended as a readout each capital wrote alone." },
      distrust: { name: 'An Agreement Nobody Trusts', gradeLabel: 'C',
        lead: "On paper, real progress. Beneath it, two delegations that got things done without ever quite believing each other &mdash; a deal built on sand." },
      vibes: { name: 'Great Chemistry, No Deliverables', gradeLabel: 'C',
        lead: "Warm, genuine, almost friendly &mdash; and nearly empty. You built a relationship and forgot to build an agreement." },
      lonely: { name: 'Out Ahead of Washington', gradeLabel: 'C',
        lead: "You reached the people with real power in Beijing &mdash; then looked over your shoulder to find your own interagency hadn't followed." },
    },

    // one sentence per meter, chosen by band (high / mid / low)
    frag: {
      trust: {
        high: "Trust between the delegations is genuine; back-channels stay open and calls get returned.",
        mid:  "Trust is workmanlike &mdash; enough to keep meeting, not enough to take risks.",
        low:  "Trust is thin to the point of suspicion; every clause is read for traps." },
      progress: {
        high: "On substance the talks moved: concrete testing practices and a real forward agenda.",
        mid:  "Substantively, a few deliverables survived contact with reality.",
        low:  "Substantively little changed; the communiqué is mostly adjectives." },
      usBacking: {
        high: "Washington is aligned behind the delegation, interagency and the Hill nodding along.",
        mid:  "The U.S. side holds together, with the usual grumbling from the hawks.",
        low:  "Back home the delegation is exposed, accused of giving away more than it got." },
      chinaBuyin: {
        high: "Crucially, China brought real authority to the table &mdash; Party weight, not just protocol.",
        mid:  "China sent competent officials, though how far they can bind the system is unclear.",
        low:  "China sent the engage-able, not the powerful; whatever was agreed may not survive the trip up the chain." },
      close: {
        wellStaffed: "Credit the staffing: the U.S. matched each track to the counterpart who actually owns it, and it showed.",
        mixed:       "The delegation was a mixed bag &mdash; some tracks well-matched, others talking to the wrong building.",
        misStaffed:  "The seating chart was off from the start: too many tracks aimed at offices that don't hold the pen.", },
    },

    outroCredit: "Tracks and org chart drawn from Matt Sheehan's essay, &lsquo;Who should the U.S. talk to in China on AI?&rsquo; (June 2026). A work of informed satire: the bureaucracy is real, the dialogue imagined.",
  },
};
