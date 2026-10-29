/*! LooseLeaf UI v2.3.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Sound (opt-in)
 * Why script: CSS can't play sound; the Web Audio API can.
 * Plays a short sound when [data-sound="click" | "toggle" | "success"] is
 * activated (clicked, or Enter/Space), never on hover or focus. Off twice over:
 *   1. the site opts in with data-sound on <html>, and
 *   2. the visitor turns it on with a [data-sound-toggle] button (theme.js
 *      remembers it, default off). There is no prefers-reduced-sound media query,
 *      so the toggle is the only consent: with no toggle on the page, nothing plays.
 * The default sounds are synthesised (a filtered noise burst and a short tone,
 * pitch and decay jittered so repeats differ); data-sound-src="/path/" on <html>
 * plays <path>click.mp3, toggle.mp3 and success.mp3 instead. Volume: --sound-volume.
 * Without it: silence.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.sound");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const root = document.documentElement;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audio = null;

  const allowed = () =>
    root.hasAttribute("data-sound") && root.hasAttribute("data-sound-on") && Boolean(document.querySelector("[data-sound-toggle]"));
  const volume = () => {
    const value = parseFloat(getComputedStyle(root).getPropertyValue("--sound-volume"));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0.3;
  };
  const jitter = (value, amount) => value * (1 + (Math.random() * 2 - 1) * amount);

  // Created or resumed inside the activation itself: Safari keeps a context made at load suspended
  function context() {
    audio ||= new AudioContextClass();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  const TONES = { click: [880], toggle: [660], success: [660, 990] };

  function synthesise(kind, level) {
    const ac = context();
    const start = ac.currentTime;
    const out = ac.createGain();
    out.gain.value = level;
    out.connect(ac.destination);

    // A short, filtered burst of noise: the "tick"
    const length = jitter(0.025, 0.2);
    const noise = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const burst = ac.createBufferSource();
    burst.buffer = noise;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = jitter(kind === "toggle" ? 2600 : 1900, 0.15);
    band.Q.value = 1.4;
    burst.connect(band).connect(out);
    burst.start(start);

    // A tone or two, decaying fast: the "pitch"
    TONES[kind].forEach((frequency, index) => {
      const at = start + index * 0.07;
      const tone = ac.createOscillator();
      const envelope = ac.createGain();
      tone.type = "sine";
      tone.frequency.value = jitter(frequency, 0.03);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(0.35, at + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + jitter(0.09, 0.2));
      tone.connect(envelope).connect(out);
      tone.start(at);
      tone.stop(at + 0.15);
    });
  }

  function play(kind) {
    if (!(kind in TONES)) return;
    const level = volume();
    const source = root.dataset.soundSrc;
    if (source) {
      const file = new Audio(`${source}${kind}.mp3`);
      file.volume = level;
      file.play().catch(() => {});
    } else if (AudioContextClass) {
      synthesise(kind, level);
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !allowed()) return;
    const control = event.target.closest("[data-sound]:not(html)");
    if (control && !control.matches(':disabled, [aria-disabled="true"]')) play(control.dataset.sound);
  });
})();
