# CRUX — App Store / Play Store build

This wraps the CRUX web app (`../boulder`) in a native iOS + Android shell using
[Capacitor](https://capacitorjs.com), so it can be submitted to the App Store and
Google Play. The web app in `boulder/` is **not modified** — it's copied into `www/`
at build time and a small `native-bridge.js` is injected for native haptics, the
status bar, and the splash screen.

Everything ships **inside the app bundle** (all 573 voice clips included), so it
works fully offline and reads as a real app to App Review — not "just a website".

---

## What you need

| | iOS | Android |
|---|---|---|
| Machine | **macOS** + **Xcode** + CocoaPods (`sudo gem install cocoapods`) | macOS/Windows/Linux + **Android Studio** + SDK |
| Account | **Apple Developer Program — $99/year** | **Google Play — $25 one-time** |
| Node | Node 18+ | Node 18+ |

> iOS builds/signing/submission **must** happen on a Mac (or a cloud Mac CI like
> Codemagic / Ionic Appflow / GitHub Actions macOS runners). Android can be done
> anywhere.

---

## One-time setup

```sh
cd crux-app
npm install

# 1. Bundle the web app into www/ (copies ../boulder + injects the bridge)
npm run build:web

# 2. Generate the native projects
npx cap add ios          # macOS only
npx cap add android

# 3. Generate all icon + splash sizes from assets/  (icon.png, splash.png, …)
npm run assets

# 4. Copy web + config into the native projects
npx cap sync
```

> `npm run assets` runs `@capacitor/assets` (via `npx`), which uses `sharp` to
> resize the source art in `assets/`. It's deliberately **not** a core dependency
> so a `sharp` install hiccup can't block `npm install`. If asset generation ever
> fails on your machine, the source `assets/icon.png` (1024) and `assets/splash.png`
> (2732) are ready to drop into Xcode's asset catalog / Android Studio by hand, or
> paste into [icon.kitchen](https://icon.kitchen).

Set your own bundle identifier first in **`capacitor.config.json`** (`appId`).
Use a reverse-domain you control, e.g. `com.yourname.crux`.

---

## Native tweaks (do these once, in the generated projects)

These give the app its two best native behaviors: **keep the screen awake** and
**duck your music instead of pausing it**.

### iOS — `ios/App/App/AppDelegate.swift`
Add `import AVFoundation` at the top, and inside
`application(_:didFinishLaunchingWithOptions:)`:

```swift
// Coaching cues duck background music (Spotify, Apple Music) instead of pausing it.
do {
    try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers, .duckOthers])
    try AVAudioSession.sharedInstance().setActive(true)
} catch { print("AudioSession error: \(error)") }

// Keep the screen on during a session.
UIApplication.shared.isIdleTimerDisabled = true
```

### Android — `android/app/src/main/java/.../MainActivity.java`
Inside `onCreate(...)` after `super.onCreate(...)`:

```java
getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
```

Android ducks transient audio automatically; no extra audio config needed.

> Optional upgrade: for *per-session* keep-awake (instead of whole-app), add the
> `@capacitor-community/keep-awake` plugin and call it from the bridge. The flag
> above is simpler and fine for a workout app you open to train.

---

## Build & submit — iOS

```sh
npm run sync          # rebuild www + cap sync
npx cap open ios      # opens Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → pick your Team (enables
   automatic signing). Set the Bundle Identifier to match `appId`.
2. Set a **Version** (e.g. 1.0.0) and **Build** (1).
3. Pick **Any iOS Device (arm64)** → **Product ▸ Archive**.
4. In the Organizer, **Distribute App ▸ App Store Connect ▸ Upload**.
5. At [App Store Connect](https://appstoreconnect.apple.com): create the app record,
   add screenshots (6.7" + 6.1" iPhone), description, keywords, support URL, and the
   **Privacy "nutrition label"** — CRUX collects **no data**, so select *Data Not
   Collected*. Submit for review.

**Passing App Review (guideline 4.2):** because the app is fully offline, has audio
coaching, haptics, and keep-awake, it qualifies as a real app. In the review notes,
mention it's an offline interval-training coach with no login. Don't describe it as
"a website".

---

## Build & submit — Android

```sh
npm run sync
npx cap open android  # opens Android Studio
```

In Android Studio:
1. **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle (.aab)**. Create a
   keystore the first time and **keep it safe** (you need it for every update).
2. Set `versionCode`/`versionName` in `android/app/build.gradle`.
3. At [Play Console](https://play.google.com/console): create the app, upload the
   `.aab`, fill the store listing + data-safety form (no data collected), and roll
   out to internal testing → production.

---

## Updating the app later

Whenever you change the web app in `boulder/`:

```sh
cd crux-app
npm run sync          # re-copies boulder/ into www and syncs native projects
# then re-archive (iOS) / re-bundle (Android), bump the version, and resubmit
```

No native changes needed for content/voice updates — only a version bump + resubmit.

---

## Layout

```
crux-app/
  assets/              icon + splash sources (1024 / 2732) — used by `npm run assets`
  scripts/copy-web.mjs builds www/ from ../boulder and injects the bridge
  native-bridge.js     native haptics / status bar / splash (no-op on web)
  capacitor.config.json
  package.json
  www/                 generated (git-ignored)
  ios/  android/       generated by `npx cap add` (commit after you customize)
```
