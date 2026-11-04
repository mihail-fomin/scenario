import * as THREE from 'three';
import { CAMERA_SETTINGS, ASSET_DEBUG_CAMERA_SETTINGS } from '../utils/constants.js';

/**
 * Кадр, который задаёт режиссёр: точка съёмки в сферических координатах вокруг target.
 * yaw — направление «от цели к камере» в плоскости XZ: (sin yaw, cos yaw).
 */
export interface CameraShot {
  target: THREE.Vector3;
  yaw: number;
  pitch: number;
  radius: number;
  fov?: number;
  /** медленное вращение вокруг цели, рад/с */
  orbitSpeed?: number;
  /** жёсткость сглаживания (больше — быстрее), по умолчанию 3 */
  stiffness?: number;
}

export interface CameraControllerInterface {
  update(deltaTimeMs: number): void;
  dispose(): void;
  enableManualControl(): void;
  disableManualControl(): void;
  setAutoRotation(enabled: boolean): void;
  setTargetPosition(position: THREE.Vector3): void;
  setAssetDebugMode(enabled: boolean): void;
  focusOnTarget(position: THREE.Vector3, height?: number, radius?: number): void;
  setShot(shot: CameraShot | null): void;
  getTarget(): THREE.Vector3;
  isUserControlling(): boolean;
  getCamera(): THREE.Camera;
}

/** Шаг зума: во сколько раз меняется радиус при deltaY = 100 */
const ZOOM_STEP = 0.12;
const IDLE_ORBIT_SPEED = 0.12;
const IDLE_PITCH = 0.3;
const MIN_CAMERA_Y = 0.4;

const wrapAngle = (a: number): number => {
  const twoPi = Math.PI * 2;
  return a - twoPi * Math.round(a / twoPi);
};

/**
 * Камера «на пружинке»: пользователь и режиссёр меняют ЖЕЛАЕМОЕ состояние,
 * а реальное состояние догоняет его экспоненциальным сглаживанием, не зависящим от FPS.
 * Из-за этого зум и повороты не дёргаются, даже если кадры приходят неравномерно.
 */
export class CameraController implements CameraControllerInterface {
  private camera: THREE.PerspectiveCamera;
  private assetDebugMode = false;

  // Текущее (отображаемое) состояние
  private readonly curTarget = new THREE.Vector3(0, 1.2, 0);
  private curYaw = Math.PI / 4;
  private curPitch = IDLE_PITCH;
  private curRadius: number = CAMERA_SETTINGS.RADIUS;
  private curFov: number;

  // Желаемое состояние
  private readonly desTarget = new THREE.Vector3(0, 1.2, 0);
  private desYaw = Math.PI / 4;
  private desPitch = IDLE_PITCH;
  private desRadius: number = CAMERA_SETTINGS.RADIUS;
  private desFov: number;

  private shot: CameraShot | null = null;
  private orbitOffset = 0;
  private heightOffset = 0;
  private readonly baseFov: number;

  private minRadius: number = CAMERA_SETTINGS.MIN_RADIUS;
  private maxRadius: number = CAMERA_SETTINGS.MAX_RADIUS;
  private sensitivity: number = CAMERA_SETTINGS.SENSITIVITY;
  private panSpeed: number = ASSET_DEBUG_CAMERA_SETTINGS.PAN_SPEED;
  private keyPanSpeed: number = ASSET_DEBUG_CAMERA_SETTINGS.KEY_PAN_SPEED;
  private autoReturnDelay: number = CAMERA_SETTINGS.AUTO_RETURN_DELAY;

  private isMouseDown = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private isTouching = false;
  private isPinching = false;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lastPinchDistance = 0;
  private lastInteractionTime = -Infinity;
  /** true, пока пользователь управляет камерой сам (и ещё autoReturnDelay после) */
  private userActive = false;

  private keysPressed: Set<string> = new Set();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();

  private boundMouseDown = this.onMouseDown.bind(this);
  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);
  private boundWheel = this.onWheel.bind(this);
  private boundTouchStart = this.onTouchStart.bind(this);
  private boundTouchMove = this.onTouchMove.bind(this);
  private boundTouchEnd = this.onTouchEnd.bind(this);
  private boundKeyDown = this.onKeyDown.bind(this);
  private boundKeyUp = this.onKeyUp.bind(this);
  private boundContextMenu = (e: Event) => e.preventDefault();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.curFov = camera.fov;
    this.desFov = camera.fov;
    this.setupEventListeners();
    this.applyToCamera();
  }

  // ------------------------------------------------------------------ API

  public setShot(shot: CameraShot | null): void {
    this.shot = shot;
  }

  public getTarget(): THREE.Vector3 {
    return this.curTarget;
  }

  public isUserControlling(): boolean {
    return this.userActive;
  }

  public setAssetDebugMode(enabled: boolean): void {
    this.assetDebugMode = enabled;
    if (enabled) {
      const s = ASSET_DEBUG_CAMERA_SETTINGS;
      this.sensitivity = s.SENSITIVITY;
      this.minRadius = s.MIN_RADIUS;
      this.maxRadius = s.MAX_RADIUS;
      this.panSpeed = s.PAN_SPEED;
      this.keyPanSpeed = s.KEY_PAN_SPEED;
      this.heightOffset = s.HEIGHT;
      this.curRadius = this.desRadius = s.RADIUS;
      this.shot = null;
    } else {
      this.sensitivity = CAMERA_SETTINGS.SENSITIVITY;
      this.minRadius = CAMERA_SETTINGS.MIN_RADIUS;
      this.maxRadius = CAMERA_SETTINGS.MAX_RADIUS;
      this.heightOffset = 0;
    }
    this.applyToCamera();
  }

  public focusOnTarget(position: THREE.Vector3, height?: number, radius?: number): void {
    this.curTarget.copy(position);
    this.desTarget.copy(position);
    if (height !== undefined) this.heightOffset = height;
    if (radius !== undefined) {
      this.curRadius = this.desRadius = radius;
    }
    this.applyToCamera();
  }

  public setTargetPosition(position: THREE.Vector3): void {
    this.desTarget.copy(position);
  }

  public enableManualControl(): void {
    this.lastInteractionTime = performance.now();
  }

  public disableManualControl(): void {
    this.lastInteractionTime = -Infinity;
  }

  public setAutoRotation(_enabled: boolean): void {
    // автоповорот теперь часть idle-кадра; метод оставлен для совместимости интерфейса
  }

  // --------------------------------------------------------------- события

  private setupEventListeners(): void {
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    document.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('contextmenu', this.boundContextMenu);
  }

  /** Событие над интерфейсом (меню, панель времени, кнопки) камеру не трогает */
  private isOverUi(target: EventTarget | null, x: number, y: number): boolean {
    if (target instanceof HTMLElement && target.closest('#dialogue-selector, #time-panel, #burger-menu, button, input, select')) {
      return true;
    }
    const selector = document.getElementById('dialogue-selector');
    if (selector && !this.assetDebugMode) {
      const r = selector.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  }

  private touch(): void {
    this.lastInteractionTime = performance.now();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.assetDebugMode || this.isTypingInInput(event.target)) return;
    this.keysPressed.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.isOverUi(event.target, event.clientX, event.clientY)) return;
    if (event.button === 0) {
      this.isMouseDown = true;
      this.isPanning = this.assetDebugMode && event.shiftKey;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.touch();
    } else if (event.button === 2 && this.assetDebugMode) {
      this.isPanning = true;
      this.isMouseDown = false;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - this.lastMouseX;
    const dy = event.clientY - this.lastMouseY;

    if (this.isPanning && (this.isMouseDown || event.buttons === 2)) {
      this.panTarget(dx, dy);
    } else if (this.isMouseDown) {
      this.rotate(dx * this.sensitivity, dy * this.sensitivity);
      this.touch();
    } else {
      return;
    }
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
      this.isPanning = false;
      this.touch();
    }
    if (event.button === 2) this.isPanning = false;
  }

  private rotate(dYaw: number, dPitch: number): void {
    // как и раньше: движение мыши вправо увеличивает угол
    this.desYaw += dYaw;
    this.desPitch = THREE.MathUtils.clamp(this.desPitch + dPitch, -0.1, Math.PI / 2 - 0.05);
  }

  private panTarget(dx: number, dy: number): void {
    const scale = this.panSpeed * this.curRadius;
    this.tmpRight.setFromMatrixColumn(this.camera.matrix, 0);
    this.tmpUp.setFromMatrixColumn(this.camera.matrix, 1);
    this.desTarget.addScaledVector(this.tmpRight, -dx * scale);
    this.desTarget.addScaledVector(this.tmpUp, dy * scale);
  }

  private onWheel(event: WheelEvent): void {
    if (this.isOverUi(event.target, event.clientX, event.clientY)) return;
    event.preventDefault();

    // Нормализуем: разные мыши/тачпады дают очень разные deltaY и deltaMode
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 33;
    else if (event.deltaMode === 2) delta *= 400;
    delta = THREE.MathUtils.clamp(delta, -120, 120);

    this.desRadius = THREE.MathUtils.clamp(
      this.desRadius * Math.exp((delta / 100) * ZOOM_STEP),
      this.minRadius,
      this.maxRadius
    );
    this.touch();
  }

  private onTouchStart(event: TouchEvent): void {
    const t0 = event.touches[0];
    if (t0 && this.isOverUi(event.target, t0.clientX, t0.clientY)) return;

    if (event.touches.length === 1) {
      this.lastTouchX = t0.clientX;
      this.lastTouchY = t0.clientY;
      this.isTouching = true;
      this.isPinching = false;
    } else if (event.touches.length === 2) {
      this.lastPinchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      this.isPinching = true;
      this.isTouching = false;
    }
    this.touch();
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isTouching && !this.isPinching) {
      const t = event.touches[0];
      this.rotate((t.clientX - this.lastTouchX) * this.sensitivity * 3, (t.clientY - this.lastTouchY) * this.sensitivity * 3);
      this.lastTouchX = t.clientX;
      this.lastTouchY = t.clientY;
      this.touch();
      event.preventDefault();
    } else if (event.touches.length === 2 && this.isPinching) {
      const d = this.getTouchDistance(event.touches[0], event.touches[1]);
      if (d > 1 && this.lastPinchDistance > 1) {
        this.desRadius = THREE.MathUtils.clamp(
          this.desRadius * (this.lastPinchDistance / d),
          this.minRadius,
          this.maxRadius
        );
      }
      this.lastPinchDistance = d;
      this.touch();
      event.preventDefault();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isTouching = false;
      this.isPinching = false;
    } else if (event.touches.length === 1 && this.isPinching) {
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
      this.isPinching = false;
      this.isTouching = true;
    }
    this.touch();
  }

  private getTouchDistance(a: Touch, b: Touch): number {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  // ---------------------------------------------------------------- update

  /** @param deltaTimeMs время кадра в миллисекундах */
  public update(deltaTimeMs: number): void {
    // Ограничиваем dt: после паузы вкладки не должно быть «рывка»
    const dt = THREE.MathUtils.clamp(deltaTimeMs, 0, 50) / 1000;
    if (dt <= 0) return;

    const now = performance.now();
    const wasActive = this.userActive;
    this.userActive = this.assetDebugMode ||
      this.isMouseDown || this.isTouching || this.isPinching ||
      now - this.lastInteractionTime < this.autoReturnDelay;

    if (this.assetDebugMode) {
      this.updateKeyboardPan(dt);
    }

    let stiffness = 3;

    if (!this.assetDebugMode) {
      const s = this.shot;
      if (s) {
        // цель всегда следует за кадром (даже если пользователь вращает камеру)
        this.desTarget.copy(s.target);
        if (s.orbitSpeed) this.orbitOffset += s.orbitSpeed * dt;
        stiffness = s.stiffness ?? 3;

        if (!this.userActive) {
          this.desYaw = this.curYaw + wrapAngle(s.yaw + this.orbitOffset - this.curYaw);
          this.desPitch = s.pitch;
          this.desRadius = s.radius;
          this.desFov = s.fov ?? this.baseFov;
        }
      } else {
        // нет режиссёрского кадра — спокойный облёт вокруг сцены
        if (!this.userActive) {
          this.desYaw += IDLE_ORBIT_SPEED * dt;
          this.desPitch = IDLE_PITCH;
          this.desFov = this.baseFov;
          if (wasActive) this.desRadius = CAMERA_SETTINGS.RADIUS;
        }
      }
      if (this.userActive) stiffness = Math.max(stiffness, 9);
    } else {
      stiffness = 14;
    }

    // Экспоненциальное сглаживание — не зависит от частоты кадров
    const k = 1 - Math.exp(-stiffness * dt);
    const kFast = 1 - Math.exp(-Math.max(stiffness, 8) * dt);

    this.curTarget.lerp(this.desTarget, this.assetDebugMode ? kFast : k);
    this.curYaw += (this.desYaw - this.curYaw) * k;
    this.curPitch += (this.desPitch - this.curPitch) * k;
    this.curRadius += (this.desRadius - this.curRadius) * (this.userActive ? kFast : k);
    this.curFov += (this.desFov - this.curFov) * k;

    this.applyToCamera();
  }

  private applyToCamera(): void {
    const cp = Math.cos(this.curPitch);
    this.camera.position.set(
      this.curTarget.x + Math.sin(this.curYaw) * cp * this.curRadius,
      Math.max(MIN_CAMERA_Y, this.curTarget.y + Math.sin(this.curPitch) * this.curRadius + this.heightOffset),
      this.curTarget.z + Math.cos(this.curYaw) * cp * this.curRadius
    );
    this.camera.lookAt(this.curTarget);

    if (Math.abs(this.camera.fov - this.curFov) > 0.01) {
      this.camera.fov = this.curFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateKeyboardPan(dt: number): void {
    if (this.keysPressed.size === 0) return;
    const speed = this.keyPanSpeed * dt * 60;
    this.tmpRight.setFromMatrixColumn(this.camera.matrix, 0);

    this.tmpV.set(this.curTarget.x - this.camera.position.x, 0, this.curTarget.z - this.camera.position.z);
    if (this.tmpV.lengthSq() < 1e-4) this.tmpV.set(0, 0, 1);
    this.tmpV.normalize();

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) this.desTarget.addScaledVector(this.tmpV, speed);
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) this.desTarget.addScaledVector(this.tmpV, -speed);
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) this.desTarget.addScaledVector(this.tmpRight, -speed);
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) this.desTarget.addScaledVector(this.tmpRight, speed);
    if (this.keysPressed.has('KeyQ')) this.desTarget.y -= speed;
    if (this.keysPressed.has('KeyE')) this.desTarget.y += speed;
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }

  public dispose(): void {
    document.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('touchstart', this.boundTouchStart);
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
    document.removeEventListener('touchcancel', this.boundTouchEnd);
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('contextmenu', this.boundContextMenu);
  }
}
