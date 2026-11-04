import * as THREE from 'three';
import {
  asphaltTexture, pavingTexture, sandTexture, pitchTexture, woodTexture, glowTexture, withRepeat
} from '../utils/textures.js';

/**
 * Наполнение двора: дорога, площадки, машины, гаражи, скамейки, фонари и т.д.
 * Вынесено из SceneManager, чтобы не раздувать его.
 */

export type RegisterAsset = (id: string, label: string, group: THREE.Group) => void;

type Updater = (dt: number, time: number) => void;

const mat = (color: number) => new THREE.MeshLambertMaterial({ color });
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function box(
  w: number, h: number, d: number, color: number,
  x = 0, y = 0, z = 0, shadow = true
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function cyl(
  rTop: number, rBot: number, h: number, color: number,
  x = 0, y = 0, z = 0, seg = 10
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Плоская плита на земле (дорога, дорожка, площадка) */
function slab(
  w: number, d: number, color: number, x: number, z: number, y = 0.02,
  texture?: THREE.Texture, tileSize = 0
): THREE.Mesh {
  const material = mat(texture ? 0xffffff : color);
  if (texture) {
    material.map = tileSize > 0 ? withRepeat(texture, w / tileSize, d / tileSize) : texture;
  }
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.08, z); // над полем, чтобы не было z-fighting
  m.receiveShadow = true;
  return m;
}

export class SceneDecor {
  private updaters: Updater[] = [];
  private time = 0;

  // Ночной режим
  private readonly bulbMat = new THREE.MeshBasicMaterial({ color: 0xbfbfbf });
  private readonly glowMat = new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false
  });
  private readonly cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
  private readonly headlightMat = new THREE.MeshBasicMaterial({ color: 0xcfcf9a });

  // Интерактив: множители скорости, затухающие со временем
  private carouselBoost = 0;
  private swingBoost = 0;
  private carBoost = 0;
  private ballKick = -1;

  constructor(private scene: THREE.Scene, private register?: RegisterAsset) {
    this.createRoadAndSidewalks();
    this.createFootpath();
    this.createPlayground();
    this.createFootballPitch();
    this.createGarages();
    this.createParkedCars();
    this.createDrivingCars();
    this.createBenchesAndLamps();
    this.createBusStop();
    this.createKiosk();
    this.createBushesAndFlowerbeds();
    this.createTrashAndBikes();
    this.createPowerPoles();
    this.createYardTrees();
    this.createClouds();
    this.createLaundryLine();
  }

  /** n: 0 — день, 1 — ночь. Включает фонари, подсветку фар, затемняет облака */
  public setNight(n: number): void {
    this.bulbMat.color.lerpColors(new THREE.Color(0xbfbfbf), new THREE.Color(0xfff0b8), Math.min(1, n * 1.4));
    this.glowMat.opacity = THREE.MathUtils.clamp((n - 0.25) / 0.5, 0, 1) * 0.9;
    this.cloudMat.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x2a3150), n);
    this.headlightMat.color.lerpColors(new THREE.Color(0xcfcf9a), new THREE.Color(0xffffcc), n);
  }

  /** @param deltaTime время кадра в миллисекундах (как в App.animate) */
  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 100) / 1000;
    this.time += dt;
    const decay = Math.exp(-dt / 2.5);
    this.carouselBoost *= decay;
    this.swingBoost *= decay;
    this.carBoost *= decay;
    this.updaters.forEach(u => u(dt, this.time));
  }

  private add(group: THREE.Group, id: string, label: string): void {
    group.name = id;
    group.userData.interactive = { label };
    this.scene.add(group);
    this.register?.(id, label, group);
  }

  // ---------- Дорога ----------

  private createRoadAndSidewalks(): void {
    const g = new THREE.Group();
    const roadZ = 45;
    g.add(slab(240, 8, 0x3a3a3a, 0, roadZ, 0.03, asphaltTexture(), 8));
    g.add(slab(240, 3, 0x9a9a9a, 0, roadZ - 5.5, 0.04, pavingTexture(), 3)); // тротуар с севера
    g.add(slab(240, 3, 0x9a9a9a, 0, roadZ + 5.5, 0.04, pavingTexture(), 3)); // тротуар с юга

    // Бордюры
    g.add(box(240, 0.15, 0.2, 0xcccccc, 0, 0.07, roadZ - 4.1, false));
    g.add(box(240, 0.15, 0.2, 0xcccccc, 0, 0.07, roadZ + 4.1, false));

    // Разметка
    for (let x = -118; x < 120; x += 6) {
      g.add(slab(3, 0.2, 0xf5f5f5, x, roadZ, 0.05));
    }

    // Пешеходный переход
    for (let i = -3; i <= 3; i++) {
      g.add(slab(0.8, 7.6, 0xf5f5f5, 0 + i * 1.4, roadZ, 0.05));
    }

    // Дорожный знак «Пешеходный переход»
    const signPole = cyl(0.06, 0.06, 2.8, 0x666666, -6, 1.4, roadZ - 4.8);
    const sign = box(0.9, 0.9, 0.06, 0x1565c0, -6, 2.9, roadZ - 4.8);
    sign.rotation.z = Math.PI / 4;
    g.add(signPole, sign);

    this.add(g, 'decor-road', 'Дорога и тротуары');
  }

  // ---------- Дорожка от забора ----------

  private createFootpath(): void {
    const g = new THREE.Group();
    g.add(slab(90, 2.6, 0xb0a99a, 0, 3, 0.03, pavingTexture(), 2.6));
    g.add(slab(2.6, 36, 0xb0a99a, 0, 21, 0.03, pavingTexture(), 2.6)); // дорожка к дороге
    this.add(g, 'decor-paths', 'Дорожки');
  }

  // ---------- Детская площадка ----------

  private createPlayground(): void {
    const g = new THREE.Group();
    const cx = -22, cz = 20;

    g.add(slab(22, 18, 0xd9c28a, cx, cz, 0.03, sandTexture(), 6)); // песочное покрытие
    // Бортик
    const bColor = 0x8d6e63;
    g.add(box(22, 0.3, 0.3, bColor, cx, 0.15, cz - 9, false));
    g.add(box(22, 0.3, 0.3, bColor, cx, 0.15, cz + 9, false));
    g.add(box(0.3, 0.3, 18, bColor, cx - 11, 0.15, cz, false));
    g.add(box(0.3, 0.3, 18, bColor, cx + 11, 0.15, cz, false));

    // Песочница с грибком
    const sb = new THREE.Group();
    sb.add(box(4, 0.35, 0.25, 0x6d4c41, 0, 0.18, -2));
    sb.add(box(4, 0.35, 0.25, 0x6d4c41, 0, 0.18, 2));
    sb.add(box(0.25, 0.35, 4, 0x6d4c41, -2, 0.18, 0));
    sb.add(box(0.25, 0.35, 4, 0x6d4c41, 2, 0.18, 0));
    sb.add(box(3.7, 0.2, 3.7, 0xf0d98c, 0, 0.12, 0, false));
    sb.add(cyl(0.08, 0.08, 2.2, 0x795548, 0, 1.1, 0));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.9, 12), mat(0xe53935));
    cap.position.set(0, 2.5, 0);
    cap.castShadow = true;
    sb.add(cap);
    sb.position.set(cx - 6, 0, cz - 4);
    g.add(sb);

    // Горка
    const sl = new THREE.Group();
    sl.add(box(1.6, 0.15, 1.6, 0x1e88e5, 0, 1.8, 0));
    for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      sl.add(cyl(0.06, 0.06, 1.8, 0xfdd835, px, 0.9, pz));
    }
    const ramp = box(1.0, 0.1, 3.4, 0xe53935, 0, 0.95, 2.3);
    ramp.rotation.x = Math.atan2(1.7, 2.9);
    sl.add(ramp);
    sl.add(box(0.1, 0.5, 3.4, 0xffb300, -0.55, 1.2, 2.3));
    sl.add(box(0.1, 0.5, 3.4, 0xffb300, 0.55, 1.2, 2.3));
    // Лесенка
    for (let i = 0; i < 5; i++) {
      sl.add(box(1, 0.08, 0.12, 0xfdd835, 0, 0.3 + i * 0.32, -1.1 - i * 0.05, false));
    }
    sl.position.set(cx + 5, 0, cz - 4);
    sl.rotation.y = Math.PI;
    g.add(sl);

    // Качели (раскачиваются)
    const sw = new THREE.Group();
    const frameH = 2.8;
    for (const sx of [-2, 2]) {
      const a = cyl(0.08, 0.08, frameH + 0.3, 0x546e7a, sx, frameH / 2, -0.8);
      a.rotation.x = -0.25;
      const b = cyl(0.08, 0.08, frameH + 0.3, 0x546e7a, sx, frameH / 2, 0.8);
      b.rotation.x = 0.25;
      sw.add(a, b);
    }
    const bar = cyl(0.07, 0.07, 4.3, 0x546e7a, 0, frameH, 0);
    bar.rotation.z = Math.PI / 2;
    sw.add(bar);
    const seats: THREE.Group[] = [];
    for (const sx of [-1, 1]) {
      const seat = new THREE.Group();
      seat.add(box(0.8, 0.08, 0.35, 0xff7043, 0, -2.0, 0));
      seat.add(cyl(0.015, 0.015, 2.0, 0x222222, -0.35, -1.0, 0, 4));
      seat.add(cyl(0.015, 0.015, 2.0, 0x222222, 0.35, -1.0, 0, 4));
      seat.position.set(sx, frameH, 0);
      sw.add(seat);
      seats.push(seat);
    }
    sw.position.set(cx - 5, 0, cz + 5);
    g.add(sw);
    this.updaters.push((_dt, t) => {
      const boost = 1 + this.swingBoost * 1.2;
      seats[0].rotation.x = Math.sin(t * 1.6) * 0.5 * boost;
      seats[1].rotation.x = Math.sin(t * 1.6 + 1.3) * 0.35 * boost;
    });

    // Карусель (вращается)
    const carousel = new THREE.Group();
    carousel.add(cyl(1.4, 1.4, 0.12, 0x43a047, 0, 0.4, 0, 16));
    carousel.add(cyl(0.1, 0.1, 0.5, 0x333333, 0, 0.2, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const rail = box(0.08, 0.7, 0.08, 0xfdd835, Math.cos(a) * 1.2, 0.8, Math.sin(a) * 1.2);
      carousel.add(rail);
    }
    carousel.position.set(cx + 5, 0, cz + 5);
    g.add(carousel);
    this.updaters.push((dt) => { carousel.rotation.y += dt * (0.5 + this.carouselBoost * 4); });

    // Качалки-пружинки
    for (const [px, pz, color] of [[cx - 1, cz + 6.5, 0xe91e63], [cx + 1.5, cz + 6.5, 0x00acc1]] as const) {
      const sp = new THREE.Group();
      sp.add(cyl(0.12, 0.12, 0.6, 0x555555, 0, 0.3, 0));
      sp.add(box(0.5, 0.45, 0.9, color, 0, 0.85, 0));
      sp.add(box(0.5, 0.45, 0.4, color, 0, 1.15, 0.4));
      sp.position.set(px, 0, pz);
      g.add(sp);
    }

    this.add(g, 'decor-playground', 'Детская площадка');
    g.userData.interactive.onClick = () => {
      this.carouselBoost = 1;
      this.swingBoost = 1;
    };
  }

  // ---------- Футбольное поле ----------

  private createFootballPitch(): void {
    const g = new THREE.Group();
    const cx = 22, cz = 18, w = 26, d = 16;

    g.add(slab(w, d, 0x4caf50, cx, cz, 0.03, pitchTexture()));
    const line = 0xffffff;
    g.add(slab(w, 0.15, line, cx, cz - d / 2 + 0.1, 0.04));
    g.add(slab(w, 0.15, line, cx, cz + d / 2 - 0.1, 0.04));
    g.add(slab(0.15, d, line, cx - w / 2 + 0.1, cz, 0.04));
    g.add(slab(0.15, d, line, cx + w / 2 - 0.1, cz, 0.04));
    g.add(slab(0.15, d, line, cx, cz, 0.04));
    const circle = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.0, 32), new THREE.MeshBasicMaterial({ color: line }));
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(cx, 0.045, cz);
    g.add(circle);

    // Ворота
    for (const side of [-1, 1]) {
      const gx = cx + side * (w / 2);
      const goal = new THREE.Group();
      goal.add(cyl(0.06, 0.06, 2.2, 0xffffff, 0, 1.1, -1.8));
      goal.add(cyl(0.06, 0.06, 2.2, 0xffffff, 0, 1.1, 1.8));
      const crossbar = cyl(0.06, 0.06, 3.6, 0xffffff, 0, 2.2, 0);
      crossbar.rotation.x = Math.PI / 2;
      goal.add(crossbar);
      const net = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 2.2),
        new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      net.rotation.y = Math.PI / 2;
      net.position.set(-side * 1.0, 1.1, 0);
      goal.add(net);
      goal.position.set(gx, 0, cz);
      g.add(goal);
    }

    // Мяч
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), mat(0xfafafa));
    ball.position.set(cx + 3, 0.25, cz + 2);
    ball.castShadow = true;
    g.add(ball);

    // Клик по полю — удар по мячу: мяч летит по дуге в случайную точку
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    this.updaters.push((dt) => {
      if (this.ballKick < 0) return;
      this.ballKick += dt / 1.4;
      if (this.ballKick >= 1) {
        this.ballKick = -1;
        ball.position.copy(to);
        ball.position.y = 0.25;
        return;
      }
      const k = this.ballKick;
      ball.position.lerpVectors(from, to, k);
      ball.position.y = 0.25 + Math.sin(k * Math.PI) * 3.2;
      ball.rotation.x += dt * 8;
    });

    this.add(g, 'decor-football', 'Футбольное поле');
    g.userData.interactive.onClick = () => {
      from.copy(ball.position);
      to.set((Math.random() - 0.5) * (w - 4), 0.25, (Math.random() - 0.5) * (d - 4));
      this.ballKick = 0;
    };
  }

  // ---------- Гаражи ----------

  private createGarages(): void {
    const g = new THREE.Group();
    const startX = 14, z = 32.5;
    const colors = [0x8d6e63, 0x607d8b, 0x7e57c2, 0x78909c, 0x8d6e63, 0x546e7a, 0x6d4c41, 0x90a4ae];
    const gw = 3.2;

    colors.forEach((c, i) => {
      const x = startX + i * gw + gw / 2;
      g.add(box(gw - 0.05, 2.6, 5, 0x9e9e9e, x, 1.3, z)); // корпус
      g.add(box(gw - 0.5, 2.2, 0.1, c, x, 1.15, z - 2.52)); // ворота
      // ребра на воротах
      for (let k = 0; k < 4; k++) {
        g.add(box(gw - 0.5, 0.05, 0.05, 0x333333, x, 0.4 + k * 0.55, z - 2.58, false));
      }
    });
    // Плоская крыша
    g.add(box(colors.length * gw + 0.4, 0.2, 5.4, 0x424242, startX + (colors.length * gw) / 2, 2.7, z));

    this.add(g, 'decor-garages', 'Гаражи');
  }

  // ---------- Машины ----------

  private createCar(color: number): THREE.Group {
    const car = new THREE.Group();
    car.add(box(4.2, 0.7, 1.8, color, 0, 0.7, 0));
    const cabin = box(2.2, 0.65, 1.6, color, -0.1, 1.35, 0);
    car.add(cabin);
    // стекла
    const glass = 0x90caf9;
    car.add(box(2.25, 0.45, 1.62, glass, -0.1, 1.38, 0, false));
    car.add(box(1.6, 0.5, 1.64, color, -0.1, 1.38, 0, false)); // стойки
    // фары
    for (const hz of [0.6, -0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.4), this.headlightMat);
      hl.position.set(2.1, 0.8, hz);
      car.add(hl);
    }
    car.add(box(0.05, 0.2, 0.4, 0xd32f2f, -2.1, 0.8, 0.6, false));
    car.add(box(0.05, 0.2, 0.4, 0xd32f2f, -2.1, 0.8, -0.6, false));
    // колёса
    for (const [wx, wz] of [[1.3, 0.9], [-1.3, 0.9], [1.3, -0.9], [-1.3, -0.9]]) {
      const wheel = cyl(0.38, 0.38, 0.25, 0x111111, wx, 0.38, wz, 12);
      wheel.rotation.x = Math.PI / 2;
      car.add(wheel);
    }
    return car;
  }

  private createParkedCars(): void {
    const g = new THREE.Group();
    const colors = [0xd32f2f, 0x1976d2, 0xeeeeee, 0x212121, 0xfbc02d, 0x388e3c, 0x9e9e9e, 0x6a1b9a];

    // Вдоль южного тротуара
    for (const x of [-52, -38, -30, -8, 10, 20, 52, 66]) {
      const car = this.createCar(colors[Math.floor(Math.random() * colors.length)]);
      car.position.set(x + rand(-0.5, 0.5), 0, 47.6);
      g.add(car);
    }
    // Перед гаражами
    for (const x of [20, 31]) {
      const car = this.createCar(colors[Math.floor(Math.random() * colors.length)]);
      car.position.set(x, 0, 38);
      car.rotation.y = Math.PI / 2;
      g.add(car);
    }
    // У дома на западе
    for (const z of [-5, 10, 20]) {
      const car = this.createCar(colors[Math.floor(Math.random() * colors.length)]);
      car.position.set(-40, 0, z);
      car.rotation.y = Math.PI / 2;
      g.add(car);
    }

    this.add(g, 'decor-parked-cars', 'Припаркованные машины');
  }

  private createDrivingCars(): void {
    const g = new THREE.Group();
    const specs = [
      { color: 0xff5722, speed: 8, z: 43.2, dir: 1, offset: -40 },
      { color: 0x03a9f4, speed: 6, z: 46.8, dir: -1, offset: 30 },
      { color: 0xcddc39, speed: 10, z: 43.2, dir: 1, offset: 60 },
    ];
    const range = 120;

    specs.forEach(s => {
      const car = this.createCar(s.color);
      car.rotation.y = s.dir === 1 ? 0 : Math.PI;
      car.position.set(s.offset, 0, s.z);
      g.add(car);
      this.updaters.push((dt) => {
        car.position.x += s.dir * s.speed * (1 + this.carBoost * 2.5) * dt;
        if (car.position.x > range) car.position.x = -range;
        if (car.position.x < -range) car.position.x = range;
      });
    });

    this.add(g, 'decor-driving-cars', 'Едущие машины');
    g.userData.interactive.onClick = () => { this.carBoost = 1; };
  }

  // ---------- Скамейки и фонари ----------

  private createBench(): THREE.Group {
    const b = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0xffffff, map: woodTexture() });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), wood);
    seat.position.set(0, 0.5, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.08), wood);
    back.position.set(0, 0.85, -0.25);
    seat.castShadow = back.castShadow = true;
    b.add(seat, back);
    b.add(box(0.1, 0.5, 0.5, 0x424242, -0.9, 0.25, 0));
    b.add(box(0.1, 0.5, 0.5, 0x424242, 0.9, 0.25, 0));
    return b;
  }

  private createLamp(): THREE.Group {
    const l = new THREE.Group();
    l.add(cyl(0.08, 0.1, 5, 0x37474f, 0, 2.5, 0));
    const arm = box(1.2, 0.08, 0.08, 0x37474f, 0.5, 5, 0);
    l.add(arm);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), this.bulbMat);
    bulb.position.set(1.0, 4.94, 0);
    l.add(bulb);
    const glow = new THREE.Sprite(this.glowMat);
    glow.scale.setScalar(5);
    glow.position.set(1.0, 4.8, 0);
    l.add(glow);
    return l;
  }

  private createBenchesAndLamps(): void {
    const g = new THREE.Group();

    // Скамейки вдоль дорожки
    for (const x of [-30, -14, 8, 26, 36]) {
      const b = this.createBench();
      b.position.set(x, 0, 5.2);
      g.add(b);
    }
    // Скамейки у площадки
    for (const [x, z, r] of [[-22, 30.5, Math.PI], [-34, 20, Math.PI / 2], [10, 28, Math.PI]] as const) {
      const b = this.createBench();
      b.position.set(x, 0, z);
      b.rotation.y = r;
      g.add(b);
    }
    // Фонари вдоль дорожки и дороги
    for (const x of [-36, -18, 0, 18, 36]) {
      const l = this.createLamp();
      l.position.set(x, 0, 1.2);
      g.add(l);
    }
    for (const x of [-44, -24, -4, 16, 36, 56]) {
      const l = this.createLamp();
      l.position.set(x, 0, 39.8);
      g.add(l);
    }

    this.add(g, 'decor-benches-lamps', 'Скамейки и фонари');
  }

  // ---------- Остановка ----------

  private createBusStop(): void {
    const g = new THREE.Group();
    g.add(box(5, 0.15, 2, 0x37474f, 0, 2.6, 0));
    for (const x of [-2.3, 2.3]) {
      g.add(box(0.12, 2.6, 0.12, 0x37474f, x, 1.3, -0.8));
      g.add(box(0.12, 2.6, 0.12, 0x37474f, x, 1.3, 0.8));
    }
    const back = box(4.6, 1.8, 0.05, 0x80deea, 0, 1.5, -0.95, false);
    (back.material as THREE.MeshLambertMaterial).transparent = true;
    (back.material as THREE.MeshLambertMaterial).opacity = 0.5;
    g.add(back);
    const bench = this.createBench();
    bench.position.set(0, 0, -0.5);
    g.add(bench);
    // Табличка
    g.add(cyl(0.05, 0.05, 3.2, 0x666666, 3.3, 1.6, 0));
    g.add(box(0.7, 0.5, 0.06, 0xfdd835, 3.3, 3.3, 0));

    g.position.set(-12, 0, 39.8);
    this.add(g, 'decor-busstop', 'Автобусная остановка');
  }

  // ---------- Ларёк ----------

  private createKiosk(): void {
    const g = new THREE.Group();
    g.add(box(4, 3, 3, 0xff8f00, 0, 1.5, 0));
    g.add(box(4.6, 0.2, 3.6, 0xc62828, 0, 3.1, 0));
    g.add(box(2.6, 1.0, 0.1, 0x81d4fa, 0, 1.8, 1.55, false)); // окно
    g.add(box(3, 0.1, 0.8, 0xeeeeee, 0, 1.25, 1.9)); // прилавок
    g.add(box(2.4, 0.5, 0.08, 0xffffff, 0, 3.6, 1.6, false)); // вывеска
    // Зонтик-тент
    const awning = box(3.4, 0.08, 1.2, 0x2e7d32, 0, 2.7, 2.1);
    awning.rotation.x = 0.3;
    g.add(awning);
    g.position.set(-42, 0, 37.5);
    g.rotation.y = Math.PI;
    this.add(g, 'decor-kiosk', 'Ларёк');
  }

  // ---------- Кусты и клумбы ----------

  private createBushesAndFlowerbeds(): void {
    const g = new THREE.Group();

    // Кусты вдоль внешней стороны забора, у южной грани (z = -6)
    for (let x = -34; x <= 34; x += 3 + Math.random() * 2) {
      if (Math.abs(x) < 3) continue;
      const r = rand(0.5, 0.9);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(new THREE.Color().setHSL(0.3, 0.6, rand(0.22, 0.35)).getHex()));
      bush.position.set(x, r * 0.7, -4.8);
      bush.scale.y = 0.8;
      bush.castShadow = true;
      g.add(bush);
    }

    // Клумбы
    const flowerColors = [0xe91e63, 0xffeb3b, 0xffffff, 0xff7043, 0x9c27b0];
    for (const [cx, cz] of [[-8, 8], [8, 8], [-4, 28], [4, 28]]) {
      const bed = new THREE.Group();
      bed.add(cyl(1.4, 1.4, 0.3, 0x795548, 0, 0.15, 0, 14));
      bed.add(cyl(1.2, 1.2, 0.32, 0x4e342e, 0, 0.16, 0, 14));
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * 1.0;
        const stem = cyl(0.015, 0.015, 0.4, 0x2e7d32, Math.cos(a) * rr, 0.5, Math.sin(a) * rr, 4);
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 6, 5),
          mat(flowerColors[Math.floor(Math.random() * flowerColors.length)])
        );
        flower.position.set(Math.cos(a) * rr, 0.75, Math.sin(a) * rr);
        bed.add(stem, flower);
      }
      bed.position.set(cx, 0, cz);
      g.add(bed);
    }

    this.add(g, 'decor-flora', 'Кусты и клумбы');
  }

  // ---------- Мусорки, велосипеды ----------

  private createTrashAndBikes(): void {
    const g = new THREE.Group();

    // Контейнерная площадка
    const yard = new THREE.Group();
    const colors = [0x2e7d32, 0x2e7d32, 0x1565c0, 0xf9a825];
    colors.forEach((c, i) => {
      const bin = new THREE.Group();
      bin.add(box(1.2, 1.1, 0.9, c, 0, 0.65, 0));
      const lid = box(1.25, 0.08, 0.95, 0x263238, 0, 1.24, 0);
      bin.add(lid);
      for (const wx of [-0.5, 0.5]) {
        const w = cyl(0.1, 0.1, 0.08, 0x111111, wx, 0.1, 0.4, 8);
        w.rotation.z = Math.PI / 2;
        bin.add(w);
      }
      bin.position.set(i * 1.5, 0, 0);
      yard.add(bin);
    });
    // Ограждение площадки
    yard.add(box(6.2, 1.6, 0.1, 0x9e9e9e, 2.25, 0.8, -0.8));
    yard.add(box(0.1, 1.6, 1.8, 0x9e9e9e, -0.8, 0.8, 0));
    yard.add(box(0.1, 1.6, 1.8, 0x9e9e9e, 5.3, 0.8, 0));
    yard.position.set(-40, 0, 28);
    yard.rotation.y = Math.PI / 2;
    g.add(yard);

    // Урны возле скамеек
    for (const x of [-30.8, -13.2, 8.8, 26.8, 36.8]) {
      const urn = cyl(0.25, 0.2, 0.7, 0x455a64, x + 1.2, 0.35, 5.2, 8);
      g.add(urn);
    }

    // Велопарковка
    const rack = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12, Math.PI), mat(0x607d8b));
      arc.position.set(i * 0.7, 0.05, 0);
      rack.add(arc);
    }
    // пара велосипедов
    for (const [bx, color] of [[0.35, 0xd32f2f], [1.75, 0x1976d2]] as const) {
      const bike = new THREE.Group();
      for (const wx of [-0.45, 0.45]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 14), mat(0x222222));
        wheel.position.set(wx, 0.35, 0);
        bike.add(wheel);
      }
      const frame = box(0.9, 0.05, 0.05, color, 0, 0.6, 0);
      frame.rotation.z = 0.15;
      bike.add(frame);
      bike.add(box(0.05, 0.4, 0.05, color, -0.05, 0.55, 0));
      bike.add(box(0.2, 0.04, 0.1, 0x212121, -0.2, 0.85, 0));
      bike.add(box(0.05, 0.05, 0.5, 0x212121, 0.45, 0.8, 0));
      bike.rotation.y = Math.PI / 2;
      bike.position.set(bx, 0, 0);
      rack.add(bike);
    }
    rack.position.set(10, 0, -3); // свободное место у южной стены забора
    g.add(rack);

    this.add(g, 'decor-trash-bikes', 'Мусорки и велопарковка');
  }

  // ---------- Столбы ЛЭП с проводами ----------

  private createPowerPoles(): void {
    const g = new THREE.Group();
    const xs = [-90, -60, -30, 0, 30, 60, 90];
    const z = 54;
    const top: THREE.Vector3[][] = [[], [], []];

    xs.forEach(x => {
      g.add(cyl(0.18, 0.25, 9, 0x6d4c41, x, 4.5, z, 8));
      g.add(box(0.15, 0.15, 3, 0x5d4037, x, 8.5, z));
      for (let i = 0; i < 3; i++) {
        top[i].push(new THREE.Vector3(x, 8.6, z - 1.2 + i * 1.2));
      }
    });

    top.forEach(points => {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const mid = a.clone().lerp(b, 0.5);
        mid.y -= 0.8;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12));
        g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x111111 })));
      }
    });

    this.add(g, 'decor-power-lines', 'ЛЭП');
  }

  // ---------- Деревья во дворе ----------

  private createYardTrees(): void {
    const g = new THREE.Group();

    const spots: [number, number, 'oak' | 'pine' | 'birch'][] = [
      [-36, 8, 'birch'], [-30, 34, 'oak'], [-14, 12, 'birch'], [14, 6, 'oak'],
      [34, 8, 'pine'], [38, 26, 'birch'], [-8, 34, 'pine'], [44, 34, 'oak'],
      [-44, 12, 'pine'], [8, 34, 'birch'], [-46, 48, 'oak'], [70, 10, 'pine'],
      [72, 50, 'oak'], [-100, 10, 'pine'], [-100, 55, 'birch'], [90, 70, 'oak'],
    ];

    spots.forEach(([x, z, kind]) => {
      const t = new THREE.Group();
      if (kind === 'pine') {
        const h = rand(6, 9);
        t.add(cyl(0.2, 0.3, h * 0.35, 0x5d4037, 0, h * 0.175, 0, 8));
        for (let i = 0; i < 4; i++) {
          const r = 2.2 - i * 0.45;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.3, 8), mat(new THREE.Color().setHSL(0.38, 0.5, 0.2 + Math.random() * 0.06).getHex()));
          cone.position.y = h * 0.3 + i * h * 0.17;
          cone.castShadow = true;
          t.add(cone);
        }
      } else if (kind === 'birch') {
        const h = rand(5, 7);
        t.add(cyl(0.14, 0.2, h, 0xf5f5f0, 0, h / 2, 0, 8));
        for (let i = 0; i < 5; i++) {
          t.add(box(0.2, 0.05, 0.02, 0x212121, 0.1, 0.5 + i * 1.0, 0.1, false));
        }
        for (const [cx, cy, cz, r] of [[0, h + 0.5, 0, 1.6], [0.9, h - 0.2, 0.3, 1.2], [-0.8, h, -0.4, 1.2]]) {
          const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(new THREE.Color().setHSL(0.25, 0.6, rand(0.4, 0.5)).getHex()));
          crown.position.set(cx, cy, cz);
          crown.castShadow = true;
          t.add(crown);
        }
      } else {
        const h = rand(3.5, 5);
        t.add(cyl(0.3, 0.45, h, 0x5d4037, 0, h / 2, 0, 8));
        for (const [cx, cy, cz, r] of [[0, h + 1.3, 0, 2.6], [1.5, h + 0.6, 0.5, 1.8], [-1.5, h + 0.8, -0.4, 1.9]]) {
          const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mat(new THREE.Color().setHSL(0.31, 0.6, rand(0.25, 0.34)).getHex()));
          crown.position.set(cx, cy, cz);
          crown.castShadow = true;
          t.add(crown);
        }
      }
      t.position.set(x, 0, z);
      t.rotation.y = Math.random() * Math.PI * 2;
      g.add(t);
    });

    this.add(g, 'decor-yard-trees', 'Деревья во дворе');
  }

  // ---------- Облака ----------

  private createClouds(): void {
    const g = new THREE.Group();
    const material = this.cloudMat;

    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const r = rand(6, 11);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material);
        puff.position.set((p - puffs / 2) * 9 + rand(-3, 3), rand(-2, 2), rand(-4, 4));
        puff.scale.y = 0.55;
        cloud.add(puff);
      }
      cloud.position.set(rand(-300, 300), rand(110, 150), rand(-250, 350));
      g.add(cloud);
      const speed = rand(1, 3);
      this.updaters.push((dt) => {
        cloud.position.x += speed * dt;
        if (cloud.position.x > 320) cloud.position.x = -320;
      });
    }

    this.add(g, 'decor-clouds', 'Облака');
  }

  // ---------- Бельё на верёвке ----------

  private createLaundryLine(): void {
    const g = new THREE.Group();
    const post = (x: number, z: number) => g.add(cyl(0.06, 0.06, 2.6, 0x757575, x, 1.3, z, 6));
    post(-4, 15); post(4, 15);
    const bar = cyl(0.02, 0.02, 8, 0xeeeeee, 0, 2.5, 15, 4);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);

    const cloth = [0xef5350, 0x42a5f5, 0xfff176, 0xffffff, 0x66bb6a, 0xff8a65];
    const pieces: THREE.Mesh[] = [];
    cloth.forEach((c, i) => {
      const p = box(0.7, 1, 0.03, c, -3.2 + i * 1.3, 1.95, 15, false);
      p.geometry.translate(0, -0.5, 0);
      p.position.y = 2.45;
      g.add(p);
      pieces.push(p);
    });
    this.updaters.push((_dt, t) => {
      pieces.forEach((p, i) => { p.rotation.x = Math.sin(t * 2 + i) * 0.12; });
    });

    this.add(g, 'decor-laundry', 'Бельё на верёвке');
  }
}
