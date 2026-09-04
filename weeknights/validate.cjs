#!/usr/bin/env node
/* Data guardrail for the Weeknights site.
   Run `node weeknights/validate.cjs` before every deploy.
   Exits non-zero with readable errors if either data file is malformed. */
const fs = require("fs");
const path = require("path");

const ATHENA_CATS = ["yoga", "ballet", "dance", "pilates", "barre"];
// chess and pingpong were tried and cut — Jordan isn't interested. Don't re-add.
const JORDAN_CATS = ["grappling", "striking", "mma", "soccer", "run"];
// Martial arts keep the original hard rule: a 15-minute WALK, no exceptions.
const MARTIAL_CATS = ["grappling", "striking", "mma"];
const DAYS = ["mon", "tue", "wed", "thu", "fri"];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_WALK = 15;   // martial arts, and everything on Athena's side
const MAX_TRAVEL = 25; // everything else, door-to-door by whatever route

// what the slider actually filters on: the best realistic door-to-door time
const travelOf = (v) => (typeof v.travelMinutes === "number" ? v.travelMinutes : v.walkMinutes);

const keyOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const toMin = (hm) => parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3), 10);

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function load(file, globalName) {
  global.window = {};
  eval(fs.readFileSync(path.join(__dirname, file), "utf8"));
  return global.window[globalName];
}

function validateSide(data, label, allowedCats) {
  if (!data) { err(label + ": data object missing"); return; }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.weekMonday || "")) {
    err(label + ": weekMonday must be YYYY-MM-DD, got " + data.weekMonday);
  } else if (new Date(data.weekMonday + "T12:00:00").getDay() !== 1) {
    err(label + ": weekMonday is not a Monday: " + data.weekMonday);
  }
  if (!data.weekLabel) err(label + ": weekLabel missing");
  if (!data.updated) err(label + ": updated missing");
  if (!data.who) err(label + ": who missing");
  if (data.favoriteVenue != null && !(data.venues || {})[data.favoriteVenue]) {
    err(label + ": favoriteVenue '" + data.favoriteVenue + "' is not in the venues map");
  }
  // ISHTA is Athena's favourite and its classes must lead her lists. Losing the
  // field would silently reshuffle her whole page, so it is not optional.
  if (label === "athena.js" && data.favoriteVenue !== "ISHTA Yoga") {
    err(label + ": favoriteVenue must stay 'ISHTA Yoga' — it is Athena's favourite " +
      "and its classes sort first (got " + JSON.stringify(data.favoriteVenue) + ")");
  }

  // ——— venues ———
  const venues = data.venues || {};
  const venueNames = Object.keys(venues);
  if (venueNames.length < 3) err(label + ": only " + venueNames.length + " venues (want 3+)");
  venueNames.forEach((name) => {
    const v = venues[name];
    const tag = label + " venue '" + name + "': ";
    ["address", "neighborhood", "url"].forEach((f) => {
      if (!v[f] || typeof v[f] !== "string") err(tag + "missing/empty " + f);
    });
    if (!/^https?:\/\//.test(v.url || "")) err(tag + "bad url " + v.url);
    if (typeof v.lat !== "number" || v.lat < 40.6 || v.lat > 40.85) err(tag + "lat out of NYC bounds: " + v.lat);
    if (typeof v.lng !== "number" || v.lng < -74.1 || v.lng > -73.9) err(tag + "lng out of NYC bounds: " + v.lng);
    if (typeof v.walkMinutes !== "number" || v.walkMinutes < 1) err(tag + "bad walkMinutes " + v.walkMinutes);
    if (v.travelMinutes != null) {
      if (typeof v.travelMinutes !== "number" || v.travelMinutes < 1) err(tag + "bad travelMinutes " + v.travelMinutes);
      else if (v.travelMinutes > v.walkMinutes) {
        err(tag + "travelMinutes " + v.travelMinutes + " is slower than just walking (" + v.walkMinutes + ") — drop it");
      }
      if (!v.travelHow || typeof v.travelHow !== "string") {
        err(tag + "has travelMinutes but no travelHow — say which train or bus");
      }
    }
    if (travelOf(v) > MAX_TRAVEL) {
      err(tag + "is " + travelOf(v) + " min door-to-door, past the " + MAX_TRAVEL +
        "-minute cap — this venue does not belong on the site");
    }
  });

  // ——— teachers (optional per side; keyed by venue) ———
  Object.keys(data.teachers || {}).forEach((venue) => {
    const t = data.teachers[venue];
    const tag = label + " teachers['" + venue + "']: ";
    if (!venues[venue]) err(tag + "not a venue in the venues map");
    if (t.url && !/^https?:\/\//.test(t.url)) err(tag + "bad url " + t.url);
    if (!Array.isArray(t.seniors) || !t.seniors.length) err(tag + "needs at least one senior teacher");
    else t.seniors.forEach((s, i) => {
      ["name", "title", "note"].forEach((f) => {
        if (!s[f] || typeof s[f] !== "string") err(tag + "senior #" + i + " missing " + f);
      });
    });
    if (t.faculty && !t.faculty.every((n) => typeof n === "string" && n.trim())) {
      err(tag + "faculty must be a list of non-empty names");
    }
  });

  // ——— events ———
  const evs = data.events || [];
  if (evs.length < 5 || evs.length > 60) err(label + ": suspicious class count " + evs.length + " (want 5-60)");

  const seen = new Set();
  const bySlug = {};
  evs.forEach((e, i) => {
    const tag = label + " #" + i + " '" + String(e.title || "?").slice(0, 40) + "': ";
    ["title", "venue", "discipline", "level", "when", "cost", "url", "notes"].forEach((f) => {
      if (!e[f] || typeof e[f] !== "string") err(tag + "missing/empty " + f);
    });
    if (allowedCats.indexOf(e.category) === -1) err(tag + "category '" + e.category + "' not one of " + allowedCats.join("/"));
    if (!venues[e.venue]) err(tag + "venue '" + e.venue + "' is not in the venues map");
    else if (MARTIAL_CATS.indexOf(e.category) !== -1 && venues[e.venue].walkMinutes > MAX_WALK) {
      err(tag + "martial arts at a venue " + venues[e.venue].walkMinutes + " min away on foot — " +
        "the " + MAX_WALK + "-minute WALK rule holds for grappling/striking/mma, no exceptions");
    }
    if (!/^https?:\/\//.test(e.url || "")) err(tag + "bad url " + e.url);
    if (["high", "medium", "low"].indexOf(e.confidence) === -1) err(tag + "bad confidence " + e.confidence);
    if (typeof e.timeVerified !== "boolean") err(tag + "timeVerified must be boolean");

    if (!Array.isArray(e.days) || !e.days.length || !e.days.every((d) => DAYS.indexOf(d) !== -1)) {
      err(tag + "days must be a non-empty subset of Mon-Fri, got " + JSON.stringify(e.days));
    }
    if (!HM.test(e.start || "")) err(tag + "start not HH:MM: " + e.start);
    else if (toMin(e.start) < 16 * 60) err(tag + "start " + e.start + " is not an evening class (want 16:00 or later)");
    if (e.end != null) {
      if (!HM.test(e.end)) err(tag + "end not HH:MM: " + e.end);
      else if (toMin(e.end) <= toMin(e.start || "00:00")) err(tag + "end " + e.end + " is not after start " + e.start);
    }
    if (e.notes && e.notes.length < 80) warn(tag + "notes are thin (" + e.notes.length + " chars) — this site earns its keep on the notes");

    const k = keyOf(e.title || "");
    if (seen.has(k)) err(tag + "duplicate slug '" + k + "'");
    seen.add(k);
    bySlug[k] = e;
  });

  // ——— itineraries ———
  const its = data.itineraries || {};
  DAYS.forEach((d) => {
    const it = its[d];
    const tag = label + " itinerary." + d + ": ";
    if (!it) { err(tag + "missing — every weeknight needs a plan"); return; }
    if (!it.summary || typeof it.summary !== "string") err(tag + "missing summary");
    if (!Array.isArray(it.picks) || it.picks.length < 2 || it.picks.length > 4) {
      err(tag + "picks must be an array of 2-4 options, got " + (it.picks || []).length);
      return;
    }
    const dayKeys = new Set();
    it.picks.forEach((p) => {
      const ptag = tag + "pick '" + String(p.key || "?").slice(0, 40) + "': ";
      if (!p.note || typeof p.note !== "string") err(ptag + "missing note");
      if (dayKeys.has(p.key)) err(ptag + "duplicate pick");
      dayKeys.add(p.key);
      const e = bySlug[p.key];
      if (!e) { err(ptag + "key does not match any class slug"); return; }
      if ((e.days || []).indexOf(d) === -1) {
        err(ptag + "class does not run on " + d + " (days=" + JSON.stringify(e.days) + ")");
      }
    });
  });

  return { evs, venues, bySlug };
}

const athena = load("athena.js", "ATHENA_DATA");
const jordan = load("jordan.js", "JORDAN_DATA");

const a = validateSide(athena, "athena.js", ATHENA_CATS);
const j = validateSide(jordan, "jordan.js", JORDAN_CATS);

// the two sides must describe the same week
if (athena && jordan && athena.weekMonday !== jordan.weekMonday) {
  err("athena.js and jordan.js are on different weeks (" + athena.weekMonday + " vs " + jordan.weekMonday + ")");
}

if (warns.length) {
  console.log("⚠ " + warns.length + " warning(s):");
  warns.forEach((m) => console.log("  · " + m));
}

if (errors.length) {
  console.error("Weeknights data FAILED validation with " + errors.length + " error(s):");
  errors.forEach((m) => console.error("  ✗ " + m));
  process.exit(1);
}

[["athena.js", athena, a], ["jordan.js", jordan, j]].forEach(([name, d, r]) => {
  const pinned = r.evs.filter((e) => e.timeVerified).length;
  console.log(name + " OK: " + r.evs.length + " classes across " + Object.keys(r.venues).length +
    " venues, " + pinned + " with pinned times, week of " + d.weekMonday);
});

// ——— non-fatal coverage report ———
(function coverage() {
  const gaps = [];
  [["athena", athena], ["jordan", jordan]].forEach(([who, d]) => {
    DAYS.forEach((day) => {
      const n = (d.events || []).filter((e) => (e.days || []).indexOf(day) !== -1).length;
      if (n < 2) gaps.push(who + " " + day + " (" + n + ")");
    });
  });
  if (gaps.length) {
    console.log("⚠ coverage: fewer than 2 classes on " + gaps.length + " night(s): " + gaps.join(", "));
  } else {
    console.log("coverage OK: every weeknight has at least 2 options for both of them.");
  }
})();
