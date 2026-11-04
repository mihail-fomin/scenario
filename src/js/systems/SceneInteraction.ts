import * as THREE from 'three';

export interface Interactive {
  label: string;
  onClick?: () => void;
}

/**
 * Клик по объектам сцены: показывает подпись и запускает реакцию (userData.interactive.onClick).
 * Перетаскивание камеры кликом не считается.
 */
export class SceneInteraction {
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private toast: HTMLDivElement;
  private toastTimer = 0;

  private onDown = (e: PointerEvent): void => {
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();
  };

  private onUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (e.target !== this.dom) return;
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (moved > 6 || performance.now() - this.downTime > 400) return;
    this.pick(e.clientX, e.clientY);
  };

  constructor(
    private camera: THREE.Camera,
    private dom: HTMLCanvasElement,
    private scene: THREE.Scene
  ) {
    this.raycaster.far = 400;
    this.raycaster.params.Points = { threshold: 0 };

    this.toast = document.createElement('div');
    this.toast.id = 'scene-toast';
    document.body.appendChild(this.toast);

    document.addEventListener('pointerdown', this.onDown);
    document.addEventListener('pointerup', this.onUp);
  }

  private pick(clientX: number, clientY: number): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const info = o.userData.interactive as Interactive | undefined;
        if (info) {
          this.show(info.label);
          info.onClick?.();
          return;
        }
        o = o.parent;
      }
      // Первый «твёрдый» объект без подписи (дом, земля) перекрывает всё, что за ним
      if ((hit.object as THREE.Mesh).isMesh && !(hit.object as THREE.Sprite).isSprite) return;
    }
  }

  private show(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    this.toastTimer = 2.2;
  }

  public update(dtSec: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dtSec;
      if (this.toastTimer <= 0) this.toast.classList.remove('show');
    }
  }

  public dispose(): void {
    document.removeEventListener('pointerdown', this.onDown);
    document.removeEventListener('pointerup', this.onUp);
    this.toast.remove();
  }
}
