import * as THREE from 'three';

/**
 * Процедурные текстуры (canvas) — внешние файлы не нужны.
 * Все возвращаемые текстуры бесшовные (RepeatWrapping) и кэшируются.
 */

type Rgb = [number, number, number];

const cache = new Map<string, THREE.CanvasTexture>();
let maxAnisotropy = 8;

export function setMaxAnisotropy(value: number): void {
  maxAnisotropy = Math.max(1, value);
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function fill(ctx: CanvasRenderingContext2D, w: number, h: number, c: Rgb): void {
  ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  ctx.fillRect(0, 0, w, h);
}

/** Пиксельный шум: каждый пиксель смещается по яркости на ±amount */
function addNoise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** Бесшовное пятно: рисуем копии со сдвигом на размер тайла */
function blob(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let ox = -w; ox <= w; ox += w) {
    for (let oy = -h; oy <= h; oy += h) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function cached(key: string, build: () => THREE.CanvasTexture): THREE.CanvasTexture {
  let t = cache.get(key);
  if (!t) {
    t = build();
    cache.set(key, t);
  }
  return t;
}

/** Клон текстуры с другим повторением (изображение общее) */
export function withRepeat(tex: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
  const t = tex.clone();
  t.repeat.set(repeatX, repeatY);
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------

export function grassTexture(): THREE.CanvasTexture {
  return cached('grass', () => {
    const s = 256;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [112, 168, 84]);
    for (let i = 0; i < 70; i++) {
      const l = Math.random() > 0.5;
      blob(ctx, s, s, Math.random() * s, Math.random() * s, 10 + Math.random() * 28,
        l ? 'rgba(150,200,100,0.22)' : 'rgba(70,125,55,0.25)');
    }
    // «травинки»
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(60,120,45,0.55)' : 'rgba(170,215,110,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 4);
      ctx.stroke();
    }
    addNoise(ctx, s, s, 14);
    return toTexture(canvas);
  });
}

export function asphaltTexture(): THREE.CanvasTexture {
  return cached('asphalt', () => {
    const s = 256;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [66, 66, 70]);
    for (let i = 0; i < 40; i++) {
      blob(ctx, s, s, Math.random() * s, Math.random() * s, 8 + Math.random() * 24,
        Math.random() > 0.5 ? 'rgba(90,90,95,0.25)' : 'rgba(40,40,44,0.28)');
    }
    // трещины
    ctx.strokeStyle = 'rgba(25,25,28,0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      let x = Math.random() * s;
      let y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (Math.random() - 0.5) * 26;
        y += (Math.random() - 0.3) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    addNoise(ctx, s, s, 26);
    return toTexture(canvas);
  });
}

export function pavingTexture(): THREE.CanvasTexture {
  return cached('paving', () => {
    const s = 256;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [150, 146, 138]);
    const n = 4;
    const t = s / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = (Math.random() - 0.5) * 22;
        ctx.fillStyle = `rgb(${158 + v},${153 + v},${144 + v})`;
        ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
    }
    addNoise(ctx, s, s, 14);
    return toTexture(canvas);
  });
}

export function sandTexture(): THREE.CanvasTexture {
  return cached('sand', () => {
    const s = 256;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [216, 193, 140]);
    for (let i = 0; i < 50; i++) {
      blob(ctx, s, s, Math.random() * s, Math.random() * s, 8 + Math.random() * 22,
        Math.random() > 0.5 ? 'rgba(235,215,165,0.3)' : 'rgba(180,155,105,0.3)');
    }
    addNoise(ctx, s, s, 22);
    return toTexture(canvas);
  });
}

/** Плита панельного дома. Один тайл = 6 м × 3 м (ширина × высота этажа) */
export function panelWallTexture(): THREE.CanvasTexture {
  return cached('panelWall', () => {
    const w = 256;
    const h = 128;
    const { canvas, ctx } = makeCanvas(w, h);
    fill(ctx, w, h, [222, 220, 214]);
    for (let i = 0; i < 18; i++) {
      blob(ctx, w, h, Math.random() * w, Math.random() * h, 6 + Math.random() * 18,
        Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(120,110,95,0.10)');
    }
    // потёки под окнами/балконами
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * w;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(90,85,75,0.0)');
      g.addColorStop(1, 'rgba(90,85,75,0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 3 + Math.random() * 5, h);
    }
    addNoise(ctx, w, h, 10);
    // швы между панелями (по краям тайла — после повтора получается шов)
    ctx.fillStyle = 'rgba(95,92,86,0.9)';
    ctx.fillRect(0, 0, 4, h);
    ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(4, 0, 1, h);
    ctx.fillRect(0, 3, w, 1);
    return toTexture(canvas);
  });
}

/** Штукатурка (детский сад). Тайл 4 м × 4 м */
export function stuccoTexture(): THREE.CanvasTexture {
  return cached('stucco', () => {
    const s = 256;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [250, 238, 240]);
    for (let i = 0; i < 40; i++) {
      blob(ctx, s, s, Math.random() * s, Math.random() * s, 8 + Math.random() * 22,
        Math.random() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(200,170,175,0.12)');
    }
    addNoise(ctx, s, s, 16);
    return toTexture(canvas);
  });
}

/** Бетонная плита забора (1.5 м × 1.24 м) с рёбрами */
export function fenceConcreteTexture(): THREE.CanvasTexture {
  return cached('fenceConcrete', () => {
    const w = 128;
    const h = 128;
    const { canvas, ctx } = makeCanvas(w, h);
    fill(ctx, w, h, [205, 203, 198]);
    for (let i = 0; i < 14; i++) {
      blob(ctx, w, h, Math.random() * w, Math.random() * h, 5 + Math.random() * 14,
        Math.random() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(90,85,75,0.12)');
    }
    addNoise(ctx, w, h, 16);
    // горизонтальные рёбра
    for (const y of [24, 52, 80, 108]) {
      ctx.fillStyle = 'rgba(80,78,72,0.55)';
      ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, y + 3, w, 1);
    }
    return toTexture(canvas);
  });
}

export function roofTexture(): THREE.CanvasTexture {
  return cached('roof', () => {
    const s = 128;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [86, 86, 90]);
    for (let i = 0; i < 24; i++) {
      blob(ctx, s, s, Math.random() * s, Math.random() * s, 6 + Math.random() * 14,
        Math.random() > 0.5 ? 'rgba(120,120,125,0.25)' : 'rgba(40,40,44,0.25)');
    }
    addNoise(ctx, s, s, 20);
    return toTexture(canvas);
  });
}

/** Газон с полосами кошения. Растягивается на всё поле (без повтора) */
export function pitchTexture(): THREE.CanvasTexture {
  return cached('pitch', () => {
    const w = 256;
    const h = 128;
    const { canvas, ctx } = makeCanvas(w, h);
    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? 'rgb(76,160,70)' : 'rgb(66,146,62)';
      ctx.fillRect((i * w) / stripes, 0, w / stripes + 1, h);
    }
    addNoise(ctx, w, h, 14);
    return toTexture(canvas, false);
  });
}

export function woodTexture(): THREE.CanvasTexture {
  return cached('wood', () => {
    const s = 128;
    const { canvas, ctx } = makeCanvas(s, s);
    fill(ctx, s, s, [150, 108, 78]);
    for (let y = 0; y < s; y += 2) {
      const v = (Math.random() - 0.5) * 40;
      ctx.fillStyle = `rgba(${90 + v},${60 + v},${40 + v},0.35)`;
      ctx.fillRect(0, y, s, 1 + Math.random() * 2);
    }
    addNoise(ctx, s, s, 10);
    return toTexture(canvas);
  });
}

/** Мягкое свечение (для фонарей, солнца) */
export function glowTexture(): THREE.CanvasTexture {
  return cached('glow', () => {
    const s = 128;
    const { canvas, ctx } = makeCanvas(s, s);
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return toTexture(canvas, false);
  });
}

/**
 * Пересчитывает UV у BoxGeometry так, чтобы тайл текстуры соответствовал
 * (tileW × tileH) метрам в мире — тогда текстура не растягивается на длинных стенах.
 */
export function applyBoxWorldUV(geometry: THREE.BoxGeometry, tileW: number, tileH: number): THREE.BoxGeometry {
  const { width, height, depth } = geometry.parameters;
  // порядок граней BoxGeometry: +x, -x, +y, -y, +z, -z; по 4 вершины на грань
  const faceSizes: Array<[number, number]> = [
    [depth, height], [depth, height],
    [width, depth], [width, depth],
    [width, height], [width, height]
  ];
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = faceSizes[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * (fw / tileW), uv.getY(i) * (fh / tileH));
    }
  }
  uv.needsUpdate = true;
  return geometry;
}
