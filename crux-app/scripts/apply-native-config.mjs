/* Applies CRUX's native tweaks after `npx cap add ios/android`, idempotently,
   so a CI runner needs no manual Xcode/Android Studio editing. Best-effort:
   it never throws — if a file/marker isn't found it logs and moves on, so a
   Capacitor template change can't break the build. */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");

async function patch(file, label, fn) {
  try {
    if (!existsSync(file)) { console.log(`· skip ${label} (not generated yet): ${file}`); return; }
    const before = await readFile(file, "utf8");
    const after = fn(before);
    if (after == null) { console.log(`· skip ${label} (marker not found)`); return; }
    if (after !== before) { await writeFile(file, after); console.log(`✓ patched ${label}`); }
    else console.log(`· ${label} already patched`);
  } catch (e) { console.log(`! ${label} patch failed (non-fatal): ${e.message}`); }
}

/* ---- iOS: duck background music during cues + keep the screen awake ---- */
await patch(join(app, "ios", "App", "App", "AppDelegate.swift"), "iOS AppDelegate", (s) => {
  if (s.includes("CRUX_NATIVE_AUDIO")) return s;
  if (!s.includes("import AVFoundation")) {
    s = s.replace(/import Capacitor/, "import Capacitor\nimport AVFoundation");
  }
  const marker = "didFinishLaunchingWithOptions";
  const mi = s.indexOf(marker);
  if (mi === -1) return null;
  const brace = s.indexOf("{", mi);
  if (brace === -1) return null;
  const inject = `
        // CRUX_NATIVE_AUDIO: cues duck background music (Spotify/Apple Music) instead of pausing it
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers, .duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch { print("CRUX AudioSession error: \\(error)") }
        UIApplication.shared.isIdleTimerDisabled = true   // keep screen awake during a session
`;
  return s.slice(0, brace + 1) + inject + s.slice(brace + 1);
});

/* ---- Android: keep the screen on ---- */
function findMainActivity() {
  const base = join(app, "android", "app", "src", "main", "java");
  if (!existsSync(base)) return null;
  let found = null;
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "MainActivity.java" || name === "MainActivity.kt") found = p;
    }
  })(base);
  return found;
}
const mainAct = findMainActivity();
if (mainAct) {
  const isKt = mainAct.endsWith(".kt");
  await patch(mainAct, "Android MainActivity", (s) => {
    if (s.includes("FLAG_KEEP_SCREEN_ON")) return s;
    const flag = isKt
      ? `        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)`
      : `        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);`;
    // insert right after super.onCreate(...)
    const re = /super\.onCreate\([^)]*\)\s*;?/;
    const m = s.match(re);
    if (!m) return null;
    const at = s.indexOf(m[0]) + m[0].length;
    return s.slice(0, at) + "\n" + flag + s.slice(at);
  });
} else {
  console.log("· skip Android MainActivity (not generated yet)");
}

console.log("native config pass complete");
