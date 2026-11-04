import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyBoxWorldUV } from '../src/js/utils/textures';
import { Window } from '../src/js/classes/Window';

describe('applyBoxWorldUV', () => {
  it('масштабирует UV так, чтобы тайл соответствовал метрам в мире', () => {
    // стена 12 × 3 × 6, тайл 6 × 3 м
    const geo = applyBoxWorldUV(new THREE.BoxGeometry(12, 3, 6), 6, 3);
    const uv = geo.attributes.uv as THREE.BufferAttribute;

    const range = (face: number): number[] => {
      let maxU = 0;
      let maxV = 0;
      for (let v = 0; v < 4; v++) {
        maxU = Math.max(maxU, uv.getX(face * 4 + v));
        maxV = Math.max(maxV, uv.getY(face * 4 + v));
      }
      return [maxU, maxV];
    };

    // грань +z: ширина 12 → 2 тайла по U, высота 3 → 1 по V
    expect(range(4)).toEqual([2, 1]);
    // грань +x: глубина 6 → 1 тайл, высота 3 → 1
    expect(range(0)).toEqual([1, 1]);
  });
});

describe('Window.setNightFactor', () => {
  it('днём стёкла одинаковые, ночью светящиеся теплее тёмных', () => {
    Window.setNightFactor(0);
    const dayDark = Window.getGlassMaterial(false).color.getHex();
    const dayLit = Window.getGlassMaterial(true).color.getHex();
    expect(dayDark).toBe(dayLit);

    Window.setNightFactor(1);
    const lit = Window.getGlassMaterial(true);
    const dark = Window.getGlassMaterial(false);
    expect(lit.emissive.r).toBeGreaterThan(0.2);
    expect(dark.emissive.getHex()).toBe(0);
    expect(lit.color.r).toBeGreaterThan(dark.color.r);

    Window.setNightFactor(0);
  });
});
