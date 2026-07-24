// Hold-to-speak (Web Speech API) + typed fallback. Emits raw utterances;
// decree.js decides what they mean.

export function initInput({ onUtterance, onInterim, onVoiceState, typeBox, isTyping }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let supported = !!SR;
  let rec = null;
  let holding = false;
  let lastTranscript = '';

  onVoiceState(supported ? 'idle' : 'unsupported');

  let lastError = null;

  function startListen() {
    if (!supported || holding) return;
    holding = true;
    lastTranscript = '';
    lastError = null;
    try {
      rec = new SR();
    } catch {
      supported = false;
      onVoiceState('unsupported');
      return;
    }
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    // only claim "listening" once the recognizer actually engages,
    // so a dead speech service is visible instead of silent
    rec.onstart = () => { if (holding) onVoiceState('listening'); };
    rec.onresult = (e) => {
      let text = '';
      for (const res of e.results) text += res[0].transcript;
      lastTranscript = text;
      onInterim(text);
    };
    rec.onerror = (e) => {
      lastError = e.error;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        supported = false;
        onVoiceState('denied');
      }
    };
    rec.onend = () => {
      if (holding) {
        // browser ended early (silence timeout) — treat as release
        holding = false;
        onVoiceState(supported ? 'idle' : 'denied');
      }
      if (lastTranscript.trim()) {
        onUtterance(lastTranscript, 'voice');
      } else if (supported && lastError !== null
        && lastError !== 'aborted' && lastError !== 'no-speech') {
        onVoiceState('error:' + lastError);
      } else if (supported) {
        // engaged but heard nothing
        onVoiceState('silence');
      }
      lastTranscript = '';
    };
    try {
      rec.start();
      onVoiceState('starting');
    } catch {
      holding = false;
      onVoiceState('idle');
    }
  }

  function stopListen() {
    if (!holding) return;
    holding = false;
    onVoiceState(supported ? 'idle' : 'unsupported');
    try { rec && rec.stop(); } catch { /* already stopped */ }
  }

  // --- keyboard: V hold-to-talk, T / enter opens the typed decree box
  window.addEventListener('keydown', (e) => {
    if (isTyping()) {
      if (e.code === 'Escape') closeType();
      if (e.code === 'Enter') submitType();
      return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyV') startListen();
    if (e.code === 'KeyT' || e.code === 'Enter' || e.code === 'Slash') {
      e.preventDefault();
      openType();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyV') stopListen();
  });

  // right-mouse hold also talks
  window.addEventListener('mousedown', (e) => {
    if (e.button === 2 && !isTyping()) startListen();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) stopListen();
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  const typeWrap = typeBox.closest('#typewrap') || typeBox.parentElement;
  function openType() {
    typeWrap.classList.add('open');
    typeBox.value = '';
    typeBox.focus();
  }
  function closeType() {
    typeBox.blur();
    typeWrap.classList.remove('open');
  }
  function submitType() {
    const text = typeBox.value.trim();
    closeType();
    if (text) onUtterance(text, 'typed');
  }
  // mobile keyboards submit through the form's Go/Enter action
  const form = typeBox.closest('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitType();
    });
  }

  return {
    get voiceSupported() { return supported; },
    startListen,
    stopListen,
    openType,
  };
}
