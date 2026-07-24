/* CRUX native bridge — injected into www/ at build time (see scripts/copy-web.mjs).
   Only does anything inside the Capacitor app; on the web/PWA window.Capacitor
   is undefined, so every branch below is skipped. Keeps the web app untouched. */
(function () {
  var Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== "function" || !Cap.isNativePlatform()) return;
  var P = Cap.Plugins || {};

  // Status bar: light icons over the dark UI.
  try { P.StatusBar && P.StatusBar.setStyle({ style: "DARK" }); } catch (e) {}

  // Hide the native splash once the page is ready.
  function hideSplash(){ try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {} }
  if (document.readyState === "complete") hideSplash();
  else window.addEventListener("load", hideSplash);

  // The app calls navigator.vibrate() for its buzz cues. iOS WKWebView has no
  // Vibration API, so route those calls to native Capacitor Haptics.
  if (P.Haptics && typeof navigator.vibrate !== "function") {
    navigator.vibrate = function (pattern) {
      try {
        var arr = Array.isArray(pattern) ? pattern : [pattern];
        var onDurations = arr.filter(function (n, i) { return i % 2 === 0; });
        var longest = onDurations.length ? Math.max.apply(null, onDurations) : 0;
        var style = longest >= 200 ? "HEAVY" : longest >= 100 ? "MEDIUM" : "LIGHT";
        P.Haptics.impact({ style: style });
      } catch (e) {}
      return true;
    };
  }
})();
