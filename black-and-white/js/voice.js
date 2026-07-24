// Hold-to-speak (Web Speech API) + typed fallback. Emits raw utterances;
// decree.js decides what they mean.

export function initInput({ onUtterance, onInterim, onVoiceState, typeBox, isTyping }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let supported = !!SR;
  let rec = null;
  let holding = false;
  let lastTranscript = '';

  onVoiceState(supported ? 'idle' : 'unsupported');

  function startListen() {
    if (!supported || holding) return;
    holding = true;
    lastTranscript = '';
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
    rec.onresult = (e) => {
      let text = '';
      for (const res of e.results) text += res[0].transcript;
      lastTranscript = text;
      onInterim(text);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        supported = false;
        onVoiceState('denied');
      }
    };
    rec.onend = () => {
      if (holding) {
        // browser ended early (silence timeout) — treat as release
        holding = false;
        onVoiceState('idle');
      }
      if (lastTranscript.trim()) onUtterance(lastTranscript, 'voice');
      lastTranscript = '';
    };
    try {
      rec.start();
      onVoiceState('listening');
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

  function openType() {
    typeBox.parentElement.classList.add('open');
    typeBox.value = '';
    typeBox.focus();
  }
  function closeType() {
    typeBox.blur();
    typeBox.parentElement.classList.remove('open');
  }
  function submitType() {
    const text = typeBox.value.trim();
    closeType();
    if (text) onUtterance(text, 'typed');
  }

  return {
    get voiceSupported() { return supported; },
  };
}
