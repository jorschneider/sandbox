"use strict";
/* Bake CRUX coach phrases to MP3 via ElevenLabs.
   Usage:
     XI=<key> node bake.js sample            -> a few clips into ./samples
     XI=<key> node bake.js full <outDir>      -> all phrases into <outDir>, write manifest.js
   Uses curl (respects the sandbox HTTPS proxy + CA bundle). */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const XI = process.env.XI;
if (!XI){ console.error("Missing XI env (ElevenLabs key)"); process.exit(1); }

const VOICE_ID   = "21m00Tcm4TlvDq8ikWAM";   // Rachel — clear, natural
const VOICE_NAME = "Rachel · ElevenLabs";
const MODEL      = "eleven_multilingual_v2";
const OUTPUT     = "mp3_44100_128";
const SETTINGS   = { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true };

/* hash identical to the browser client (FNV-1a 32-bit) */
function clipHash(str){
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* normalize text so ElevenLabs pronounces grades / counts naturally.
   (Only affects audio content — the lookup key is always the raw app string.) */
function ttsText(t){
  return t
    .replace(/(V?\d+)\s*[–—-]\s*(V?\d+)/g, "$1 to $2")  // ranges: V2–V4, 5–8, 2–3
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1 out of $2")       // 6/10 -> 6 out of 10
    .replace(/\s*\/\s*/g, ", ")                            // stray slashes -> pause
    .replace(/(\d+)s\b/g, "$1 seconds")                    // 40s -> 40 seconds
    .replace(/\s*&\s*/g, " and ")                          // & -> and
    .replace(/\s*[–—]\s*/g, ", ")                           // remaining dashes -> pause
    .replace(/\s{2,}/g, " ")
    .trim();
}

function genOne(text, outFile){
  return new Promise((resolve) => {
    const body = JSON.stringify({ text: ttsText(text), model_id: MODEL, voice_settings: SETTINGS });
    const bodyFile = outFile + ".json";
    fs.writeFileSync(bodyFile, body);
    const url = "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID + "?output_format=" + OUTPUT;
    const args = ["-sS", "-w", "%{http_code}", "-o", outFile, "-X", "POST", url,
      "-H", "xi-api-key: " + XI, "-H", "Content-Type: application/json", "-d", "@" + bodyFile];
    execFile("curl", args, { maxBuffer: 1<<20 }, (err, stdout) => {
      try { fs.unlinkSync(bodyFile); } catch(e){}
      const code = (stdout || "").trim().slice(-3);
      let size = 0; try { size = fs.statSync(outFile).size; } catch(e){}
      if (code === "200" && size > 1000){ resolve({ ok: true, size, chars: ttsText(text).length }); }
      else {
        let detail = ""; try { detail = fs.readFileSync(outFile, "utf8").slice(0,200); } catch(e){}
        try { fs.unlinkSync(outFile); } catch(e){}
        resolve({ ok: false, code, detail });
      }
    });
  });
}

async function pool(items, n, worker){
  const results = new Array(items.length);
  let idx = 0;
  async function run(){
    while (idx < items.length){
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({length: n}, run));
  return results;
}

(async () => {
  const mode = process.argv[2] || "sample";

  if (mode === "sample"){
    const dir = path.join(__dirname, "samples");
    fs.mkdirSync(dir, { recursive: true });
    const samples = [
      ["interval",  "Round 3 of 6. Go."],
      ["grades",    "Continuous circuit. Climb an easy boulder (V2–V4), downclimb if safe, then walk straight to the next"],
      ["next",      "Next, Limit boulder 2 of 5"],
      ["complete",  "Session complete. Great work."],
    ];
    for (const [name, text] of samples){
      const out = path.join(dir, name + ".mp3");
      const r = await genOne(text, out);
      console.log(name, JSON.stringify(r), "->", out);
    }
    return;
  }

  // full bake
  const outDir = process.argv[3] || path.join(__dirname, "audio");
  fs.mkdirSync(outDir, { recursive: true });
  const phrases = JSON.parse(fs.readFileSync(path.join(__dirname, "phrases.json"), "utf8"));

  // collision check
  const seen = new Map();
  for (const p of phrases){
    const h = clipHash(p);
    if (seen.has(h) && seen.get(h) !== p){
      console.error("HASH COLLISION:", h, "\n  A:", seen.get(h), "\n  B:", p);
      process.exit(2);
    }
    seen.set(h, p);
  }
  console.log("phrases:", phrases.length, "| unique hashes:", seen.size, "| no collisions");

  let okCount = 0, failCount = 0, skip = 0, chars = 0;
  const fails = [];
  await pool(phrases, 5, async (p) => {
    const h = clipHash(p);
    const out = path.join(outDir, h + ".mp3");
    if (fs.existsSync(out) && fs.statSync(out).size > 1000){ skip++; return; }
    const r = await genOne(p, out);
    if (r.ok){ okCount++; chars += r.chars; if (okCount % 25 === 0) console.log("  baked", okCount, "..."); }
    else { failCount++; fails.push({ p, ...r }); }
  });

  // manifest of available hashes (only those actually on disk)
  const have = {};
  for (const p of phrases){ const h = clipHash(p); if (fs.existsSync(path.join(outDir, h + ".mp3"))) have[h] = 1; }
  const manifest = "window.CRUX_CLIPS=" + JSON.stringify(have) + ";\nwindow.CRUX_VOICE=" + JSON.stringify(VOICE_NAME) + ";\n";
  fs.writeFileSync(path.join(outDir, "manifest.js"), manifest);

  console.log("\n=== BAKE REPORT ===");
  console.log("ok:", okCount, "| skipped(existing):", skip, "| failed:", failCount);
  console.log("chars generated this run:", chars);
  console.log("manifest entries:", Object.keys(have).length, "/", phrases.length);
  if (fails.length){
    console.log("\nfirst failures:");
    fails.slice(0,5).forEach(f => console.log("  [" + f.code + "]", (f.detail||"").replace(/\s+/g," "), "::", f.p.slice(0,40)));
  }
})();
