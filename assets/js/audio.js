const AudioContextClass = window.AudioContext || window.webkitAudioContext || null;
export const audioCtx = AudioContextClass ? new AudioContextClass() : null;

const SOUND_SOURCES = {
  shoot: 'data:audio/wav;base64,UklGRjwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQwAAAAgICAnJyYmJiAgICcnJyYmJiYmJiYmJiYm',
  hit: 'data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAAAwMDAzMzMyMjIyMzMyMjIyMjIyMjIyMjIy',
  dash: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQUAAAAoKCgoKCwsLCwsLCwsLCwsLCws',
  xp: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQUAAAAcHBwcHCAgICAgICAgICAgICAgICAg',
  bomb: 'data:audio/wav;base64,UklGRj4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQwAAAA/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pw==',
  alert: 'data:audio/wav;base64,UklGRjgAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ0AAAAQEBAQEBAQEBAQEBAQEBAQEBAQEB'
};

const bufferCache = new Map();

async function loadBuffer(key) {
  if (!audioCtx) {
    return null;
  }
  const cached = bufferCache.get(key);
  if (cached) {
    return cached instanceof Promise ? cached : Promise.resolve(cached);
  }
  const src = SOUND_SOURCES[key];
  if (!src) {
    return null;
  }
  const promise = fetch(src)
    .then(res => res.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(buffer => {
      bufferCache.set(key, buffer);
      return buffer;
    })
    .catch(error => {
      bufferCache.delete(key);
      console.error('Audio decode failed', error);
      return null;
    });
  bufferCache.set(key, promise);
  return promise;
}

export async function playSound(key, gain = 0.35, rate = 1) {
  if (!audioCtx) {
    return;
  }
  const buffer = await loadBuffer(key);
  if (!buffer) {
    return;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start(0);
}

export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* ignore */
    });
  }
}
