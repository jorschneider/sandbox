/* Docket No. BIS-2026-0710 — one interactive (the receipts ledger),
   page-number chrome, a print link, and one easter egg. No dependencies. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- the receipts ledger ---------- */

  var receipts = document.querySelectorAll('.receipt');
  var chip = document.getElementById('receipt-chip');
  var chipCount = chip.querySelector('span');
  var footerCount = document.getElementById('receipt-total');
  var stamped = 0;

  function recordReceipt() {
    stamped += 1;
    chipCount.textContent = String(stamped);
    footerCount.textContent = String(stamped);
    chip.classList.add('on');
    if (!reduceMotion.matches) {
      document.body.classList.remove('nudge');
      void document.body.offsetWidth; /* restart the animation */
      document.body.classList.add('nudge');
    }
  }

  function stamp(el) {
    if (el.classList.contains('stamped')) return;
    el.classList.add('stamped');
    recordReceipt();
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        stamp(entry.target);
      });
    }, { rootMargin: '0px 0px -45% 0px' });
    receipts.forEach(function (r) { observer.observe(r); });
  } else {
    receipts.forEach(stamp);
  }

  /* jump-scrolls (End key, anchor links) can skip the observer band —
     anything fully scrolled past still counts as a receipt */
  function stampPassed() {
    var doc = document.documentElement;
    if (doc.scrollHeight <= doc.clientHeight + 2) {
      receipts.forEach(stamp);
      return;
    }
    var line = window.innerHeight * 0.55;
    receipts.forEach(function (r) {
      if (r.getBoundingClientRect().bottom < line) stamp(r);
    });
  }

  /* ---------- running page number (chrome, not an interactive) ---------- */

  var pageEl = document.getElementById('pageno');
  var FIRST_PAGE = 42901;
  var ticking = false;

  function updatePage() {
    ticking = false;
    var doc = document.documentElement;
    var span = doc.scrollHeight - doc.clientHeight;
    var pages = span > 0 ? Math.round((doc.scrollTop || document.body.scrollTop) / span * 6) : 0;
    pageEl.textContent = (FIRST_PAGE + pages).toLocaleString('en-US');
    stampPassed();
  }
  function requestUpdate() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updatePage); }
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  updatePage();

  /* ---------- print the determination ---------- */

  document.getElementById('print-det').addEventListener('click', function () {
    document.documentElement.classList.add('print-det-only');
    window.print();
  });
  window.addEventListener('afterprint', function () {
    document.documentElement.classList.remove('print-det-only');
  });

  /* ---------- easter egg: type 3A090 anywhere ---------- */

  var buffer = '';

  function toast(msg) {
    var t = document.createElement('p');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  function confetti() {
    for (var i = 0; i < 60; i++) {
      var page = document.createElement('span');
      page.className = 'fr-confetti';
      page.style.left = Math.random() * 100 + 'vw';
      page.style.animationDuration = 2.2 + Math.random() * 2.4 + 's';
      page.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(page);
      setTimeout(function (el) { el.remove(); }.bind(null, page), 5600);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-5);
    if (buffer === '3a090') {
      buffer = '';
      toast('PERFORMANCE THRESHOLD EXCEEDED.');
      if (!reduceMotion.matches) confetti();
    }
  });
}());
