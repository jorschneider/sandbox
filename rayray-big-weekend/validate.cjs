#!/usr/bin/env node
/* Data guardrail for week.js — run `node rayray-big-weekend/validate.js` before deploying.
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

if (!data) err("week.js did not define window.WEEK_DATA");
else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.weekMonday || "")) err("weekMonday must be YYYY-MM-DD, got: " + data.weekMonday);
  else if (new Date(data.weekMonday + "T12:00:00").getDay() !== 1) err("weekMonday is not a Monday: " + data.weekMonday);
  if (!data.weekLabel) err("weekLabel missing");
  if (!data.updated) err("updated missing");
  const evs = data.events || [];
  if (evs.length < 20 || evs.length > 120) err("suspicious event count: " + evs.length + " (want 20-120)");

  const seen = new Set();
  evs.forEach((e, i) => {
    const tag = "#" + i + " '" + String(e.title || "?").slice(0, 40) + "': ";
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

    const k = keyOf(e);
    if (seen.has(k)) err(tag + "duplicate slug '" + k + "'");
    seen.add(k);
  });
}

if (errors.length) {
  console.error("week.js FAILED validation with " + errors.length + " error(s):");
  errors.forEach((m) => console.error("  ✗ " + m));
  process.exit(1);
}
console.log("week.js OK: " + data.events.length + " entries, " +
  data.events.filter((e) => e.event).length + " dated events, week of " + data.weekMonday);
