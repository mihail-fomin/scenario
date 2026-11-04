import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraDirector } from '../src/js/systems/CameraDirector';
import { StageManager } from '../src/js/systems/StageManager';
import { LOCATIONS } from '../src/js/data/stages';
import type { CameraController, CameraShot } from '../src/js/systems/CameraController';
import type { CharacterInterface } from '../src/types/index';

function fakeCharacter(x: number, z: number): CharacterInterface {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  return {
    group,
    walkTo: () => undefined,
    teleportTo: () => undefined,
    isMoving: () => false,
    faceTowards: () => undefined,
    lookAtCharacter: () => undefined,
    getHeadPosition: (out: THREE.Vector3) => out.set(group.position.x, 1.8, group.position.z),
    getFacingAngle: () => 0
  } as unknown as CharacterInterface;
}

function setup() {
  const chars = [fakeCharacter(0, -2), fakeCharacter(-2, -1), fakeCharacter(2, -1)];
  const stage = new StageManager(chars);
  void stage.goTo(LOCATIONS.yard, true);
  let shot: CameraShot | null = null;
  const controller = { setShot: (s: CameraShot | null) => { shot = s; } } as unknown as CameraController;
  const director = new CameraDirector(controller, chars, stage);
  return { chars, director, getShot: (): CameraShot => shot as CameraShot };
}

describe('CameraDirector', () => {
  it('в паузе камера облетает центр сцены', () => {
    const { director, getShot } = setup();
    director.update(0.016);
    expect(getShot().orbitSpeed).toBeGreaterThan(0);
    expect(getShot().radius).toBeGreaterThan(8);
  });

  it('на короткой реплике — крупный план говорящего', () => {
    const { chars, director, getShot } = setup();
    director.onLine(chars[1], 'Да!', 'neutral');
    director.update(0.016);

    const shot = getShot();
    expect(shot.radius).toBeLessThan(5);
    expect(shot.target.x).toBeCloseTo(chars[1].group.position.x);
  });

  it('длинная реплика не снимается общим планом', () => {
    const { chars, director, getShot } = setup();
    const long = 'очень длинная реплика '.repeat(12);
    for (let i = 0; i < 6; i++) {
      director.onLine(chars[0], long, 'neutral');
      director.update(0.016);
      expect(getShot().radius).toBeLessThan(10);
    }
  });

  it('через паузу после реплики возвращается к облёту', () => {
    const { chars, director, getShot } = setup();
    director.onLine(chars[0], 'Привет, как дела у всех вас?', 'neutral');
    director.update(0.016);
    director.onLineEnd();
    for (let i = 0; i < 120; i++) director.update(0.016); // ~1.9 с
    expect(getShot().radius).toBeGreaterThan(8);
  });
});
