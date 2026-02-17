type SoundType = "beep" | "chime" | "ding" | "cash";

const SOUND_CONFIG: Record<SoundType, { freq: number; duration: number; type: OscillatorType }> = {
  beep:  { freq: 880,  duration: 0.15, type: "square" },
  chime: { freq: 1200, duration: 0.25, type: "sine" },
  ding:  { freq: 660,  duration: 0.2,  type: "triangle" },
  cash:  { freq: 1400, duration: 0.1,  type: "sawtooth" },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("predict_sound_enabled") !== "false";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("predict_sound_enabled", enabled ? "true" : "false");
}

export function getSoundVolume(): number {
  if (typeof window === "undefined") return 0.1;
  const val = localStorage.getItem("predict_sound_volume");
  return val ? parseFloat(val) : 0.1;
}

export function playAlertSound(type: SoundType = "beep"): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const config = SOUND_CONFIG[type];
  const volume = getSoundVolume();

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = config.type;
    osc.frequency.value = config.freq;
    gain.gain.value = volume;

    // Fade out to avoid clicks
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

    osc.start();
    osc.stop(ctx.currentTime + config.duration);

    // For "cash" sound, add a second tone for the cha-ching effect
    if (type === "cash") {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.value = 1800;
      gain2.gain.value = volume * 0.7;
      gain2.gain.setValueAtTime(volume * 0.7, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Audio not available
  }
}
