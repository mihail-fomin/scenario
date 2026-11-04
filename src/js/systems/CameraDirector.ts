import * as THREE from 'three';
import { CameraController, CameraShot } from './CameraController.js';
import { StageManager } from './StageManager.js';
import { CharacterInterface, Emotion } from '@/types/index';

type LineShot = 'close' | 'medium' | 'over' | 'two' | 'wide';
type Mode = 'idle' | 'follow' | 'establish' | 'line';

/** Порядок планов для чередующихся реплик — получается «монтаж», а не статичная камера */
const SHOT_CYCLE: LineShot[] = ['medium', 'close', 'over', 'two', 'close', 'wide'];

/**
 * «Оператор»: выбирает кадр в зависимости от ситуации — прогулка, прибытие на место,
 * реплика (крупный/средний/через плечо/двойной/общий план) или пауза (облёт сцены).
 * Пользователь может в любой момент перехватить камеру мышью — она вернётся к режиссёру
 * через AUTO_RETURN_DELAY секунд бездействия.
 */
export class CameraDirector {
  private mode: Mode = 'idle';
  private lineShot: LineShot = 'medium';
  private lineTime = 0;
  private lineCounter = 0;
  private side = 1;
  private speaker: CharacterInterface | null = null;
  private previousSpeaker: CharacterInterface | null = null;
  private emotion: Emotion = 'neutral';
  private idleAt = 0;
  private establishTimer = 0;
  private clock = 0;

  private readonly shot: CameraShot = {
    target: new THREE.Vector3(),
    yaw: 0, pitch: 0.3, radius: 10, fov: 70, orbitSpeed: 0, stiffness: 3
  };
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();

  constructor(
    private controller: CameraController,
    private characters: CharacterInterface[],
    private stage: StageManager
  ) {}

  // ------------------------------------------------------------ события

  public followWalk(): void {
    this.mode = 'follow';
  }

  /** Общий план места после прихода персонажей */
  public establish(seconds = 3): void {
    this.mode = 'establish';
    this.establishTimer = seconds;
    this.side = Math.random() < 0.5 ? -1 : 1;
  }

  public onLine(speaker: CharacterInterface, text: string, emotion: Emotion): void {
    this.previousSpeaker = this.speaker && this.speaker !== speaker ? this.speaker : this.previousSpeaker;
    this.speaker = speaker;
    this.emotion = emotion;
    this.mode = 'line';
    this.lineTime = 0;
    this.idleAt = 0;
    this.side = -this.side;

    // Выбор плана: короткие реплики и сильные эмоции — крупно, длинные — средним планом
    let kind = SHOT_CYCLE[this.lineCounter % SHOT_CYCLE.length];
    if (text.length < 45 || emotion === 'angry' || emotion === 'surprised') kind = 'close';
    else if (text.length > 170 && (kind === 'close' || kind === 'wide')) kind = 'medium';
    this.lineShot = kind;
    this.lineCounter++;
  }

  /** Вызывать после окончания реплики: если за паузой не последует новая, камера переходит к облёту */
  public onLineEnd(): void {
    this.idleAt = this.clock + 1.4;
  }

  public reset(): void {
    this.mode = 'idle';
    this.speaker = null;
    this.previousSpeaker = null;
    this.lineCounter = 0;
  }

  // ------------------------------------------------------------- расчёт

  public update(dtSec: number): void {
    this.clock += dtSec;

    if (this.mode === 'establish') {
      this.establishTimer -= dtSec;
      if (this.establishTimer <= 0) this.mode = 'idle';
    }
    if (this.mode === 'line' && this.idleAt > 0 && this.clock >= this.idleAt) {
      this.mode = 'idle';
    }
    // Если режиссёр был в режиме прогулки, а все уже пришли — общий план
    if (this.mode === 'follow' && !this.stage.isWalking()) {
      this.establish(3);
    }

    switch (this.mode) {
      case 'follow': this.computeFollow(); break;
      case 'establish': this.computeEstablish(); break;
      case 'line': this.computeLine(dtSec); break;
      default: this.computeIdle(); break;
    }
    this.controller.setShot(this.shot);
  }

  private set(target: THREE.Vector3, yaw: number, pitch: number, radius: number, fov: number, orbit = 0, stiffness = 3): void {
    this.shot.target.copy(target);
    this.shot.yaw = yaw;
    this.shot.pitch = pitch;
    this.shot.radius = radius;
    this.shot.fov = fov;
    this.shot.orbitSpeed = orbit;
    this.shot.stiffness = stiffness;
  }

  /** Угол «от цели к камере», при котором камера стоит позади компании относительно места интереса */
  private backYaw(): number {
    const d = this.stage.getDirection();
    return Math.atan2(-d.x, -d.y);
  }

  private computeIdle(): void {
    const c = this.stage.getCenter();
    this.a.set(c.x, 1.3, c.z);
    this.set(this.a, this.backYaw() + 0.8 * this.side, 0.26, 11, 68, 0.09, 2.2);
  }

  private computeEstablish(): void {
    // Показываем место: цель — между компанией и интересным объектом
    const c = this.stage.getCenter();
    const look = this.stage.getLookAt();
    this.a.set((c.x + look.x) / 2, 2.2, (c.z + look.z) / 2);
    this.set(this.a, this.backYaw() + 0.55 * this.side, 0.2, 18, 62, 0.04, 1.6);
  }

  private computeFollow(): void {
    this.stage.getGroupCentroid(this.a);
    this.a.y = 1.4;
    const lead = this.characters[0];
    const heading = lead ? lead.getFacingAngle() : 0;
    // камера сзади-сбоку по ходу движения
    this.set(this.a, heading + Math.PI + 0.7, 0.2, 9, 70, 0, 2.4);
  }

  private computeLine(dtSec: number): void {
    this.lineTime += dtSec;
    const sp = this.speaker;
    if (!sp) { this.computeIdle(); return; }

    sp.getHeadPosition(this.a);
    const faceAngle = sp.getFacingAngle();
    // медленный наезд в течение реплики
    const push = 1 - Math.min(this.lineTime, 5) * 0.025;
    const intense = this.emotion === 'angry' || this.emotion === 'surprised';

    switch (this.lineShot) {
      case 'close':
        this.a.y -= 0.1;
        this.set(this.a, faceAngle + 0.42 * this.side, 0.06, 3.3 * push, intense ? 40 : 46, 0, 3.6);
        break;

      case 'medium':
        this.a.y -= 0.45;
        this.set(this.a, faceAngle + 0.5 * this.side, 0.12, 5.4 * push, 54, 0, 2.8);
        break;

      case 'over': {
        // Через плечо: камера чуть сбоку и ближе к собеседнику, в кадре оба
        const other = this.previousSpeaker && this.previousSpeaker !== sp
          ? this.previousSpeaker
          : this.characters.find(c => c !== sp) ?? sp;
        other.getHeadPosition(this.b);
        this.a.lerp(this.b, 0.3);
        this.a.y -= 0.3;
        const dx = this.b.x - this.a.x;
        const dz = this.b.z - this.a.z;
        // камера «за спиной» собеседника, смотрит на говорящего
        const toOther = Math.atan2(dx, dz);
        this.set(this.a, toOther + 0.75 * this.side, 0.2, 6.6 * push, 52, 0, 2.6);
        break;
      }

      case 'two': {
        const other = this.previousSpeaker && this.previousSpeaker !== sp
          ? this.previousSpeaker
          : this.characters.find(c => c !== sp) ?? sp;
        other.getHeadPosition(this.b);
        this.a.add(this.b).multiplyScalar(0.5);
        this.a.y -= 0.2;
        const dist = Math.hypot(this.b.x - sp.group.position.x, this.b.z - sp.group.position.z);
        this.set(this.a, faceAngle + 0.9 * this.side, 0.14, (5.5 + dist * 0.9) * push, 58, 0, 2.4);
        break;
      }

      default: {
        this.stage.getGroupCentroid(this.a);
        this.a.y = 1.5;
        this.set(this.a, this.backYaw() + 0.7 * this.side, 0.2, 12 * push, 64, 0.06, 2.0);
        break;
      }
    }
  }
}
