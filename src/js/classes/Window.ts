import * as THREE from 'three';

const DAY_COLOR = new THREE.Color(0x1a4d7a);
const DAY_EMISSIVE = new THREE.Color(0x0a1f33);
const NIGHT_DARK_COLOR = new THREE.Color(0x0b1624);
const NIGHT_LIT_COLOR = new THREE.Color(0xffd27a);
const NIGHT_LIT_EMISSIVE = new THREE.Color(0xffb34a);

/**
 * Окна используют два общих материала: «тёмные» и «светящиеся ночью».
 * Благодаря этому смена времени суток обновляет тысячи стёкол одной операцией.
 */
export class Window {
  private static darkMaterial = new THREE.MeshLambertMaterial({ color: DAY_COLOR, emissive: DAY_EMISSIVE });
  private static litMaterial = new THREE.MeshLambertMaterial({ color: DAY_COLOR, emissive: DAY_EMISSIVE });

  /** Доля окон, в которых вечером горит свет */
  private static readonly LIT_FRACTION = 0.4;

  /** nightFactor: 0 — день, 1 — глубокая ночь */
  public static setNightFactor(n: number): void {
    Window.darkMaterial.color.lerpColors(DAY_COLOR, NIGHT_DARK_COLOR, n);
    Window.darkMaterial.emissive.copy(DAY_EMISSIVE).multiplyScalar(1 - n);

    Window.litMaterial.color.lerpColors(DAY_COLOR, NIGHT_LIT_COLOR, n);
    Window.litMaterial.emissive.lerpColors(DAY_EMISSIVE, NIGHT_LIT_EMISSIVE, n);
  }

  /** Материал стекла для окон, не входящих в панельные дома (детский сад и т.д.) */
  public static getGlassMaterial(lit: boolean): THREE.MeshLambertMaterial {
    return lit ? Window.litMaterial : Window.darkMaterial;
  }

  static {
    Window.darkMaterial.userData.shared = true;
    Window.litMaterial.userData.shared = true;
  }

  private group: THREE.Group;

  constructor(panes: number = 2) {
    this.group = new THREE.Group();
    this.createWindow(panes);
  }

  private createWindow(panes: number): void {
    const totalWindowWidth = 1.5;
    const windowHeight = 2;
    const windowDepth = 0.3;
    const paneSpacing = 0.02;

    const paneWidth = (totalWindowWidth - (panes - 1) * paneSpacing) / panes;
    const startX = -(totalWindowWidth - paneWidth) / 2;
    const material = Math.random() < Window.LIT_FRACTION ? Window.litMaterial : Window.darkMaterial;

    for (let i = 0; i < panes; i++) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, windowHeight, windowDepth), material);
      pane.position.set(startX + i * (paneWidth + paneSpacing), 0, 0);
      this.group.add(pane);
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }
}
