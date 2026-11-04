import * as THREE from 'three';
import { CharacterInterface } from '@/types/index';
import { StageLocation, LOCATIONS, SLOT_OFFSETS } from '../data/stages.js';

/**
 * Расставляет персонажей по месту действия и водит их между местами.
 */
export class StageManager {
  private current: StageLocation = LOCATIONS.yard;
  private readonly center = new THREE.Vector3(0, 0, 0);
  private readonly dir = new THREE.Vector2(0, 1);
  private walking = false;
  private waiters: Array<() => void> = [];

  constructor(private characters: CharacterInterface[]) {}

  public getLocation(): StageLocation {
    return this.current;
  }

  public getCenter(): THREE.Vector3 {
    return this.center;
  }

  /** Единичный вектор «вперёд» (в сторону интересного объекта) в плоскости XZ */
  public getDirection(): THREE.Vector2 {
    return this.dir;
  }

  public isWalking(): boolean {
    return this.walking;
  }

  public getLookAt(): THREE.Vector3 {
    return new THREE.Vector3(this.current.lookAt[0], 0, this.current.lookAt[1]);
  }

  private slot(i: number): THREE.Vector3 {
    const [side, fwd] = SLOT_OFFSETS[i % SLOT_OFFSETS.length];
    // «вбок» = (dir.y, -dir.x): при dir = (0, 1) даёт (1, 0)
    const px = this.center.x + this.dir.x * fwd + this.dir.y * side;
    const pz = this.center.z + this.dir.y * fwd - this.dir.x * side;
    return new THREE.Vector3(px, 0, pz);
  }

  /**
   * Отправляет персонажей на место. Промис выполняется, когда все дошли.
   * instant — без прогулки (например, при старте).
   */
  public goTo(location: StageLocation, instant = false): Promise<void> {
    this.current = location;
    this.center.set(location.center[0], 0, location.center[1]);
    this.dir.set(location.lookAt[0] - location.center[0], location.lookAt[1] - location.center[1]).normalize();

    this.characters.forEach((c, i) => {
      const p = this.slot(i);
      if (instant) {
        c.teleportTo(p.x, p.z);
      } else {
        const dist = Math.hypot(p.x - c.group.position.x, p.z - c.group.position.z);
        // Дальние маршруты проходим быстрее (бегом), но не дольше ~6 секунд
        c.walkTo(p.x, p.z, THREE.MathUtils.clamp(dist / 6, 3.2, 10));
      }
      c.faceTowards(this.center.x, this.center.z);
      c.lookAtCharacter(null);
    });

    // Все ли уже на месте?
    this.walking = !instant && this.characters.some(c => c.isMoving());
    if (!this.walking) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  public update(): void {
    if (!this.walking) return;
    if (this.characters.every(c => !c.isMoving())) {
      this.walking = false;
      const list = this.waiters;
      this.waiters = [];
      list.forEach(fn => fn());
    }
  }

  /** Центр группы персонажей (для кадра «следуем за ними») */
  public getGroupCentroid(out: THREE.Vector3): THREE.Vector3 {
    out.set(0, 0, 0);
    this.characters.forEach(c => out.add(c.group.position));
    return out.multiplyScalar(1 / Math.max(1, this.characters.length));
  }
}
