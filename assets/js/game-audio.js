"use strict";

// Playback and volume controls. Synthesis lives in music-synth.js.
let audioCtx;
let musicBuffer;
let musicBpm = 128;
const musicBuffers = new Map();
const musicRequests = new Map();
const failedMusicTempos = new Set();
let musicSource;
let musicGain;
let sfxGain;
let musicStartedAt = 0;
let musicOffset = 0;

function ensureAudio() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== "running") audioCtx.resume()?.catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

function stopMusic() {
  if (!musicSource) return;
  const source = musicSource,
    gain = musicGain;
  musicOffset =
    (musicOffset + audioCtx.currentTime - musicStartedAt) %
    musicBuffer.duration;
  gain.gain.cancelScheduledValues(audioCtx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.025);
  source.stop(audioCtx.currentTime + 0.025);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  musicSource = null;
  musicGain = null;
}

function musicTempo() {
  return meta.bgmSync ? 60 / (waveRules(wave).snakeInterval * 2) : 128;
}

function requestMusicBuffer(context, bpm) {
  const key = bpm.toFixed(6);
  if (!musicRequests.has(key)) {
    const request = createMusicBuffer(context, bpm)
      .then((buffer) => {
        musicBuffers.set(key, buffer);
        if (musicBuffers.size > 4)
          musicBuffers.delete(musicBuffers.keys().next().value);
        musicRequests.delete(key);
        // Recheck sound, visibility and the current tempo after async work.
        syncMusic();
      })
      .catch(() => {
        musicRequests.delete(key);
        failedMusicTempos.add(key);
      });
    musicRequests.set(key, request);
  }
  return musicRequests.get(key);
}

function syncMusic() {
  if (
    !sound ||
    !["playing", "upgrade"].includes(state) ||
    document.hidden ||
    $("#modal").open
  ) {
    stopMusic();
    return;
  }
  const bpm = musicTempo();
  if (musicSource && Math.abs(musicBpm - bpm) < 1e-6) return;
  const context = ensureAudio();
  if (!context) return;
  const key = bpm.toFixed(6);
  if (failedMusicTempos.has(key)) return;
  if (!musicBuffers.has(key)) return requestMusicBuffer(context, bpm);
  // Keep the current loop playing until its replacement is ready.
  if (musicSource) stopMusic();
  try {
    const beatPosition = (musicOffset * musicBpm) / 60;
    musicBuffer = musicBuffers.get(key);
    musicBpm = bpm;
    musicOffset = ((beatPosition * 60) / bpm) % musicBuffer.duration;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = musicBuffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(
      0.6 * meta.bgmVolume,
      context.currentTime + 0.025,
    );
    source.start(0, musicOffset);
    musicSource = source;
    musicGain = gain;
    musicStartedAt = context.currentTime;
  } catch {
    stopMusic();
  }
}

function beep(freq = 440, dur = 0.07, type = "square") {
  if (!sound) return;
  const context = ensureAudio();
  if (!context) return;
  try {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      freq * 0.6,
      context.currentTime + dur,
    );
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + dur);
    oscillator.connect(gain);
    if (!sfxGain) {
      sfxGain = context.createGain();
      sfxGain.gain.setValueAtTime(meta.sfxVolume, context.currentTime);
      sfxGain.connect(context.destination);
    }
    gain.connect(sfxGain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start();
    oscillator.stop(context.currentTime + dur);
  } catch {}
}

function setAudioVolume(key, value) {
  if (!Object.hasOwn(DEFAULT_AUDIO_LEVELS, key) || !Number.isFinite(value))
    return;
  meta[key] = Math.max(0, Math.min(1, value));
  persist();
  const gain = key === "bgmVolume" ? musicGain : sfxGain;
  if (gain && audioCtx) {
    gain.gain.cancelScheduledValues(audioCtx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(
      (sound ? meta[key] : 0) * (key === "bgmVolume" ? 0.6 : 1),
      audioCtx.currentTime + 0.025,
    );
  }
}

function setSoundEnabled(enabled) {
  sound = Boolean(enabled);
  if (sfxGain && audioCtx)
    sfxGain.gain.setValueAtTime(
      sound ? meta.sfxVolume : 0,
      audioCtx.currentTime,
    );
  syncMusic();
}

function setMusicSync(enabled) {
  if (typeof enabled !== "boolean") return;
  meta.bgmSync = enabled;
  persist();
  syncMusic();
}
