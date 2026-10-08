"use client";

import { noise, tone } from "@/lib/sound";
import type { CueSound } from "./logic";

export function playCueSound(s: CueSound) {
  switch (s) {
    case "crow":
      tone({ freq: 1150, to: 720, duration: 0.16, type: "sawtooth", volume: 0.07 });
      tone({ freq: 1080, to: 650, duration: 0.18, type: "sawtooth", volume: 0.07, delay: 0.22 });
      break;
    case "clunk":
      tone({ freq: 190, to: 95, duration: 0.22, type: "square", volume: 0.07 });
      tone({ freq: 420, to: 380, duration: 0.35, type: "triangle", volume: 0.05, delay: 0.05 });
      break;
    case "whistle":
      tone({ freq: 1400, to: 2100, duration: 0.22, type: "sine", volume: 0.1 });
      tone({ freq: 2100, to: 1300, duration: 0.28, type: "sine", volume: 0.1, delay: 0.24 });
      break;
    case "bell":
      bell();
      break;
  }
}

export function bell() {
  tone({ freq: 1568, duration: 1.3, type: "triangle", volume: 0.2 });
  tone({ freq: 3136, duration: 0.7, type: "sine", volume: 0.07 });
  tone({ freq: 784, duration: 1.6, type: "sine", volume: 0.12 });
}

export function gunshot() {
  noise(0.16, 0.22);
  tone({ freq: 220, to: 55, duration: 0.22, type: "sine", volume: 0.2 });
}

export function jamClick() {
  tone({ freq: 340, to: 300, duration: 0.05, type: "square", volume: 0.07 });
  tone({ freq: 160, to: 90, duration: 0.25, type: "sawtooth", volume: 0.06, delay: 0.05 });
}

export function drawCall() {
  tone({ freq: 1320, duration: 0.12, type: "square", volume: 0.08 });
}

export function cueTick() {
  tone({ freq: 900, duration: 0.04, type: "square", volume: 0.035 });
}

export function announceTwang() {
  tone({ freq: 196, to: 185, duration: 0.6, type: "triangle", volume: 0.09 });
  tone({ freq: 294, to: 280, duration: 0.5, type: "triangle", volume: 0.06, delay: 0.12 });
}
