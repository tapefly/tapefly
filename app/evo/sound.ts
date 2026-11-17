/* A handful of synthesized sounds; nothing is downloaded. Starts only after a click. */
let ctx: AudioContext | null = null;
let on = true;

export function setSound(v: boolean) { on = v; }

function ac(): AudioContext | null {
  if (!on) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0, delay = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  step: () => tone(220, 0.05, "triangle", 0.025),
  turn: () => tone(330, 0.04, "triangle", 0.02),
  eat: () => { tone(660, 0.09, "sine", 0.12, 1.5); tone(990, 0.12, "sine", 0.06, 1.2, 0.05); },
  bump: () => tone(110, 0.12, "square", 0.05, 0.6),
  caught: () => { tone(400, 0.5, "sawtooth", 0.05, 0.25); },
  loop: () => { tone(300, 0.12, "triangle", 0.06); tone(240, 0.18, "triangle", 0.06, 1, 0.12); },
  clear: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "sine", 0.09, 1, i * 0.09)),
  click: () => tone(880, 0.025, "square", 0.02)
};
