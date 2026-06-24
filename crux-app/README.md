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

## No-Mac path: build & submit from CI (recommended if you don't own a Mac)

`.github/workflows/ios.yml` builds, signs, and uploads to **TestFlight** on a
GitHub-hosted **macOS** runner. You never touch a Mac — you set repo secrets once
and run the workflow. (`scripts/apply-native-config.mjs` applies the audio-session
+ keep-awake tweaks automatically, so nothing needs hand-editing in CI.)

### One-time human steps
1. **Enroll** in the Apple Developer Program — https://developer.apple.com/programs ($99/yr).
2. **App Store Connect API key:** App Store Connect → *Users and Access → Integrations
   → App Store Connect API* → generate a key with role **Admin** (or App Manager).
   Download the `.p8` **once**; note the **Key ID** and **Issuer ID**.
3. **Pick a bundle id** you control, e.g. `com.jordanschneider.crux`.
4. **Create an empty private GitHub repo** to hold signing certs, e.g. `crux-certs`.
5. **Create a GitHub PAT** (fine-grained, Contents: read/write on `crux-certs`).
6. **Choose a passphrase** for `match` (any strong string — remember it).

### Repository secrets  (Settings → Secrets and variables → Actions)
| Secret | Value |
|---|---|
| `ASC_KEY_ID` | the API Key ID |
| `ASC_ISSUER_ID` | the API Issuer ID |
| `ASC_KEY_P8` | full contents of the `.p8` file (paste as-is) |
| `CRUX_BUNDLE_ID` | e.g. `com.jordanschneider.crux` |
| `CRUX_APP_NAME` | `CRUX` (or a free name if "CRUX" is taken) |
| `MATCH_GIT_URL` | https URL of the certs repo, e.g. `https://github.com/you/crux-certs.git` |
| `MATCH_GIT_BASIC_AUTHORIZATION` | base64 of `your-username:your-PAT` (`printf 'user:PAT' | base64`) |
| `MATCH_PASSWORD` | the passphrase from step 6 |

### Run it
Actions tab → **iOS · build & TestFlight** → **Run workflow** (or push a tag `v1.0.0`).
The first run: `match` creates the signing assets in the certs repo, `produce`
registers the app + bundle id, then it builds and uploads to TestFlight. Install
**TestFlight** on your iPhone to test the build.

For a **public App Store release**, add the screenshots in `store/screenshots/` and
the metadata in `store/listing.md` to App Store Connect, then either submit there or
run the `release` lane (`fastlane release`).

> Signing in CI usually needs a round or two to go green on the first attempt — the
> logs say exactly what's missing. Push the secrets and trigger a run; the workflow
> logs make each fix obvious.

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
