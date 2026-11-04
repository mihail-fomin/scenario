import * as THREE from 'three';
import { glowTexture } from '../utils/textures.js';

interface Key {
  hour: number;
  skyTop: number;
  skyHorizon: number;
  sunColor: number;
  sunIntensity: number;
  moonIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  /** 0 — день, 1 — ночь (окна, фонари, звёзды) */
  night: number;
  /** сила закатного зарева у горизонта */
  glow: number;
}

const KEYS: Key[] = [
  { hour: 0,    skyTop: 0x050a1c, skyHorizon: 0x111a34, sunColor: 0xffffff, sunIntensity: 0,    moonIntensity: 0.55, hemiSky: 0x3a4c80, hemiGround: 0x161a26, hemiIntensity: 0.65, exposure: 1.15, night: 1,    glow: 0 },
  { hour: 5,    skyTop: 0x0b1332, skyHorizon: 0x2a2d52, sunColor: 0xff9966, sunIntensity: 0,    moonIntensity: 0.45, hemiSky: 0x3a4c80, hemiGround: 0x161a26, hemiIntensity: 0.65, exposure: 1.15, night: 0.95, glow: 0.2 },
  { hour: 6.5,  skyTop: 0x3d5f9f, skyHorizon: 0xffa266, sunColor: 0xffb070, sunIntensity: 0.75, moonIntensity: 0.12, hemiSky: 0x93a9d6, hemiGround: 0x54463a, hemiIntensity: 0.85, exposure: 1.1,  night: 0.35, glow: 1 },
  { hour: 8.5,  skyTop: 0x4b8fe0, skyHorizon: 0xbfdaf2, sunColor: 0xffe4bc, sunIntensity: 1.5,  moonIntensity: 0,    hemiSky: 0xbed5ff, hemiGround: 0x727258, hemiIntensity: 1.0,  exposure: 1.05, night: 0,    glow: 0.15 },
  { hour: 12,   skyTop: 0x3d84e0, skyHorizon: 0xaed6f5, sunColor: 0xfff6e8, sunIntensity: 1.9,  moonIntensity: 0,    hemiSky: 0xc6dcff, hemiGround: 0x7c7c5c, hemiIntensity: 1.05, exposure: 1.0,  night: 0,    glow: 0 },
  { hour: 16,   skyTop: 0x4a88dc, skyHorizon: 0xb4d4ee, sunColor: 0xffe9c4, sunIntensity: 1.7,  moonIntensity: 0,    hemiSky: 0xc0d6ff, hemiGround: 0x78785a, hemiIntensity: 1.0,  exposure: 1.0,  night: 0,    glow: 0.1 },
  { hour: 18.5, skyTop: 0x3a5fa0, skyHorizon: 0xffb36b, sunColor: 0xff9f55, sunIntensity: 1.1,  moonIntensity: 0,    hemiSky: 0xa9b8dd, hemiGround: 0x6a5a48, hemiIntensity: 0.85, exposure: 1.1,  night: 0.15, glow: 1 },
  { hour: 19.7, skyTop: 0x2a3f78, skyHorizon: 0xff6e4a, sunColor: 0xff7a3c, sunIntensity: 0.5,  moonIntensity: 0.15, hemiSky: 0x7f86b8, hemiGround: 0x4a3c3c, hemiIntensity: 0.75, exposure: 1.15, night: 0.55, glow: 1 },
  { hour: 21,   skyTop: 0x10193f, skyHorizon: 0x3a2f5a, sunColor: 0xff7a3c, sunIntensity: 0,    moonIntensity: 0.45, hemiSky: 0x44558a, hemiGround: 0x1c1d2a, hemiIntensity: 0.7,  exposure: 1.15, night: 0.9,  glow: 0.3 },
  { hour: 24,   skyTop: 0x050a1c, skyHorizon: 0x111a34, sunColor: 0xffffff, sunIntensity: 0,    moonIntensity: 0.55, hemiSky: 0x3a4c80, hemiGround: 0x161a26, hemiIntensity: 0.65, exposure: 1.15, night: 1,    glow: 0 }
];

export interface TimeState {
  hour: number;
  night: number;
  /** высота солнца над горизонтом, −1…1 */
  sunElevation: number;
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform float glow;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.5));
    col = mix(col, horizonColor * 0.85, smoothstep(0.0, -0.25, h));
    float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
    float nearHorizon = 1.0 - smoothstep(0.0, 0.55, abs(sunDir.y));
    col += sunColor * (pow(s, 6.0) * 0.55 + pow(s, 40.0) * 0.5) * glow * nearHorizon;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const c1 = new THREE.Color();
const c2 = new THREE.Color();

export class TimeOfDay {
  private hour = 13;
  private transition: { from: number; delta: number; t: number; duration: number } | null = null;
  private cycleSpeed = 0; // часов в секунду

  private readonly dome: THREE.Mesh;
  private readonly domeMat: THREE.ShaderMaterial;
  private readonly stars: THREE.Points;
  private readonly sunSprite: THREE.Sprite;
  private readonly moonSprite: THREE.Sprite;
  private readonly fog: THREE.Fog;

  public readonly sunDir = new THREE.Vector3(0, 1, 0.3);
  public readonly moonDir = new THREE.Vector3(0, -1, 0.3);

  private listeners: Array<(s: TimeState) => void> = [];
  private state: TimeState = { hour: 13, night: 0, sunElevation: 1 };

  constructor(
    scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.Camera,
    private sun: THREE.DirectionalLight,
    private moon: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight
  ) {
    this.fog = new THREE.Fog(0xaed6f5, 140, 850);
    scene.fog = this.fog;
    scene.background = null;

    this.domeMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        topColor: { value: new THREE.Color() },
        horizonColor: { value: new THREE.Color() },
        sunColor: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        glow: { value: 0 }
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), this.domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // Звёзды
    const starCount = 900;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random() * 0.95 + 0.02;
      const theta = u * Math.PI * 2;
      const y = v; // только верхняя полусфера
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(theta) * r * 950;
      pos[i * 3 + 1] = y * 950;
      pos[i * 3 + 2] = Math.sin(theta) * r * 950;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    scene.add(this.stars);

    // Солнце и луна
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xfff1c8, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    }));
    this.sunSprite.scale.setScalar(160);
    this.sunSprite.renderOrder = -8;
    scene.add(this.sunSprite);

    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xdfe8ff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    }));
    this.moonSprite.scale.setScalar(60);
    this.moonSprite.renderOrder = -8;
    scene.add(this.moonSprite);

    this.apply();
  }

  // ------------------------------------------------------------------- API

  public getHour(): number {
    return this.hour;
  }

  public getState(): TimeState {
    return this.state;
  }

  public onChange(cb: (s: TimeState) => void): void {
    this.listeners.push(cb);
    cb(this.state);
  }

  public setHour(hour: number): void {
    this.transition = null;
    this.hour = ((hour % 24) + 24) % 24;
    this.apply();
  }

  /** Плавно «перематывает» время к нужному часу по кратчайшему направлению */
  public transitionTo(targetHour: number, durationSec = 4): void {
    let d = ((targetHour - this.hour) % 24 + 24) % 24;
    if (d > 12) d -= 24;
    if (Math.abs(d) < 0.05) return;
    this.transition = { from: this.hour, delta: d, t: 0, duration: Math.max(0.5, durationSec) };
  }

  /** hoursPerSecond = 0 — выключить автоматическую смену дня и ночи */
  public setCycleSpeed(hoursPerSecond: number): void {
    this.cycleSpeed = hoursPerSecond;
  }

  public getCycleSpeed(): number {
    return this.cycleSpeed;
  }

  public update(dtSec: number): void {
    let changed = false;

    if (this.transition) {
      const tr = this.transition;
      tr.t = Math.min(1, tr.t + dtSec / tr.duration);
      const e = tr.t * tr.t * (3 - 2 * tr.t); // smoothstep
      this.hour = (((tr.from + tr.delta * e) % 24) + 24) % 24;
      if (tr.t >= 1) this.transition = null;
      changed = true;
    } else if (this.cycleSpeed !== 0) {
      this.hour = (this.hour + this.cycleSpeed * dtSec + 24) % 24;
      changed = true;
    }

    // Небо следует за камерой всегда, остальное пересчитываем при изменении часа
    this.dome.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    this.sunSprite.position.copy(this.camera.position).addScaledVector(this.sunDir, 900);
    this.moonSprite.position.copy(this.camera.position).addScaledVector(this.moonDir, 900);

    if (changed) {
      this.apply();
    }

  }

  // --------------------------------------------------------------- расчёты

  private sampleKey(): { a: Key; b: Key; f: number } {
    const h = this.hour;
    for (let i = 0; i < KEYS.length - 1; i++) {
      const a = KEYS[i];
      const b = KEYS[i + 1];
      if (h >= a.hour && h <= b.hour) {
        const f = (h - a.hour) / (b.hour - a.hour || 1);
        return { a, b, f: f * f * (3 - 2 * f) };
      }
    }
    return { a: KEYS[0], b: KEYS[0], f: 0 };
  }

  private apply(): void {
    const { a, b, f } = this.sampleKey();
    const mix = (x: number, y: number): number => x + (y - x) * f;
    const col = (out: THREE.Color, ka: number, kb: number): THREE.Color =>
      out.copy(c1.setHex(ka)).lerp(c2.setHex(kb), f);

    const u = this.domeMat.uniforms;
    col(u.topColor.value as THREE.Color, a.skyTop, b.skyTop);
    const horizon = col(u.horizonColor.value as THREE.Color, a.skyHorizon, b.skyHorizon);
    col(u.sunColor.value as THREE.Color, a.sunColor, b.sunColor);
    u.glow.value = mix(a.glow, b.glow);

    // Положение солнца и луны
    const ang = ((this.hour - 6.5) / 13) * Math.PI; // восход 6:30, закат 19:30
    this.sunDir.set(Math.cos(ang) * 0.95, Math.sin(ang) * 0.92, 0.35).normalize();
    this.moonDir.set(-Math.cos(ang) * 0.95, -Math.sin(ang) * 0.92 + 0.05, 0.3).normalize();
    (u.sunDir.value as THREE.Vector3).copy(this.sunDir);

    // Свет
    col(this.sun.color, a.sunColor, b.sunColor);
    this.sun.intensity = mix(a.sunIntensity, b.sunIntensity);
    this.sun.visible = this.sun.intensity > 0.02 && this.sunDir.y > -0.05;
    this.moon.intensity = mix(a.moonIntensity, b.moonIntensity);
    this.moon.visible = this.moon.intensity > 0.02;
    this.moon.color.setHex(0x9db6ff);

    col(this.hemi.color, a.hemiSky, b.hemiSky);
    col(this.hemi.groundColor, a.hemiGround, b.hemiGround);
    this.hemi.intensity = mix(a.hemiIntensity, b.hemiIntensity);

    // Туман повторяет цвет горизонта — дальние дома растворяются в небе
    this.fog.color.copy(horizon);

    this.renderer.toneMappingExposure = mix(a.exposure, b.exposure);

    const night = mix(a.night, b.night);
    (this.stars.material as THREE.PointsMaterial).opacity = Math.pow(THREE.MathUtils.clamp((night - 0.4) / 0.6, 0, 1), 1.5);

    const sunMat = this.sunSprite.material as THREE.SpriteMaterial;
    sunMat.opacity = THREE.MathUtils.clamp((this.sunDir.y + 0.1) * 4, 0, 1);
    sunMat.color.copy(this.sun.color);
    this.sunSprite.visible = sunMat.opacity > 0.01;
    const moonMat = this.moonSprite.material as THREE.SpriteMaterial;
    moonMat.opacity = THREE.MathUtils.clamp((this.moonDir.y + 0.05) * 3, 0, 1) * Math.min(1, night * 1.5);
    this.moonSprite.visible = moonMat.opacity > 0.01;

    this.state = { hour: this.hour, night, sunElevation: this.sunDir.y };
    for (const cb of this.listeners) cb(this.state);
  }
}
