import * as THREE from 'three';
import { TimeState } from './TimeOfDay.js';

/**
 * Процедурный звук двора: ветер, шум дороги (громче рядом с ней),
 * птицы днём и сверчки ночью. Файлов нет — всё синтезируется Web Audio.
 * Звук включается только по кнопке (требование браузеров к автозапуску).
 */
export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private roadGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private cricketGain: GainNode | null = null;
  private enabled = false;
  private birdTimer = 0;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      if (!this.ctx) this.build();
      void this.ctx?.resume();
      this.master?.gain.setTargetAtTime(0.9, this.ctx!.currentTime, 0.3);
    } else {
      this.master?.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.2);
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private build(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    const noise = this.noiseBuffer(ctx);

    // Ветер
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);
    wind.start();

    // Дорога
    const road = ctx.createBufferSource();
    road.buffer = noise;
    road.loop = true;
    road.playbackRate.value = 0.7;
    const roadFilter = ctx.createBiquadFilter();
    roadFilter.type = 'bandpass';
    roadFilter.frequency.value = 220;
    roadFilter.Q.value = 0.6;
    this.roadGain = ctx.createGain();
    this.roadGain.gain.value = 0;
    road.connect(roadFilter).connect(this.roadGain).connect(this.master);
    road.start();

    // Сверчки: высокий тон, амплитудно промодулированный низкой частотой
    const cricket = ctx.createOscillator();
    cricket.frequency.value = 4300;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 22;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    this.cricketGain = ctx.createGain();
    this.cricketGain.gain.value = 0;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(am.gain);
    cricket.connect(am).connect(this.cricketGain).connect(this.master);
    cricket.start();
    lfo.start();
  }

  private chirp(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const base = 2400 + Math.random() * 2200;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const start = t0 + i * 0.11;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), start);
      osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), start + 0.08);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.035, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, start + 0.09);
      osc.connect(g).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.12);
    }
  }

  public update(dtSec: number, state: TimeState, cameraPos: THREE.Vector3): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Дорога на z = 45: чем ближе камера, тем громче
    const dist = Math.abs(cameraPos.z - 45);
    const road = THREE.MathUtils.clamp(1 - dist / 90, 0.05, 1) * 0.11;
    this.roadGain?.gain.setTargetAtTime(road * (1 - state.night * 0.6), now, 0.4);

    this.cricketGain?.gain.setTargetAtTime(THREE.MathUtils.clamp((state.night - 0.6) / 0.4, 0, 1) * 0.012, now, 0.8);

    // Птицы — только днём
    const day = 1 - state.night;
    this.birdTimer -= dtSec;
    if (this.birdTimer <= 0) {
      this.birdTimer = 1.5 + Math.random() * 4;
      if (Math.random() < day * 0.85) this.chirp();
    }
  }
}
