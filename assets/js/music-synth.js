"use strict";

// Original eight-bar chiptune loop, synthesized locally without audio files.
function* renderMusicSamples(bpm = 128) {
  const rate = 22050;
  const beat = 60 / bpm;
  const samples = new Float32Array(Math.round(rate * beat * 32));
  const voices = [];
  let noiseSeed = 20261006;
  const noise = () => {
    noiseSeed ^= noiseSeed << 13;
    noiseSeed ^= noiseSeed >>> 17;
    noiseSeed ^= noiseSeed << 5;
    return (noiseSeed >>> 0) / 2147483648 - 1;
  };
  const add = (at, duration, voice) => {
    const start = Math.round(at * rate);
    const length = Math.min(
      Math.round(duration * rate),
      samples.length - start,
    );
    voices.push({ start, length, voice });
  };
  const note = (midi, at, duration, volume, kind) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    add(at, duration, (t, progress) => {
      const phase = (t * frequency) % 1;
      const wave =
        kind === "pad"
          ? Math.sin(t * frequency * Math.PI * 2)
          : kind === "bass"
            ? 1 - 4 * Math.abs(phase - 0.5)
            : phase < 0.35
              ? 1
              : -1;
      const attack = Math.min(1, t / 0.006);
      const release = Math.min(1, (duration - t) / 0.025);
      const decay = kind === "lead" ? Math.exp(-progress * 4) : 1;
      return wave * attack * release * decay * volume;
    });
  };
  const chords = [
    [45, 48, 52],
    [41, 45, 48],
    [48, 52, 55],
    [43, 47, 50],
  ];
  const melody = [0, 1, 2, 1, 0, 2, 3, 2];
  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[Math.floor(bar / 2)];
    const at = bar * 4 * beat;
    for (const pitch of chord) note(pitch + 12, at, beat * 3.8, 0.014, "pad");
    for (let step = 0; step < 8; step++) {
      const pitch = melody[(step + (bar % 2 ? 2 : 0)) % melody.length];
      note(
        pitch === 3 ? chord[0] + 36 : chord[pitch] + 24,
        at + (step * beat) / 2,
        beat * 0.43,
        0.055,
        "lead",
      );
      let previous = 0;
      add(at + (step * beat) / 2, 0.045, (t) => {
        const next = noise();
        const high = next - previous;
        previous = next;
        return high * Math.exp(-t * 95) * (step % 2 ? 0.009 : 0.016);
      });
    }
    for (let step = 0; step < 4; step++) {
      note(
        chord[0] + (step === 3 ? 12 : 0),
        at + step * beat,
        beat * 0.68,
        0.09,
        "bass",
      );
      if (step % 2 === 0) {
        add(at + step * beat, 0.18, (t) => {
          const phase =
            2 * Math.PI * (44 * t + (90 / 25) * (1 - Math.exp(-25 * t)));
          return Math.sin(phase) * Math.exp(-t * 24) * 0.2;
        });
      } else {
        add(
          at + step * beat,
          0.12,
          (t) =>
            (noise() * 0.045 + Math.sin(t * 180 * Math.PI * 2) * 0.04) *
            Math.exp(-t * 36),
        );
      }
    }
  }
  // Yield between small blocks so synthesis never monopolizes the UI thread.
  for (const { start, length, voice } of voices) {
    for (let block = 0; block < length; block += 2048) {
      const end = Math.min(block + 2048, length);
      for (let i = block; i < end; i++)
        samples[start + i] += voice(i / rate, i / length);
      yield;
    }
  }
  // Soft limiting keeps overlapping voices comfortably below clipping.
  for (let block = 0; block < samples.length; block += 2048) {
    const end = Math.min(block + 2048, samples.length);
    for (let i = block; i < end; i++) samples[i] = Math.tanh(samples[i]);
    yield;
  }
  return { samples, rate };
}

function createMusicBuffer(context, bpm = 128) {
  const renderer = renderMusicSamples(bpm);
  return new Promise((resolve, reject) => {
    function renderSlice() {
      try {
        const deadline = Date.now() + 4;
        let step;
        do {
          step = renderer.next();
        } while (!step.done && Date.now() < deadline);
        if (!step.done) {
          setTimeout(renderSlice, 0);
          return;
        }
        const { samples, rate } = step.value;
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.getChannelData(0).set(samples);
        resolve(buffer);
      } catch (error) {
        reject(error);
      }
    }
    // Let input and rendering run before starting the first slice, too.
    setTimeout(renderSlice, 0);
  });
}
