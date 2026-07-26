#!/usr/bin/env node
/* Data guardrail for week.js — run `node rayray-big-weekend/validate.cjs` before deploying.
   Exits non-zero with readable errors if the week's data is malformed. */
const fs = require("fs");
const path = require("path");

global.window = {};
eval(fs.readFileSync(path.join(__dirname, "week.js"), "utf8"));
const data = global.window.WEEK_DATA;

const CATS = ["music", "theater", "storytime", "play", "animals", "festival", "other"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "any"];
const TIMES = ["morning", "afternoon", "evening", "any"];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const keyOf = (e) => e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

const errors = [];
const err = (m) => errors.push(m);

// shared per-event schema checks; datedOnly = every entry must be a real dated event
function validateEventList(evs, prefix, datedOnly) {
  const seen = new Set();
  evs.forEach((e, i) => {
    const tag = prefix + "#" + i + " '" + String(e.title || "?").slice(0, 40) + "': ";
    ["title", "category", "venue", "neighborhood", "when", "cost", "travelHow", "toddlerNotes", "url"].forEach((f) => {
      if (!e[f] || typeof e[f] !== "string") err(tag + "missing/empty " + f);
    });
    if (CATS.indexOf(e.category) === -1) err(tag + "bad category " + e.category);
    if (!Array.isArray(e.days) || !e.days.length || !e.days.every((d) => DAYS.indexOf(d) !== -1)) err(tag + "bad days " + JSON.stringify(e.days));
    if (!Array.isArray(e.times) || !e.times.length || !e.times.every((x) => TIMES.indexOf(x) !== -1)) err(tag + "bad times " + JSON.stringify(e.times));
    if (typeof e.travelMinutes !== "number" || e.travelMinutes < 1 || e.travelMinutes > 60) err(tag + "bad travelMinutes " + e.travelMinutes);
    if (typeof e.lat !== "number" || e.lat < 40.6 || e.lat > 40.85) err(tag + "lat out of NYC bounds: " + e.lat);
    if (typeof e.lng !== "number" || e.lng < -74.1 || e.lng > -73.9) err(tag + "lng out of NYC bounds: " + e.lng);
    if (typeof e.event !== "boolean") err(tag + "event flag must be boolean");
    if (typeof e.outdoor !== "boolean") err(tag + "outdoor flag must be boolean");
    if (!/^https?:\/\//.test(e.url || "")) err(tag + "bad url " + e.url);
    if (["high", "medium", "low"].indexOf(e.confidence) === -1) err(tag + "bad confidence " + e.confidence);

    const anyTimes = e.times && e.times.indexOf("any") !== -1;
    if (e.start != null) {
      if (!HM.test(e.start)) err(tag + "start not HH:MM: " + e.start);
      else if (anyTimes) err(tag + "has a start time but times=['any']");
      else {
        const h = parseInt(e.start.slice(0, 2), 10);
        const expect = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
        const first = ["morning", "afternoon", "evening"].find((b) => e.times.indexOf(b) !== -1);
        if (first !== expect) err(tag + "start " + e.start + " disagrees with times " + JSON.stringify(e.times));
      }
    } else if (!anyTimes) err(tag + "timed entry (times=" + JSON.stringify(e.times) + ") missing start");
    if (e.end != null && (!HM.test(e.end) || (e.start && e.end <= e.start))) err(tag + "bad end " + e.end);
    if (e.event === true && (!e.days || e.days.indexOf("any") !== -1)) err(tag + "event=true but days=['any']");
    if (datedOnly && (e.event !== true || (e.days || []).indexOf("any") !== -1)) {
      err(tag + "next-week preview entries must be dated events (event=true, real days) — evergreens carry over automatically");
    }

    const k = keyOf(e);
    if (seen.has(k)) err(tag + "duplicate slug '" + k + "'");
    seen.add(k);
  });
}

// itineraries: exec-sum plans (morning / afternoon / evening); slugMap = resolvable events
function validateItineraries(its, slugMap, prefix) {
  const SLOT_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const SLOTS = ["morning", "afternoon", "evening"];
  SLOT_DAYS.forEach((d) => {
    const it = its[d];
    const tag = prefix + "itinerary." + d + ": ";
    if (!it) { err(tag + "missing"); return; }
    if (!it.summary || typeof it.summary !== "string") err(tag + "missing summary");
    if (!Array.isArray(it.picks) || it.picks.length < 4 || it.picks.length > 9) {
      err(tag + "picks must be an array of 4-9 (2-3 options per slot)"); return;
    }
    const perSlot = { morning: 0, afternoon: 0, evening: 0 };
    const dayKeys = new Set();
    it.picks.forEach((p) => {
      if (perSlot[p.slot] != null) perSlot[p.slot] += 1;
      if (dayKeys.has(p.key)) err(tag + "duplicate pick '" + p.key + "'");
      dayKeys.add(p.key);
    });
    ["morning", "afternoon"].forEach((s) => {
      if (perSlot[s] < 2 || perSlot[s] > 3) err(tag + s + " needs 2-3 options, has " + perSlot[s]);
    });
    if (perSlot.evening > 3) err(tag + "evening has " + perSlot.evening + " options (max 3)");
    it.picks.forEach((p) => {
      const ptag = tag + "pick '" + String(p.key || "?").slice(0, 40) + "': ";
      if (SLOTS.indexOf(p.slot) === -1) { err(ptag + "bad slot " + p.slot); return; }
      if (!p.note || typeof p.note !== "string") err(ptag + "missing note");
      const e = slugMap[p.key];
      if (!e) { err(ptag + "key does not match any event slug"); return; }
      if (e.days.indexOf("any") === -1 && e.days.indexOf(d) === -1) {
        err(ptag + "event does not happen on " + d + " (days=" + JSON.stringify(e.days) + ")");
      }
      if (e.start) {
        const min = parseInt(e.start.slice(0, 2), 10) * 60 + parseInt(e.start.slice(3), 10);
        const endM = e.end ? parseInt(e.end.slice(0, 2), 10) * 60 + parseInt(e.end.slice(3), 10) : null;
        // no nap constraint — midday is fair game. Just keep the pick in a slot
        // that matches its start (open-hours entries can sit in a later slot if
        // they're still running then).
        const runsInto = (afterMin) => endM != null && endM >= afterMin;
        if (p.slot === "morning" && min >= 12 * 60) err(ptag + "morning pick starts " + e.start);
        if (p.slot === "afternoon" && min >= 17 * 60) err(ptag + "afternoon pick starts " + e.start + " (that's evening)");
        if (p.slot === "evening" && min < 16 * 60 && !runsInto(18 * 60)) {
          err(ptag + "evening pick starts " + e.start + " and doesn't run into the evening");
        }
      }
    });
  });
}

if (!data) err("week.js did not define window.WEEK_DATA");
else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.weekMonday || "")) err("weekMonday must be YYYY-MM-DD, got: " + data.weekMonday);
  else if (new Date(data.weekMonday + "T12:00:00").getDay() !== 1) err("weekMonday is not a Monday: " + data.weekMonday);
  if (!data.weekLabel) err("weekLabel missing");
  if (!data.updated) err("updated missing");
  const evs = data.events || [];
  if (evs.length < 20 || evs.length > 400) err("suspicious event count: " + evs.length + " (want 20-400)");
  validateEventList(evs, "", false);

  const bySlug = {};
  evs.forEach((e) => { bySlug[keyOf(e)] = e; });
  if (!data.itineraries || typeof data.itineraries !== "object") {
    err("itineraries missing — every week needs a per-day plan (see UPDATE.md)");
  } else validateItineraries(data.itineraries, bySlug, "");

  // ——— next-week preview: optional (a freshly promoted week has none until the
  // next research pass fills it) — but validate it when present ———
  if (data.nextWeek == null) {
    // no preview yet; the "Next week" tab simply hides
  } else if (typeof data.nextWeek !== "object") {
    err("nextWeek must be an object when present");
  } else {
    const nw = data.nextWeek;
    const p = (data.weekMonday || "").split("-").map(Number);
    const d7 = new Date(p[0], p[1] - 1, p[2] + 7);
    const pad = (n) => String(n).padStart(2, "0");
    const expect = d7.getFullYear() + "-" + pad(d7.getMonth() + 1) + "-" + pad(d7.getDate());
    if (nw.weekMonday !== expect) err("nextWeek.weekMonday should be " + expect + ", got " + nw.weekMonday);
    if (!nw.weekLabel) err("nextWeek.weekLabel missing");
    const nevs = nw.events || [];
    if (nevs.length < 8 || nevs.length > 80) err("nextWeek: suspicious event count " + nevs.length + " (want 8-80)");
    validateEventList(nevs, "nextWeek ", true);
    if (nw.itineraries) {
      // optional until Monday's refresh; picks may resolve to preview events or carryovers
      const union = {};
      evs.concat(nevs).forEach((e) => { if (!union[keyOf(e)]) union[keyOf(e)] = e; });
      validateItineraries(nw.itineraries, union, "nextWeek ");
    }
  }
}

if (errors.length) {
  console.error("week.js FAILED validation with " + errors.length + " error(s):");
  errors.forEach((m) => console.error("  ✗ " + m));
  process.exit(1);
}
console.log("week.js OK: " + data.events.length + " entries, " +
  data.events.filter((e) => e.event).length + " dated events, week of " + data.weekMonday +
  (data.nextWeek ? " · next-week preview: " + (data.nextWeek.events || []).length + " events" : ""));

// ——— non-fatal coverage report: flag day-parts with no Union-Sq-visible dated
// event. The UI backfills these with nearby anytime spots, but the Monday routine
// should aim to fill afternoon AND evening every day with REAL events. ———
(function coverage() {
  const DK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const bk = (e) => {
    const t = e.times || ["any"];
    if (t.indexOf("any") !== -1) return "any";
    return ["morning", "afternoon", "evening"].find((b) => t.indexOf(b) !== -1) || "any";
  };
  const gaps = [];
  DK.forEach((d) => {
    const dated = (data.events || []).filter((e) => e.event === true && !e.cpwOnly && (e.days || []).indexOf(d) !== -1);
    ["afternoon", "evening"].forEach((slot) => {
      if (!dated.some((e) => bk(e) === slot)) gaps.push(d + " " + slot);
    });
  });
  if (gaps.length) {
    console.log("⚠ coverage: no Union-Sq-visible dated events for " + gaps.length +
      " day-part(s): " + gaps.join(", ") + " (UI backfills with nearby spots; prefer real events).");
  } else {
    console.log("coverage OK: every day has a Union-Sq afternoon and evening event.");
  }
})();
