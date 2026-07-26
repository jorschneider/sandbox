/* Paramount Leader — The Situation Room.
   Voice + text conversations with the Politburo, plenum purge deliberations,
   foreign negotiations, and speeches. Talks to /api/converse; falls back to
   canned lines from cast.js when the backend is offline. Voice uses the browser's
   Web Speech API (SpeechRecognition + speechSynthesis) — no backend needed. */
(function () {
  'use strict';

  var CAST = window.PARAMOUNT_CAST || { elites: [], foreign: [], topics: [], offline: {} };
  var P = null; // window.PARAMOUNT (engine bridge), resolved lazily

  // per-game relationship store, reset when the game id changes
  // Which roster is in play depends on the scenario's era: the modern Politburo of
  // fictional archetypes, or the real 1976 succession cast.
  function era() {
    var snap = P ? P.snapshot() : null;
    return (snap && snap.era) || 'modern';
  }
  function roster() {
    return era() === '1976' ? (CAST.elites1976 || CAST.elites) : CAST.elites;
  }

  var rel = { gameId: -1, elites: {} };
  function ensureRel() {
    var gid = P ? P.gameId() : 0;
    if (rel.gameId !== gid) {
      rel = { gameId: gid, elites: {} };
      // seed every roster so switching scenarios never leaves a character unseeded
      [].concat(CAST.elites || [], CAST.elites1976 || []).forEach(function (e) {
        rel.elites[e.id] = { loyalty: e.start.loyalty, suspicion: e.start.suspicion };
      });
    }
  }

  var voiceOn = true;
  var session = null; // { mode, character, target, topic, history: [] }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function findChar(id) {
    var pools = [].concat(roster() || [], CAST.foreign || [], CAST.elites || [], CAST.elites1976 || []);
    return pools.filter(function (e) { return e.id === id; })[0] || null;
  }

  /* ---------------- text-to-speech ---------------- */
  var ttsVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = window.speechSynthesis.getVoices() || [];
    // prefer an English voice; deterministic pick (no randomness)
    ttsVoice = vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || vs[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      if (ttsVoice) u.voice = ttsVoice;
      u.rate = 0.98; u.pitch = 0.92;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech not available */ }
  }
  function stopSpeaking() {
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  /* ---------------- speech-to-text ---------------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var recog = null, listening = false;
  function startListening(onText, onEnd) {
    if (!SR) { onEnd && onEnd(new Error('no_speech_recognition')); return; }
    try {
      recog = new SR();
      recog.lang = 'en-US';
      recog.interimResults = true;
      recog.continuous = false;
      var finalText = '';
      recog.onresult = function (ev) {
        var interim = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalText += t; else interim += t;
        }
        onText(finalText + interim, ev.results[ev.results.length - 1].isFinal);
      };
      recog.onerror = function (e) { listening = false; onEnd && onEnd(e); };
      recog.onend = function () { listening = false; onEnd && onEnd(null, finalText); };
      recog.start();
      listening = true;
    } catch (e) { onEnd && onEnd(e); }
  }
  function stopListening() {
    if (recog && listening) { try { recog.stop(); } catch (e) {} }
    listening = false;
  }

  /* ---------------- modal scaffolding ---------------- */
  function ensureModal() {
    if ($('sit-modal')) return;
    var m = el('div', 'sit-modal', '');
    m.id = 'sit-modal';
    m.innerHTML =
      '<div class="sit-dialog" role="dialog" aria-modal="true">' +
      '  <div class="sit-head">' +
      '    <div class="sit-who"><span class="sit-emoji" id="sit-emoji"></span>' +
      '      <div><div class="sit-name" id="sit-name"></div><div class="sit-title" id="sit-title"></div></div></div>' +
      '    <div class="sit-head-actions">' +
      '      <button class="sit-voice" id="sit-voice" title="Toggle spoken replies">🔊</button>' +
      '      <button class="sit-close" id="sit-close" title="End the audience">✕</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="sit-relbar" id="sit-relbar"></div>' +
      '  <div class="sit-log" id="sit-log"></div>' +
      '  <div class="sit-inputrow">' +
      '    <button class="sit-mic" id="sit-mic" title="Hold to speak">🎙️</button>' +
      '    <textarea id="sit-input" rows="1" placeholder="Speak or type to the comrade…"></textarea>' +
      '    <button class="sit-send" id="sit-send">Send</button>' +
      '  </div>' +
      '  <div class="sit-foot" id="sit-foot"></div>' +
      '</div>';
    document.body.appendChild(m);

    $('sit-close').addEventListener('click', closeModal);
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    $('sit-voice').addEventListener('click', function () {
      voiceOn = !voiceOn;
      $('sit-voice').textContent = voiceOn ? '🔊' : '🔇';
      if (!voiceOn) stopSpeaking();
    });
    $('sit-send').addEventListener('click', function () { submitInput(); });
    $('sit-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput(); }
    });
    wireMic();
  }

  function wireMic() {
    var mic = $('sit-mic');
    if (!SR) { mic.classList.add('disabled'); mic.title = 'Voice input not supported in this browser'; return; }
    var input = $('sit-input');
    function begin() {
      if (listening) return;
      mic.classList.add('live');
      stopSpeaking();
      startListening(function (text) { input.value = text; autoGrow(); }, function () {
        mic.classList.remove('live');
      });
    }
    function end() { stopListening(); mic.classList.remove('live'); }
    mic.addEventListener('mousedown', begin);
    mic.addEventListener('touchstart', function (e) { e.preventDefault(); begin(); });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    mic.addEventListener('click', function () { /* mousedown/up handle it */ });
  }

  function autoGrow() {
    var t = $('sit-input');
    t.style.height = 'auto';
    t.style.height = Math.min(120, t.scrollHeight) + 'px';
  }

  function closeModal() {
    stopSpeaking(); stopListening();
    var m = $('sit-modal');
    if (m) m.classList.remove('open');
    session = null;
  }

  /* ---------------- conversation ---------------- */
  function addLine(who, cls, text, sub) {
    var log = $('sit-log');
    var line = el('div', 'sit-line ' + cls);
    var body = '<div class="sit-bubble">' + (who ? '<span class="sit-speaker">' + esc(who) + '</span>' : '') +
      esc(text) + '</div>';
    if (sub) body += '<div class="sit-sub">' + esc(sub) + '</div>';
    line.innerHTML = body;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    return line;
  }
  function addDeltaChips(applied, extra) {
    if ((!applied || !Object.keys(applied).length) && !extra) return;
    var log = $('sit-log');
    var row = el('div', 'sit-deltas');
    Object.keys(applied || {}).forEach(function (k) {
      var up = applied[k] > 0;
      var label = (P && P.STAT_LABELS && P.STAT_LABELS[k]) || (k === 'economy' ? 'GDP' : k);
      row.appendChild(el('span', 'sit-delta ' + (up ? 'up' : 'down'), esc(label) + ' ' + (up ? '+' : '') + applied[k]));
    });
    if (extra) row.appendChild(el('span', 'sit-delta note', esc(extra)));
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setThinking(on) {
    $('sit-send').disabled = on;
    var foot = $('sit-foot');
    foot.textContent = on ? 'The comrade considers his words…' : '';
  }

  function submitInput() {
    var input = $('sit-input');
    var text = (input.value || '').trim();
    if (!text || !session) return;
    input.value = ''; autoGrow();
    sendTurn(text);
  }

  function relSnapshotFor(id) {
    ensureRel();
    return rel.elites[id] || null;
  }
  function renderRelBar() {
    var bar = $('sit-relbar');
    if (!session || !session.character || session.mode === 'negotiate' || session.mode === 'speech') {
      bar.style.display = 'none'; return;
    }
    var r = relSnapshotFor(session.character.id);
    if (!r) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    bar.innerHTML =
      '<div class="sit-meter"><span>Loyalty</span><div class="sit-track"><div class="sit-fill loy" style="width:' + clamp(r.loyalty, 0, 100) + '%"></div></div><b>' + Math.round(r.loyalty) + '</b></div>' +
      '<div class="sit-meter"><span>Suspicion</span><div class="sit-track"><div class="sit-fill sus" style="width:' + clamp(r.suspicion, 0, 100) + '%"></div></div><b>' + Math.round(r.suspicion) + '</b></div>';
  }

  function applyRelDeltas(id, deltas) {
    if (!id) return;
    ensureRel();
    var r = rel.elites[id];
    if (!r) return;
    if (typeof deltas.loyalty === 'number') r.loyalty = clamp(r.loyalty + deltas.loyalty, 0, 100);
    if (typeof deltas.suspicion === 'number') r.suspicion = clamp(r.suspicion + deltas.suspicion, 0, 100);
    renderRelBar();
  }

  function offlineReply() {
    var key = session.mode === 'speech' ? 'speech' : (session.character ? session.character.id : 'premier');
    var lines = CAST.offline[key] || ['The comrade says nothing, which is itself a statement.'];
    // deterministic pick by turn count, so no Math.random
    var idx = session.history.filter(function (h) { return h.role === 'assistant'; }).length % lines.length;
    return {
      reply: lines[idx],
      internal: '', mood: 'inscrutable', deltas: {}, outcome: 'ongoing'
    };
  }

  function sendTurn(playerText) {
    addLine('You', 'you', playerText);
    session.history.push({ role: 'user', text: playerText });
    setThinking(true);

    var snap = P ? P.snapshot() : null;
    var payload = {
      mode: session.mode,
      era: era(),
      characterId: session.character ? session.character.id : undefined,
      message: playerText,
      target: session.target,
      topic: session.topic,
      history: session.history.slice(0, -1).slice(-8),
      gameState: snap
    };

    fetch('/api/converse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    }).then(function (res) {
      var data = (res.body && res.body.respond) ? res.body.respond : offlineReply();
      if (res.body && res.body.offline) data._offline = true;
      handleReply(data, res.body && res.body.offline);
    }).catch(function () {
      handleReply(offlineReply(), true);
    });
  }

  function handleReply(data, offline) {
    setThinking(false);
    session.history.push({ role: 'assistant', text: data.reply });

    var name = session.mode === 'speech' ? 'State Television' : (session.character ? session.character.name : 'Comrade');
    addLine(name, 'them', data.reply, data.internal);
    speak(data.reply);

    // split deltas: relationship (loyalty/suspicion/rapport) vs game-level stats
    var d = data.deltas || {};
    if (session.character) applyRelDeltas(session.character.id, d);

    var gameDeltas = {};
    ['partyUnity', 'stability', 'intl', 'power', 'approval', 'economy'].forEach(function (k) {
      if (typeof d[k] === 'number' && d[k]) gameDeltas[k] = d[k];
    });
    var applied = (P && Object.keys(gameDeltas).length) ? P.applyDeltas(gameDeltas) : {};

    var extra = '';
    if (typeof data.score === 'number') extra = 'Score ' + data.score + '/100';
    if (data.dealTerms) extra = (extra ? extra + ' · ' : '') + data.dealTerms;
    addDeltaChips(applied, extra || (offline ? 'backend offline — canned reply' : ''));

    // resolve terminal outcomes
    if (data.outcome && data.outcome !== 'ongoing') resolveOutcome(data.outcome, data);
  }

  function resolveOutcome(outcome, data) {
    var foot = $('sit-foot');
    var is76 = era() === '1976';
    var msgs = {
      agreed: 'A deal is struck. The photographers are summoned.',
      refused: 'Talks collapse. Both sides declare total victory.',
      purged: is76
        ? 'The order is given. ' + (session.target || 'The accused') + ' is expelled from the Party and taken into custody, as history records.'
        : '“Consensus” is reached. ' + (session.target || 'The comrade') + ' is thanked for years of service and sent to study.',
      survived: (session.target || 'The comrade') + ' survives — and will remember this meeting.',
      triumph: 'A triumph. The speech has been added to the national curriculum.',
      disaster: 'The hall applauds precisely as long as required, and no longer.'
    };
    if (msgs[outcome]) {
      foot.textContent = msgs[outcome];
      if (P) P.toast('🏛️ ' + msgs[outcome]);
    }
    // purge success: a small party-unity nudge is already applied via deltas; lock the session
    if (outcome === 'purged' || outcome === 'survived') {
      $('sit-send').disabled = true;
      $('sit-input').disabled = true;
    }
  }

  /* ---------------- openers ---------------- */
  function openConversation(opts) {
    if (!(P && P.active())) {
      (P || window.PARAMOUNT) && window.PARAMOUNT.toast && window.PARAMOUNT.toast('Convene the Situation Room during your term in office.');
      return;
    }
    ensureModal();
    ensureRel();
    session = { mode: opts.mode, character: opts.character || null, target: opts.target || '', topic: opts.topic || '', history: [] };
    $('sit-emoji').textContent = opts.emoji || (opts.character ? opts.character.emoji : '🏛️');
    $('sit-name').textContent = opts.title || (opts.character ? opts.character.name : 'The Situation Room');
    $('sit-title').textContent = opts.subtitle || (opts.character ? opts.character.title : '');
    $('sit-log').innerHTML = '';
    $('sit-input').disabled = false;
    $('sit-send').disabled = false;
    $('sit-foot').textContent = '';
    $('sit-voice').textContent = voiceOn ? '🔊' : '🔇';
    renderRelBar();
    if (opts.opening) addLine(opts.character ? opts.character.name : 'State Television', 'them', opts.opening);
    $('sit-modal').classList.add('open');
    setTimeout(function () { $('sit-input').focus(); }, 50);
  }

  function chooserHTML(kind, items) {
    return items.map(function (it) {
      return '<button class="sit-choice" data-kind="' + kind + '" data-id="' + it.id + '" style="border-left-color:' + (it.color || '#a4131c') + '">' +
        '<span class="sit-choice-emoji">' + it.emoji + '</span>' +
        '<span><b>' + esc(it.name) + '</b><span class="sit-choice-title">' + esc(it.title) + '</span>' +
        '<span class="sit-choice-blurb">' + esc(it.blurb) + '</span></span></button>';
    }).join('');
  }

  function openChooser(title, sub, kind, items, onPick) {
    ensureModal();
    session = { mode: '_chooser', history: [] };
    $('sit-emoji').textContent = '🏛️';
    $('sit-name').textContent = title;
    $('sit-title').textContent = sub;
    $('sit-relbar').style.display = 'none';
    $('sit-foot').textContent = '';
    var log = $('sit-log');
    log.innerHTML = '<div class="sit-chooser">' + chooserHTML(kind, items) + '</div>';
    $('sit-input').disabled = true;
    $('sit-send').disabled = true;
    log.querySelectorAll('.sit-choice').forEach(function (b) {
      b.addEventListener('click', function () { onPick(b.getAttribute('data-id')); });
    });
    $('sit-modal').classList.add('open');
  }

  function convenePolitburo() {
    if (!requireActive()) return;
    var is76 = era() === '1976';
    openChooser(
      is76 ? 'Convene the Succession' : 'Convene the Politburo',
      is76 ? 'Autumn 1976. Everyone is waiting to see who speaks first.' : 'Summon a comrade for a private word.',
      'elite', roster(), function (id) {
        var c = findChar(id);
        openConversation({
          mode: 'politburo', character: c,
          opening: is76
            ? 'You wished to speak. In these days, that is itself a decision.'
            : 'You summoned me, Comrade Leader. I came at once, naturally.'
        });
      });
  }

  function callPlenum() {
    if (!requireActive()) return;
    var is76 = era() === '1976';
    openChooser(
      is76 ? 'Emergency Session · October 1976' : 'Call a Plenum',
      is76 ? 'Whom does the Politburo move against — and can you show the numbers?'
        : 'Whom shall the Standing Committee thank for their service?',
      'elite', roster(), function (targetId) {
        var target = findChar(targetId);
        // The session is chaired by whoever can actually enforce the outcome:
        // in 1976 that is the marshal (or the guard commander, if he is the target).
        var chairId = is76
          ? (targetId === 'ye' ? 'wangdx' : 'ye')
          : (targetId === 'enforcer' ? 'security' : 'enforcer');
        var chair = findChar(chairId);
        openConversation({
          mode: 'plenum', character: chair, target: target.name,
          emoji: '⚖️',
          title: (is76 ? 'Emergency Session · Re: ' : 'Plenum · Re: ') + target.name,
          subtitle: (is76 ? 'Convened by ' : 'Deliberation chaired by ') + chair.name,
          opening: is76
            ? 'We are agreed on the danger, then. The question is the count — and who gives the order. Speak carefully; this room is decided once.'
            : 'The committee is seated, Chairman. You wished to raise the matter of ' + target.name + '. The floor — and the file — are yours.'
        });
      });
  }

  function summonForeign() {
    if (!requireActive()) return;
    openChooser('Summon a Foreign Leader', 'Diplomacy is war by other, duller means.', 'foreign', CAST.foreign, function (id) {
      var c = findChar(id);
      openConversation({
        mode: 'negotiate', character: c,
        opening: c.id === 'usa' ? 'Great to see you. Tremendous. So — let’s talk about that trade deficit.' :
          c.id === 'russia' ? 'Sit, my friend. No rush. We have all the time in the world. You, especially.' :
            'Thank you for receiving me. Shall we begin with the communiqué language?'
      });
    });
  }

  function addressNation() {
    if (!requireActive()) return;
    var topicList = (era() === '1976' && CAST.topics1976) ? CAST.topics1976 : CAST.topics;
    var items = topicList.map(function (t, i) {
      return { id: String(i), emoji: '📜', name: t.replace(/^./, function (c) { return c.toUpperCase(); }), title: 'Address the Nation', blurb: 'Deliver a speech on this theme.' };
    });
    openChooser('Address the Nation', 'Choose your theme. Vague waffle will not move the hall.', 'topic', items, function (idx) {
      var topic = topicList[Number(idx)] || topicList[0];
      openConversation({
        mode: 'speech', character: null, topic: topic,
        emoji: '📺',
        title: 'The Great Hall of the People',
        subtitle: 'On the theme of ' + topic,
        opening: 'The hall is seated. Ten thousand comrades await your words on ' + topic + '. The cameras are live. Begin, Chairman — speak, and the nation listens.'
      });
    });
  }

  function requireActive() {
    P = window.PARAMOUNT || null;
    if (!(P && P.active())) {
      if (P && P.toast) P.toast('Convene the Situation Room during your term in office.');
      return false;
    }
    ensureRel();
    return true;
  }

  /* ---------------- wire the sidebar buttons ---------------- */
  function init() {
    P = window.PARAMOUNT || null;
    var map = {
      'sit-btn-politburo': convenePolitburo,
      'sit-btn-plenum': callPlenum,
      'sit-btn-foreign': summonForeign,
      'sit-btn-speech': addressNation
    };
    Object.keys(map).forEach(function (id) {
      var b = $(id);
      if (b) b.addEventListener('click', map[id]);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
