/**
 * Áudio 100% procedural via Web Audio API — sem arquivos de asset. Gera SFX por
 * envelopes curtos e uma trilha ambiente suave por tema. Degradá graciosamente
 * se o navegador bloquear áudio até o primeiro gesto do usuário.
 */
export type SfxKind =
  | 'menu'
  | 'confirm'
  | 'cancel'
  | 'attack'
  | 'hit'
  | 'crit'
  | 'heal'
  | 'magic'
  | 'death'
  | 'levelup'
  | 'step'
  | 'encounter'
  | 'victory'
  | 'defeat'
  | 'coin';

export type MusicTheme = 'title' | 'town' | 'wilds' | 'ruins' | 'fenda' | 'battle';

const THEME_SCALES: Record<MusicTheme, { root: number; steps: number[]; interval: number }> = {
  title: { root: 196, steps: [0, 3, 7, 10, 7, 3], interval: 900 },
  town: { root: 220, steps: [0, 4, 7, 11, 7, 4], interval: 780 },
  wilds: { root: 174, steps: [0, 3, 5, 7, 10], interval: 820 },
  ruins: { root: 146, steps: [0, 2, 3, 7, 8], interval: 1000 },
  fenda: { root: 130, steps: [0, 1, 6, 7, 8], interval: 720 },
  battle: { root: 165, steps: [0, 3, 7, 10, 12, 10, 7, 3], interval: 420 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterVol = 0.7;
  private sfxVol = 0.6;
  private musicVol = 0.35;
  private muted = false;

  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private currentTheme: MusicTheme | null = null;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Deve ser chamado num gesto do usuário para destravar o áudio. */
  unlock(): void {
    this.ensure();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const peak = gain * this.sfxVol * this.masterVol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  sfx(kind: SfxKind): void {
    switch (kind) {
      case 'menu':
        this.tone(520, 0.06, 'square', 0.25);
        break;
      case 'confirm':
        this.tone(660, 0.09, 'square', 0.35);
        break;
      case 'cancel':
        this.tone(300, 0.09, 'square', 0.3);
        break;
      case 'attack':
        this.tone(180, 0.1, 'square', 0.4);
        break;
      case 'hit':
        this.tone(120, 0.12, 'sawtooth', 0.4);
        break;
      case 'crit':
        this.tone(90, 0.18, 'sawtooth', 0.55);
        this.tone(240, 0.12, 'square', 0.3);
        break;
      case 'magic':
        this.tone(720, 0.18, 'sine', 0.4);
        this.tone(960, 0.14, 'sine', 0.25);
        break;
      case 'heal':
        this.tone(560, 0.16, 'sine', 0.4);
        this.tone(840, 0.16, 'sine', 0.25);
        break;
      case 'death':
        this.tone(140, 0.35, 'triangle', 0.4);
        break;
      case 'levelup':
        this.tone(523, 0.1, 'square', 0.4);
        this.tone(659, 0.1, 'square', 0.4);
        this.tone(784, 0.16, 'square', 0.4);
        break;
      case 'step':
        this.tone(90, 0.04, 'triangle', 0.15);
        break;
      case 'encounter':
        this.tone(300, 0.12, 'sawtooth', 0.45);
        this.tone(200, 0.2, 'sawtooth', 0.4);
        break;
      case 'victory':
        this.tone(523, 0.12, 'square', 0.4);
        this.tone(659, 0.12, 'square', 0.4);
        this.tone(880, 0.22, 'square', 0.45);
        break;
      case 'defeat':
        this.tone(220, 0.3, 'triangle', 0.4);
        this.tone(160, 0.4, 'triangle', 0.35);
        break;
      case 'coin':
        this.tone(880, 0.06, 'square', 0.3);
        this.tone(1180, 0.08, 'square', 0.25);
        break;
    }
  }

  startMusic(theme: MusicTheme): void {
    if (this.currentTheme === theme && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentTheme = theme;
    this.musicStep = 0;
    const scale = THEME_SCALES[theme];
    this.musicTimer = setInterval(() => this.playPad(scale), scale.interval);
  }

  private playPad(scale: { root: number; steps: number[]; interval: number }): void {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const semis = scale.steps[this.musicStep % scale.steps.length] ?? 0;
    const freq = scale.root * Math.pow(2, semis / 12);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const peak = 0.12 * this.musicVol * this.masterVol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + scale.interval / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + scale.interval / 1000 + 0.05);
    this.musicStep++;
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTheme = null;
  }

  get volumes(): { master: number; sfx: number; music: number; muted: boolean } {
    return { master: this.masterVol, sfx: this.sfxVol, music: this.musicVol, muted: this.muted };
  }

  setMaster(v: number): void {
    this.masterVol = Math.min(1, Math.max(0, v));
  }
  setSfx(v: number): void {
    this.sfxVol = Math.min(1, Math.max(0, v));
  }
  setMusic(v: number): void {
    this.musicVol = Math.min(1, Math.max(0, v));
  }
  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}
