"use client";

/**
 * Tiny WebAudio synth for UI and game feedback. No audio files needed.
 * Muting is global and persisted.
 */
let ctx: AudioContext | null = null;
const MUTE_KEY = "mindtrial:muted";
let muted: boolean | null = null;
const listeners = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(value));
}

export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export interface ToneOptions {
  freq?: number;
  /** End frequency for a slide. */
  to?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

export function tone({ freq = 440, to, duration = 0.12, type = "sine", volume = 0.15, delay = 0 }: ToneOptions = {}) {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Short white-noise burst (hits, explosions). */
export function noise(duration = 0.15, volume = 0.12) {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain).connect(ac.destination);
  src.start();
}

export const sfx = {
  click: () => tone({ freq: 660, duration: 0.05, type: "square", volume: 0.05 }),
  good: () => {
    tone({ freq: 660, duration: 0.09, type: "triangle" });
    tone({ freq: 990, duration: 0.12, type: "triangle", delay: 0.08 });
  },
  bad: () => tone({ freq: 220, to: 110, duration: 0.25, type: "sawtooth", volume: 0.08 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, duration: 0.18, type: "triangle", delay: i * 0.1 })),
  tick: () => tone({ freq: 1200, duration: 0.03, type: "square", volume: 0.04 }),
  hit: () => noise(0.08, 0.1),
  boom: () => {
    noise(0.35, 0.18);
    tone({ freq: 120, to: 40, duration: 0.35, type: "sine", volume: 0.2 });
  },
};
