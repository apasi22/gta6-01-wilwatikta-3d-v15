// WILWATIKTA 3D — procedural audio: pentatonic gamelan plucks + engine hum.
// WebAudio only, no samples, no network. Starts on first user gesture.
(function () {
  'use strict';
  let ctx = null, master = null, humOsc = null, humGain = null, timer = null, step = 0, on = false;

  // Slendro-ish pentatonic ladder (Hz).
  const SCALE = [196.0, 220.0, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
  const PATTERN = [0, 2, 4, 7, 4, 2, 5, 3, 0, 4, 6, 4, 2, 0, 3, 5];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      humOsc = ctx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.value = 55;
      humGain = ctx.createGain();
      humGain.gain.value = 0.0;
      humOsc.connect(humGain);
      humGain.connect(master);
      humOsc.start();
      return true;
    } catch (e) { return false; }
  }

  function pluck(freq, when, vol) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + 1.0);
    // Metallic shimmer an octave up, quieter.
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, when);
    g2.gain.linearRampToValueAtTime(vol * 0.35, when + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
    o2.connect(g2); g2.connect(master);
    o2.start(when); o2.stop(when + 0.6);
  }

  function start() {
    if (!ensure() || on) return;
    on = true;
    if (ctx.state === 'suspended') ctx.resume();
    timer = setInterval(() => {
      if (!on) return;
      const now = ctx.currentTime + 0.05;
      const idx = PATTERN[step % PATTERN.length];
      pluck(SCALE[idx], now, 0.5);
      if (step % 4 === 0) pluck(SCALE[idx] / 2, now, 0.3);
      if (step % 8 === 6) pluck(SCALE[(idx + 3) % SCALE.length], now + 0.18, 0.3);
      step++;
    }, 340);
  }

  function stop() {
    on = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function setEngine(speed01) {
    if (!ctx || !humGain) return;
    humGain.gain.value = 0.015 + speed01 * 0.05;
    humOsc.frequency.value = 50 + speed01 * 90;
  }

  function blip(freq) {
    if (!ensure()) return;
    pluck(freq || 660, ctx.currentTime + 0.02, 0.35);
  }

  window.WTW.audio = { start, stop, setEngine, blip };
})();
