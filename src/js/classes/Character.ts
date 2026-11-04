import * as THREE from 'three';
import { CharacterData, CharacterInterface, CharacterAppearance, Emotion } from '@/types/index';

const wrapAngle = (a: number): number => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

interface ArmPose { x: number; z: number }

/** Заготовки жестов для руки (x — вперёд/назад, z — в сторону) */
const GESTURES: ArmPose[] = [
  { x: -0.9, z: 0.55 },  // открытая ладонь
  { x: -1.4, z: 0.2 },   // указывает вперёд
  { x: -2.2, z: 0.35 },  // рука вверх
  { x: -0.5, z: 0.95 },  // «пожимает плечами»
  { x: -1.1, z: 0.1 },   // жест у груди
  { x: 0.25, z: 0.2 }    // назад
];
const REST: ArmPose = { x: 0, z: 0.1 };

interface EmotionFace {
  browAngle: number; // >0 — брови «злые» (внутренние концы вниз), <0 — «грустные»
  browY: number;
  mouthW: number;
  mouthOpen: number;
  mouthY: number;
  tilt: number;
}

const FACES: Record<Emotion, EmotionFace> = {
  neutral:   { browAngle: 0,     browY: 0,     mouthW: 1,   mouthOpen: 0,   mouthY: 0,     tilt: 0 },
  happy:     { browAngle: -0.15, browY: 0.015, mouthW: 1.8, mouthOpen: 0.6, mouthY: 0.01,  tilt: 0 },
  angry:     { browAngle: 0.55,  browY: -0.02, mouthW: 0.9, mouthOpen: 0.1, mouthY: -0.01, tilt: 0 },
  surprised: { browAngle: -0.1,  browY: 0.06,  mouthW: 0.7, mouthOpen: 2.4, mouthY: 0,     tilt: 0 },
  sad:       { browAngle: -0.45, browY: 0,     mouthW: 0.8, mouthOpen: 0,   mouthY: -0.03, tilt: 0.05 },
  curious:   { browAngle: -0.1,  browY: 0.03,  mouthW: 0.9, mouthOpen: 0.1, mouthY: 0,     tilt: 0.14 }
};

const DEFAULT_LOOKS: Record<string, CharacterAppearance> = {
  'Лёха':  { shirt: 0x4CAF50, pants: 0x37474f, hair: 'bald-m', hairColor: 0x3b2a1e, shoes: 0x1e1e1e },
  'Федот': { shirt: 0x2196F3, pants: 0x3e3a36, hair: 'short', hairColor: 0xc9a24a, shoes: 0xf0f0f0 },
  'Тихон': { shirt: 0xFF9800, pants: 0x263238, hair: 'cap', hatColor: 0x212121, shoes: 0x3e2723 }
};

export class Character implements CharacterInterface {
  public name: string;
  public color: number;
  public position: [number, number, number];
  public isSpeaking = false;
  public group: THREE.Group;
  public nameLabel: THREE.Mesh | null = null;

  private scene: THREE.Scene;
  private camera: THREE.Camera | null;
  private isNpc: boolean;
  private look: Required<Pick<CharacterAppearance, 'skin' | 'shirt' | 'pants' | 'shoes' | 'hair' | 'hairColor' | 'hatColor' | 'scale'>>;

  // Части тела
  private rig = new THREE.Group();
  private torso!: THREE.Group;
  private head!: THREE.Group;
  private armL!: THREE.Group;
  private armR!: THREE.Group;
  private legL!: THREE.Group;
  private legR!: THREE.Group;
  private eyes!: THREE.Group;
  private mouth!: THREE.Mesh;
  private browL!: THREE.Mesh;
  private browR!: THREE.Mesh;
  private labelCanvasTexture: THREE.CanvasTexture | null = null;

  // Состояние движения
  private moveTarget: THREE.Vector3 | null = null;
  private moveSpeed = 3.2;
  private faceYaw = 0;
  private facePoint: THREE.Vector3 | null = null;
  private lookTarget: CharacterInterface | null = null;
  private walkBlend = 0;
  private walkPhase = 0;
  private sitting = false;

  // Анимация
  private time = Math.random() * 10;
  private blinkTimer = 2 + Math.random() * 3;
  private blinkValue = 0;
  private gestureTimer = 0;
  private gestureR: ArmPose = REST;
  private gestureL: ArmPose = REST;
  private curR: ArmPose = { ...REST };
  private curL: ArmPose = { ...REST };
  private emotion: Emotion = 'neutral';
  private emotionTimer = 0;
  private face: EmotionFace = { ...FACES.neutral };
  private waveTimer = 0;
  private jumpTime = -1;
  private headYaw = 0;
  private speakAmount = 0;
  private tmpV = new THREE.Vector3();

  constructor(data: CharacterData, scene: THREE.Scene, camera: THREE.Camera | null) {
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this.scene = scene;
    this.camera = camera;
    this.isNpc = !!data.npc;

    const base = DEFAULT_LOOKS[data.name] ?? {};
    const a = { ...base, ...(data.appearance ?? {}) };
    this.look = {
      skin: a.skin ?? 0xF1C9A0,
      shirt: a.shirt ?? data.color,
      pants: a.pants ?? 0x3a3f4a,
      shoes: a.shoes ?? 0x222222,
      hair: a.hair ?? 'short',
      hairColor: a.hairColor ?? 0x4a3322,
      hatColor: a.hatColor ?? 0x333333,
      scale: a.scale ?? 1
    };

    this.group = new THREE.Group();
    this.buildBody();
    this.group.position.set(data.position[0], data.position[1], data.position[2]);
    this.facePoint = new THREE.Vector3(0, 0, 0);
    this.faceYaw = Math.atan2(-data.position[0], -data.position[2]);
    this.group.rotation.y = this.faceYaw;
    this.scene.add(this.group);

    // Клик по персонажу: подпись и приветствие
    this.group.userData.interactive = {
      label: this.name,
      onClick: () => {
        this.wave(1.8);
        this.setEmotion('happy', 1.8);
      }
    };

    if (!this.isNpc) this.createNameLabel();
  }

  // ---------------------------------------------------------------- модель

  private mat(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
  }

  private part(geo: THREE.BufferGeometry, color: number, castShadow = true): THREE.Mesh {
    const m = new THREE.Mesh(geo, this.mat(color));
    m.castShadow = castShadow;
    return m;
  }

  private buildBody(): void {
    const L = this.look;
    this.rig.scale.setScalar(0.85 * L.scale);
    this.group.add(this.rig);

    // Ноги
    const makeLeg = (x: number): THREE.Group => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.95, 0);
      const thigh = this.part(new THREE.CylinderGeometry(0.14, 0.12, 0.88, 10), L.pants);
      thigh.position.y = -0.44;
      const shoe = this.part(new THREE.BoxGeometry(0.25, 0.14, 0.42), L.shoes);
      shoe.position.set(0, -0.88, 0.07);
      leg.add(thigh, shoe);
      this.rig.add(leg);
      return leg;
    };
    this.legL = makeLeg(-0.18);
    this.legR = makeLeg(0.18);

    // Торс
    this.torso = new THREE.Group();
    this.torso.position.y = 0.95;
    this.rig.add(this.torso);
    const chest = this.part(new THREE.CylinderGeometry(0.42, 0.38, 0.78, 12), L.shirt);
    chest.position.y = 0.39;
    this.torso.add(chest);
    const belt = this.part(new THREE.CylinderGeometry(0.385, 0.385, 0.06, 12), 0x222222, false);
    belt.position.y = 0.02;
    this.torso.add(belt);

    // Руки
    const makeArm = (x: number): THREE.Group => {
      const arm = new THREE.Group();
      arm.position.set(x, 0.68, 0);
      const sleeve = this.part(new THREE.CylinderGeometry(0.11, 0.1, 0.42, 8), L.shirt);
      sleeve.position.y = -0.21;
      const fore = this.part(new THREE.CylinderGeometry(0.085, 0.075, 0.36, 8), L.skin);
      fore.position.y = -0.6;
      const hand = this.part(new THREE.SphereGeometry(0.095, 8, 6), L.skin);
      hand.position.y = -0.8;
      arm.add(sleeve, fore, hand);
      this.torso.add(arm);
      return arm;
    };
    this.armL = makeArm(-0.52);
    this.armR = makeArm(0.52);

    // Шея и голова
    const neck = this.part(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 8), L.skin, false);
    neck.position.y = 0.82;
    this.torso.add(neck);

    this.head = new THREE.Group();
    this.head.position.y = 1.12;
    this.torso.add(this.head);
    this.buildFace();
    this.buildHair();
  }

  private buildFace(): void {
    const L = this.look;
    const skull = this.part(new THREE.SphereGeometry(0.32, 20, 14), L.skin);
    skull.scale.set(1, 1.05, 1);
    this.head.add(skull);

    for (const sx of [-1, 1]) {
      const ear = this.part(new THREE.SphereGeometry(0.06, 8, 6), L.skin, false);
      ear.position.set(sx * 0.32, 0, 0);
      ear.scale.set(0.5, 1, 0.8);
      this.head.add(ear);
    }

    // Глаза (группа — чтобы моргать масштабом по Y)
    this.eyes = new THREE.Group();
    this.eyes.position.set(0, 0.05, 0.255);
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x15110d });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), white);
      eye.position.set(sx * 0.115, 0, 0);
      eye.scale.z = 0.45;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), pupilMat);
      pupil.position.set(sx * 0.115, 0, 0.03);
      this.eyes.add(eye, pupil);
    }
    this.head.add(this.eyes);

    // Брови
    const browMat = new THREE.MeshBasicMaterial({ color: this.look.hair === 'bald-m' ? 0x3b2a1e : L.hairColor });
    const makeBrow = (sx: number): THREE.Mesh => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.03), browMat);
      b.position.set(sx * 0.115, 0.17, 0.285);
      this.head.add(b);
      return b;
    };
    this.browL = makeBrow(-1);
    this.browR = makeBrow(1);

    // Нос и рот
    const nose = this.part(new THREE.SphereGeometry(0.045, 8, 6), L.skin, false);
    nose.position.set(0, -0.02, 0.32);
    nose.scale.set(0.9, 1, 1.1);
    this.head.add(nose);

    this.mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x5a1a1a })
    );
    this.mouth.position.set(0, -0.14, 0.295);
    this.head.add(this.mouth);
  }

  private buildHair(): void {
    const L = this.look;
    const hairMat = new THREE.MeshLambertMaterial({ color: L.hairColor });

    switch (L.hair) {
      case 'bald-m': {
        // Лысина с «буквой М» из волос на лбу + остатки волос по бокам и сзади
        const ring = new THREE.Mesh(new THREE.SphereGeometry(0.334, 16, 8, Math.PI, Math.PI, 1.0, 0.95), hairMat);
        ring.scale.set(1, 1.05, 1);
        ring.castShadow = true;
        this.head.add(ring);

        const m = new THREE.Group();
        const strokeMat = new THREE.MeshBasicMaterial({ color: L.hairColor });
        const stroke = (w: number, h: number, x: number, y: number, rz: number): void => {
          const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), strokeMat);
          s.position.set(x, y, 0);
          s.rotation.z = rz;
          m.add(s);
        };
        stroke(0.02, 0.1, -0.08, 0, 0);
        stroke(0.02, 0.1, 0.08, 0, 0);
        stroke(0.02, 0.1, -0.04, 0.02, -0.55);
        stroke(0.02, 0.1, 0.04, 0.02, 0.55);
        m.position.set(0, 0.2, 0.256);
        m.rotation.x = -0.7;
        this.head.add(m);
        break;
      }
      case 'short': {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, 1.25), hairMat);
        cap.scale.set(1, 1.05, 1);
        cap.rotation.x = -0.28;
        cap.castShadow = true;
        this.head.add(cap);
        break;
      }
      case 'cap': {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.345, 16, 10, 0, Math.PI * 2, 0, 1.3),
          new THREE.MeshLambertMaterial({ color: L.hatColor })
        );
        dome.scale.set(1, 1.05, 1);
        dome.castShadow = true;
        this.head.add(dome);
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.03, 0.26),
          new THREE.MeshLambertMaterial({ color: L.hatColor })
        );
        visor.position.set(0, 0.13, 0.4);
        visor.rotation.x = 0.12;
        visor.castShadow = true;
        this.head.add(visor);
        break;
      }
      case 'scarf': {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.355, 16, 10, 0, Math.PI * 2, 0, 1.45),
          new THREE.MeshLambertMaterial({ color: L.hatColor })
        );
        dome.scale.set(1, 1.05, 1);
        dome.castShadow = true;
        this.head.add(dome);
        break;
      }
      case 'long': {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, 1.45), hairMat);
        cap.scale.set(1, 1.05, 1);
        cap.rotation.x = -0.2;
        this.head.add(cap);
        const tail = this.part(new THREE.CylinderGeometry(0.2, 0.12, 0.6, 10), L.hairColor);
        tail.position.set(0, -0.2, -0.2);
        this.head.add(tail);
        break;
      }
      default:
        break;
    }
  }

  private createNameLabel(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = 'white';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.name, canvas.width / 2, canvas.height / 2);

    this.labelCanvasTexture = new THREE.CanvasTexture(canvas);
    this.labelCanvasTexture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: this.labelCanvasTexture,
      transparent: true,
      alphaTest: 0.1,
      opacity: 0.8,
      fog: false
    });
    this.nameLabel = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), material);
    this.nameLabel.renderOrder = 10;
    this.scene.add(this.nameLabel);
    this.updateLabel();
  }

  private updateLabel(): void {
    if (!this.nameLabel) return;
    const s = this.look.scale;
    this.nameLabel.position.set(
      this.group.position.x,
      this.group.position.y + 2.55 * s,
      this.group.position.z
    );
    if (this.camera) {
      this.nameLabel.lookAt(this.camera.position);
      // Подпись сохраняет примерно один и тот же видимый размер и исчезает вблизи (в крупном плане закрывала бы лицо)
      const dist = this.nameLabel.position.distanceTo(this.camera.position);
      const base = this.isSpeaking ? 1.2 : 1;
      this.nameLabel.scale.setScalar(THREE.MathUtils.clamp(dist / 12, 0.45, 2.6) * base);
      const fade = THREE.MathUtils.clamp((dist - 5) / 3, 0, 1);
      (this.nameLabel.material as THREE.Material).opacity = (this.isSpeaking ? 1 : 0.8) * fade;
      this.nameLabel.visible = fade > 0.02;
    }
  }

  // ------------------------------------------------------------------- API

  public startSpeaking(): void {
    this.isSpeaking = true;
    this.gestureTimer = 0;
  }

  public stopSpeaking(): void {
    this.isSpeaking = false;
  }

  public walkTo(x: number, z: number, speed?: number): void {
    this.moveTarget = new THREE.Vector3(x, this.group.position.y, z);
    if (speed) this.moveSpeed = speed;
    this.sitting = false;
  }

  public teleportTo(x: number, z: number): void {
    this.group.position.set(x, this.group.position.y, z);
    this.moveTarget = null;
  }

  public isMoving(): boolean {
    return this.moveTarget !== null;
  }

  public faceTowards(x: number, z: number): void {
    if (!this.facePoint) this.facePoint = new THREE.Vector3();
    this.facePoint.set(x, 0, z);
  }

  public lookAtCharacter(other: CharacterInterface | null): void {
    this.lookTarget = other;
  }

  public setEmotion(emotion: Emotion, durationSec = 0): void {
    this.emotion = emotion;
    this.emotionTimer = durationSec;
  }

  public wave(durationSec = 2): void {
    this.waveTimer = durationSec;
  }

  public jump(): void {
    this.jumpTime = 0;
  }

  public setSitting(sitting: boolean): void {
    this.sitting = sitting;
  }

  public getHeadPosition(out: THREE.Vector3): THREE.Vector3 {
    const s = 0.85 * this.look.scale;
    return out.set(this.group.position.x, this.group.position.y + 2.07 * s, this.group.position.z);
  }

  public getFacingAngle(): number {
    return this.group.rotation.y;
  }

  // ---------------------------------------------------------------- update

  /** @param deltaTimeMs время кадра в миллисекундах */
  public update(deltaTimeMs: number): void {
    const dt = Math.min(deltaTimeMs, 100) / 1000;
    if (dt <= 0) return;
    this.time += dt;

    this.updateMovement(dt);
    this.updateEmotion(dt);
    this.updatePose(dt);
    this.updateLabel();

    this.position[0] = this.group.position.x;
    this.position[1] = this.group.position.y;
    this.position[2] = this.group.position.z;
  }

  private updateMovement(dt: number): void {
    const pos = this.group.position;
    let desiredYaw = this.faceYaw;

    if (this.moveTarget) {
      this.tmpV.set(this.moveTarget.x - pos.x, 0, this.moveTarget.z - pos.z);
      const dist = this.tmpV.length();
      if (dist < 0.08) {
        pos.x = this.moveTarget.x;
        pos.z = this.moveTarget.z;
        this.moveTarget = null;
      } else {
        const step = Math.min(dist, this.moveSpeed * dt);
        this.tmpV.multiplyScalar(1 / dist);
        pos.x += this.tmpV.x * step;
        pos.z += this.tmpV.z * step;
        desiredYaw = Math.atan2(this.tmpV.x, this.tmpV.z);
      }
    }

    if (!this.moveTarget && this.facePoint) {
      const dx = this.facePoint.x - pos.x;
      const dz = this.facePoint.z - pos.z;
      if (dx * dx + dz * dz > 0.01) desiredYaw = Math.atan2(dx, dz);
    }

    this.faceYaw = this.faceYaw + wrapAngle(desiredYaw - this.faceYaw) * (1 - Math.exp(-(this.moveTarget ? 10 : 5) * dt));
    this.group.rotation.y = this.faceYaw;

    this.walkBlend = damp(this.walkBlend, this.moveTarget ? 1 : 0, 10, dt);
    if (this.moveTarget) {
      this.walkPhase += dt * (4.2 + this.moveSpeed * 1.6);
    }
  }

  private updateEmotion(dt: number): void {
    if (this.emotionTimer > 0) {
      this.emotionTimer -= dt;
      if (this.emotionTimer <= 0) this.emotion = 'neutral';
    }
    const target = FACES[this.emotion];
    const f = this.face;
    const r = 8;
    f.browAngle = damp(f.browAngle, target.browAngle, r, dt);
    f.browY = damp(f.browY, target.browY, r, dt);
    f.mouthW = damp(f.mouthW, target.mouthW, r, dt);
    f.mouthOpen = damp(f.mouthOpen, target.mouthOpen, r, dt);
    f.mouthY = damp(f.mouthY, target.mouthY, r, dt);
    f.tilt = damp(f.tilt, target.tilt, r, dt);
  }

  private pickGesture(): void {
    const pick = (): ArmPose => GESTURES[Math.floor(Math.random() * GESTURES.length)];
    this.gestureR = Math.random() < 0.85 ? pick() : REST;
    this.gestureL = Math.random() < 0.4 ? pick() : REST;
    this.gestureTimer = 1.0 + Math.random() * 1.6;
  }

  private updatePose(dt: number): void {
    const t = this.time;
    const speaking = this.isSpeaking;
    this.speakAmount = damp(this.speakAmount, speaking ? 1 : 0, 12, dt);

    // Моргание
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkValue = 1;
      this.blinkTimer = 2 + Math.random() * 4;
    }
    this.blinkValue = Math.max(0, this.blinkValue - dt * 9);
    this.eyes.scale.y = 1 - Math.sin(this.blinkValue * Math.PI) * 0.9;

    // Жесты при речи
    this.gestureTimer -= dt;
    if (speaking && this.gestureTimer <= 0) this.pickGesture();
    if (!speaking) { this.gestureR = REST; this.gestureL = REST; }

    const wb = this.walkBlend;
    const swing = Math.sin(this.walkPhase);
    const armRate = 7;

    let tgtR = this.gestureR;
    const tgtL = this.gestureL;
    let wobbleR = speaking ? Math.sin(t * 5.1) * 0.12 : Math.sin(t * 1.3) * 0.03;
    const wobbleL = speaking ? Math.sin(t * 4.3 + 1) * 0.1 : Math.sin(t * 1.1 + 2) * 0.03;

    // Приветствие рукой
    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      tgtR = { x: -2.6, z: 0.35 };
      wobbleR = Math.sin(t * 11) * 0.45;
    }

    this.curR.x = damp(this.curR.x, tgtR.x, armRate, dt);
    this.curR.z = damp(this.curR.z, tgtR.z, armRate, dt);
    this.curL.x = damp(this.curL.x, tgtL.x, armRate, dt);
    this.curL.z = damp(this.curL.z, tgtL.z, armRate, dt);

    // Руки: жест + покачивание при ходьбе
    this.armR.rotation.x = THREE.MathUtils.lerp(this.curR.x + wobbleR, -swing * 0.65, wb);
    this.armR.rotation.z = THREE.MathUtils.lerp(this.curR.z + (this.waveTimer > 0 ? wobbleR : 0), 0.08, wb);
    this.armL.rotation.x = THREE.MathUtils.lerp(this.curL.x + wobbleL, swing * 0.65, wb);
    this.armL.rotation.z = THREE.MathUtils.lerp(-(this.curL.z), -0.08, wb);

    // Ноги
    if (this.sitting) {
      this.legL.rotation.x = damp(this.legL.rotation.x, -1.45, 10, dt);
      this.legR.rotation.x = damp(this.legR.rotation.x, -1.45, 10, dt);
      this.rig.position.y = damp(this.rig.position.y, -0.32, 10, dt);
    } else {
      this.legL.rotation.x = swing * 0.75 * wb;
      this.legR.rotation.x = -swing * 0.75 * wb;
      this.rig.position.y = damp(this.rig.position.y, 0, 10, dt);
    }

    // Покачивание корпуса: шаг, дыхание, смех
    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.06 * wb;
    const breathe = Math.sin(t * 1.8) * 0.012;
    const laughing = this.emotion === 'happy' && (speaking || this.emotionTimer > 0);
    const laughBob = laughing ? Math.abs(Math.sin(t * 17)) * 0.05 : 0;
    this.torso.position.y = 0.95 + bob + laughBob;
    this.torso.scale.y = 1 + breathe;
    this.torso.rotation.z = Math.sin(this.walkPhase) * 0.04 * wb + (speaking ? Math.sin(t * 2.2) * 0.02 : 0);
    this.torso.rotation.x = laughing ? 0.12 : 0;

    // Прыжок
    let jumpY = 0;
    if (this.jumpTime >= 0) {
      this.jumpTime += dt;
      const p = this.jumpTime / 0.6;
      if (p >= 1) this.jumpTime = -1;
      else jumpY = Math.sin(p * Math.PI) * 0.7;
    }
    this.group.position.y = jumpY;

    // Голова: поворот к собеседнику, кивки, наклон
    let headTargetYaw = 0;
    if (this.lookTarget && !this.moveTarget) {
      const other = this.lookTarget.group.position;
      const ang = Math.atan2(other.x - this.group.position.x, other.z - this.group.position.z);
      headTargetYaw = THREE.MathUtils.clamp(wrapAngle(ang - this.faceYaw), -1.0, 1.0);
    }
    this.headYaw = damp(this.headYaw, headTargetYaw, 6, dt);
    this.head.rotation.y = this.headYaw + (speaking ? Math.sin(t * 1.7) * 0.12 : 0);
    this.head.rotation.x = (speaking ? Math.sin(t * 3.1) * 0.06 : 0) + (laughing ? -0.2 : 0) + (this.emotion === 'sad' ? 0.15 : 0);
    this.head.rotation.z = this.face.tilt;

    // Лицо
    const f = this.face;
    const talk = this.speakAmount * (0.3 + 0.7 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3)));
    const open = f.mouthOpen + talk * 1.2;
    this.mouth.scale.set(f.mouthW, 1 + open * 3.2, 1);
    this.mouth.position.y = -0.14 + f.mouthY - open * 0.008;
    this.browL.rotation.z = -f.browAngle;
    this.browR.rotation.z = f.browAngle;
    this.browL.position.y = 0.17 + f.browY;
    this.browR.position.y = 0.17 + f.browY + (this.emotion === 'curious' ? 0.035 : 0);
  }

  public dispose(): void {
    this.scene.remove(this.group);
    if (this.nameLabel) this.scene.remove(this.nameLabel);

    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        const mat = object.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      }
    });

    if (this.nameLabel) {
      this.nameLabel.geometry.dispose();
      (this.nameLabel.material as THREE.Material).dispose();
    }
    this.labelCanvasTexture?.dispose();
  }
}
