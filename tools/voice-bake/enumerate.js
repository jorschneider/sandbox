"use strict";
/* Replays CRUX's deterministic builder + announcement logic to enumerate
   EVERY phrase the app can speak, across all focus/duration/grade combos. */

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function range(maxV, belowHard, belowEasy){
  const lo = Math.max(0, maxV - belowHard);
  const hi = Math.max(0, maxV - belowEasy);
  return lo === hi ? ("V" + lo) : ("V" + lo + "–V" + hi);
}
function limitRange(maxV){
  const lo = Math.max(0, maxV - 1);
  return "V" + lo + "–V" + (maxV + 1);
}
function seg(kind, label, sub, seconds, rpe){
  return { kind, label, sub, seconds: Math.max(5, Math.round(seconds)), rpe: rpe || null };
}
function warmup(total, g){
  const pulse = clamp(total*0.08, 90, 300);
  const easy  = clamp(total*0.12, 150, 420);
  return [
    seg("warmup", "Pulse raiser",
        "Get the blood moving — easy bike, brisk walk, or stairs, plus shoulder circles, wrist prep and hip openers.", pulse, 4),
    seg("warmup", "Easy climbs + downclimb",
        "5–8 very easy boulders (" + range(g,6,4) + "). Downclimb whenever it's safe. No hard starts, no max moves.", easy, 4),
  ];
}
function cooldown(total, g){
  const flush = clamp(total*0.05, 90, 240);
  const stretch = clamp(total*0.045, 90, 180);
  return [
    seg("cool", "Flush traverse",
        "Easy traversing or 2–3 very easy climbs (" + range(g,7,5) + ") to flush the forearms. Stop before the fingers feel cooked.", flush, 3),
    seg("cool", "Stretch & shake out",
        "Shake out forearms. Gentle wrist, shoulder, lat, pec and hip stretches. Breathe it down.", stretch, 2),
  ];
}
function pad(total, g){
  const w = warmup(total, g), c = cooldown(total, g);
  const used = w.concat(c).reduce((a,s)=>a+s.seconds,0);
  return { w, c, main: Math.max(180, total - used) };
}
function buildCardio(total, g){
  const { w, c, main } = pad(total, g);
  const work = range(g,4,2);
  const segs = [...w];
  const rec = clamp(main*0.06, 45, 120);
  let rounds = clamp(Math.round((main*0.30)/60), 4, 14);
  const intervalTotal = rounds * 60;
  const cont = Math.max(120, main - intervalTotal - 2*rec);
  const cont1 = Math.round(cont*0.55), cont2 = cont - cont1;
  segs.push(seg("work", "Continuous circuit",
    "Climb an easy boulder (" + work + "), downclimb if safe, then walk straight to the next. Keep moving the whole time — steady sweat, around 6/10.", cont1, 6));
  segs.push(seg("rest", "Recover", "Walk it off, shake out, sip water. Pick your interval problems.", rec, 2));
  for (let i = 1; i <= rounds; i++){
    segs.push(seg("work", "Interval " + i + "/" + rounds,
      "40s on: keep climbing on big holds and open hands. Step off before failure — never come off pumped-out.", 40, 7));
    segs.push(seg("rest", "Off", "Down. Breathe. Chalk up for the next one.", 20, 1));
  }
  segs.push(seg("rest", "Recover", "Shake out the forearms. One more push to come.", rec, 2));
  segs.push(seg("work", "Second-wind circuit",
    "Back on: easy boulders (" + work + "), climb-downclimb-walk. Smooth and continuous — empty the tank without falling.", cont2, 6));
  return [...segs, ...c];
}
function buildPowerEndurance(total, g){
  const { w, c, main } = pad(total, g);
  const segs = [...w];
  const rounds  = clamp(Math.round(main / 330), 2, 6);
  const per = main / rounds;
  const workWin = clamp(per * 0.55, 120, 240);
  const restWin = Math.max(90, per - workWin);
  const grd = range(g,3,1);
  for (let i = 1; i <= rounds; i++){
    segs.push(seg("work", "Round " + i + "/" + rounds + " — 4×4",
      "Climb 4 boulders (" + grd + ") back-to-back with minimal rest between them. Vary it: one slab, one vertical, one overhang, one juggy.", workWin, 8));
    segs.push(seg("rest", "Full rest", "Sit down, chalk up, recover properly. Plan your next four.", restWin, 1));
  }
  return [...segs, ...c];
}
function buildTechnique(total, g){
  const { w, c, main } = pad(total, g);
  const drills = [
    ["Silent feet", "Climb easy problems (" + range(g,5,3) + ") placing every foot in total silence. No re-adjusting, no scraping. Slow and deliberate."],
    ["Hover & place", "Hover each foot over the hold for a beat before weighting it. Eyes on the foot until it lands. Precision over speed."],
    ["Straight-arm flagging", "Stay on straight arms. Use a flag to stop the swing instead of a hand. Hips into the wall."],
    ["Slow-motion control", "Climb a moderate problem (" + range(g,4,2) + ") at half speed, controlling every move. Pause and balance at each hold."],
    ["Quiet downclimbing", "Downclimb easy problems with control. Builds footwork, body awareness and stamina at the same time."],
  ];
  const n = clamp(Math.round(main / 240), 3, 5);
  const per = main / n;
  const restSec = clamp(per * 0.22, 45, 90);
  const workSec = (main - (n - 1) * restSec) / n;
  const segs = [...w];
  for (let i = 0; i < n; i++){
    const [name, sub] = drills[i];
    segs.push(seg("work", name, sub, workSec, 5));
    if (i < n - 1) segs.push(seg("rest", "Reset", "Step off, relax, mentally rehearse the next drill.", restSec, 1));
  }
  return [...segs, ...c];
}
function buildStrength(total, g){
  const { w, c, main } = pad(total, g);
  const n = clamp(Math.round(main / 300), 2, 8);
  const per = main / n;
  const grd = limitRange(g);
  const segs = [...w];
  for (let i = 1; i <= n; i++){
    const workSec = clamp(per * 0.30, 60, 150);
    const restSec = clamp(per - workSec, 90, 240);
    segs.push(seg("work", "Limit boulder " + i + "/" + n,
      "Pick something near your limit (" + grd + "). 2–4 quality attempts — fight for it, but stop while moves are crisp.", workSec, 9));
    segs.push(seg("rest", "Rest hard", "Sit down. Full recovery — strength needs it. Pick or re-try a problem for the next round.", restSec, 1));
  }
  return [...segs, ...c];
}
function buildMixed(total, g){
  const { w, c, main } = pad(total, g);
  const segs = [...w];
  const blocks = [
    seg("work", "Easy volume",    "Continuous easy circuit (" + range(g,5,3) + "): climb, downclimb, walk on. Build the pump gently.", main*0.22, 6),
    seg("rest", "Recover",        "Walk it off. Sip water.", main*0.08, 2),
    seg("work", "Moderate 4×4",   "4 boulders (" + range(g,3,1) + ") back-to-back, minimal rest. Mix the styles.", main*0.20, 7),
    seg("rest", "Full rest",      "Sit, chalk up, recover.", main*0.10, 1),
    seg("work", "Limit attempts", "2–3 hard tries on something near your limit (" + limitRange(g) + "). Quality over quantity.", main*0.14, 9),
    seg("rest", "Rest",           "Shake out. Breathe.", main*0.08, 1),
    seg("work", "Power-endurance burn", "Find a pumpy circuit or traverse: 45s on / climb continuously, step off before failure.", main*0.18, 8),
  ];
  return [...segs, ...blocks, ...c];
}
const MOVEMENT_DRILLS = [
  ["One-hand climbing", "Climb an easy problem using only one hand — the other hovers off. Switch hands each go. Forces precise feet and body position."],
  ["One foot off", "Climb using only one foot; the other flags to balance. Swap feet between attempts. Builds tension and trust on the working foot."],
  ["Hover hand & lock-off", "Climb statically: before every hand move, lock off and hover your hand over the hold for two seconds, then place it. Control over the swing."],
  ["Nose to the wall", "Before each reach, bring your nose toward the next hold — get hips and chest into the wall before you pull. Move your body, not just your arm."],
  ["No-hands slab", "On a slab, hands off — see how high you climb on feet alone. Weight through the toes and trust the rubber."],
  ["Precision touch", "Reach for the next hold and freeze a beat right before you touch it, then land it exactly. No regrips, no readjusting."],
  ["Silent feet", "Place every foot in total silence — no scraping, no banging, no re-adjusting. Slow and deliberate."],
  ["Straight-arm traverse", "Traverse with arms straight. Use flags and hip turns to stay on the wall instead of pulling in."],
  ["Open-hand only", "Climb easy problems using only open-hand grips — no crimping. Builds resilient fingers and trust in friction."],
  ["Quiet downclimbing", "Downclimb easy problems under control. Doubles your footwork mileage and builds stamina."],
  ["Slow-motion control", "Climb a moderate problem at half speed, pausing and balancing at every hold. Own each position."],
  ["Foot swaps", "Mid-route, practise quiet, precise foot swaps on a single foothold. Tiny, accurate movements."],
];
function buildMovement(total, g){
  const { w, c, main } = pad(total, g);
  const n = clamp(Math.round(main / 210), 4, 7);
  const restSec = clamp(main * 0.05, 30, 75);
  const workSec = (main - (n - 1) * restSec) / n;
  const off = ({ 900:0, 1800:3, 2700:6, 3600:9 })[total] || 0;
  const segs = [...w];
  for (let i = 0; i < n; i++){
    const [name, sub] = MOVEMENT_DRILLS[(off + i) % MOVEMENT_DRILLS.length];
    segs.push(seg("work", name, sub, workSec, 5));
    if (i < n - 1) segs.push(seg("rest", "Reset", "Step off, relax, mentally rehearse the next drill.", restSec, 1));
  }
  return [...segs, ...c];
}

const FOCI = [
  { id:"cardio",    build:buildCardio },
  { id:"power",     build:buildPowerEndurance },
  { id:"technique", build:buildTechnique },
  { id:"strength",  build:buildStrength },
  { id:"movement",  build:buildMovement },
  { id:"mixed",     build:buildMixed },
];

function spokenLabel(s){
  return s.label.replace(/(\d+)\/(\d+)/, "$1 of $2").replace(/\s*—.*$/, "").replace(/×/g, " by ").trim();
}
function announceText(s){
  if (s.kind === "work") return spokenLabel(s) + ". Go.";
  return spokenLabel(s) + ".";
}
// First time a drill/instruction appears in a session the coach explains it.
// MUST match longAnnounceTextOf() in boulder/index.html exactly.
function longAnnounceText(s){
  return spokenLabel(s) + ". " + (s.sub || "") + (s.kind === "work" ? " Go." : "");
}

/* ---- enumerate ---- */
const DURS = [15, 30, 45, 60];
const phrases = new Set();

// fixed phrases (incl. the 3-2-1 count-in words)
["Session complete. Great work.", "Paused.", "Voice on.",
 "One", "Two", "Three"].forEach(p => phrases.add(p));

for (const f of FOCI){
  for (const dur of DURS){
    for (let g = 0; g <= 12; g++){
      const segs = f.build(dur * 60, g);
      const seenSub = new Set();                     // per-session: explain each instruction once
      for (let i = 0; i < segs.length; i++){
        const s = segs[i];
        phrases.add(announceText(s));               // on entering the segment
        if (s.sub && !seenSub.has(s.sub)){           // first occurrence -> full explanation clip
          seenSub.add(s.sub);
          phrases.add(longAnnounceText(s));
        }
        phrases.add("Next, " + spokenLabel(s));      // heads-up for the upcoming segment
        phrases.add("Resuming. " + spokenLabel(s));  // after un-pausing on this segment
      }
    }
  }
}

// explicit coverage for every movement drill (independent of rotation selection)
for (const [name] of MOVEMENT_DRILLS){
  const s = { kind: "work", label: name };
  phrases.add(announceText(s));
  phrases.add("Next, " + spokenLabel(s));
  phrases.add("Resuming. " + spokenLabel(s));
}

const list = [...phrases].filter(p => p && p.trim()).sort();
console.log("UNIQUE_PHRASES=" + list.length);
const chars = list.reduce((a,p)=>a+p.length,0);
console.log("TOTAL_CHARS=" + chars);
require("fs").writeFileSync(
  process.argv[2] || "/dev/stdout",
  JSON.stringify(list, null, 0)
);
console.error("---- sample ----");
list.slice(0, 40).forEach(p => console.error("· " + p));
