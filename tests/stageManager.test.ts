import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { StageManager } from '../src/js/systems/StageManager';
import { LOCATIONS, SLOT_OFFSETS } from '../src/js/data/stages';
import type { CharacterInterface } from '../src/types/index';

type FakeCharacter = CharacterInterface & { arrive(): void };

/** Минимальная заглушка персонажа: «приходит» по вызову arrive() */
function fakeCharacter(x: number, z: number): FakeCharacter {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  let target: [number, number] | null = null;
  const c = {
    group,
    walkTo: (tx: number, tz: number) => { target = [tx, tz]; },
    teleportTo: (tx: number, tz: number) => { group.position.set(tx, 0, tz); target = null; },
    isMoving: () => target !== null,
    faceTowards: () => undefined,
    lookAtCharacter: () => undefined,
    arrive: () => {
      if (target) group.position.set(target[0], 0, target[1]);
      target = null;
    }
  };
  return c as unknown as FakeCharacter;
}

const makeChars = (): FakeCharacter[] => [fakeCharacter(0, -2), fakeCharacter(-2, -1), fakeCharacter(2, -1)];

describe('StageManager', () => {
  it('мгновенная расстановка во дворе даёт исходный треугольник', () => {
    const chars = makeChars();
    const stage = new StageManager(chars);
    void stage.goTo(LOCATIONS.yard, true);

    SLOT_OFFSETS.forEach(([side, fwd], i) => {
      expect(chars[i].group.position.x).toBeCloseTo(side);
      expect(chars[i].group.position.z).toBeCloseTo(fwd);
    });
    expect(stage.isWalking()).toBe(false);
  });

  it('треугольник поворачивается в сторону точки интереса', () => {
    const chars = makeChars();
    const stage = new StageManager(chars);
    // интерес строго на +x: «вперёд» = +x, тогда Лёха (-2 вперёд) стоит левее центра
    void stage.goTo({ id: 't', label: 't', center: [10, 10], lookAt: [20, 10], hour: 12 }, true);

    expect(chars[0].group.position.x).toBeCloseTo(8);
    expect(chars[0].group.position.z).toBeCloseTo(10);
    // «вбок» для dir=(1,0) — это (0,-1): Федот (side=-2) оказывается на z = 10 + 2
    expect(chars[1].group.position.z).toBeCloseTo(12);
    expect(chars[2].group.position.z).toBeCloseTo(8);
  });

  it('промис goTo выполняется, когда все дошли', async () => {
    const chars = makeChars();
    const stage = new StageManager(chars);
    let done = false;
    const p = stage.goTo(LOCATIONS.garage).then(() => { done = true; });

    expect(stage.isWalking()).toBe(true);
    stage.update();
    await Promise.resolve();
    expect(done).toBe(false);

    chars.forEach(c => c.arrive());
    stage.update();
    await p;
    expect(done).toBe(true);
    expect(stage.isWalking()).toBe(false);
    expect(stage.getLocation().id).toBe('garage');
  });

  it('центр группы — среднее положений', () => {
    const stage = new StageManager(makeChars());
    const c = stage.getGroupCentroid(new THREE.Vector3());
    expect(c.x).toBeCloseTo(0);
    expect(c.z).toBeCloseTo(-4 / 3);
  });
});
