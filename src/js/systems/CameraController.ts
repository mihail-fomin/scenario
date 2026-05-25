import * as THREE from 'three';
import { CAMERA_SETTINGS, ASSET_DEBUG_CAMERA_SETTINGS } from '../utils/constants.js';

export interface CameraControllerInterface {
  update(deltaTime: number): void;
  dispose(): void;
  enableManualControl(): void;
  disableManualControl(): void;
  setAutoRotation(enabled: boolean): void;
  setTargetPosition(position: THREE.Vector3): void;
  setAssetDebugMode(enabled: boolean): void;
  focusOnTarget(position: THREE.Vector3, height?: number, radius?: number): void;
  getCamera(): THREE.Camera;
}

export class CameraController implements CameraControllerInterface {
  private camera: THREE.PerspectiveCamera;
  private isManualControl: boolean = false;
  private autoRotation: boolean = true;
  private assetDebugMode: boolean = false;
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  private rotationSpeed: number = CAMERA_SETTINGS.ROTATION_SPEED;
  private radius: number = CAMERA_SETTINGS.RADIUS;
  private targetRadius: number = CAMERA_SETTINGS.RADIUS;
  private height: number = CAMERA_SETTINGS.HEIGHT;
  private rotationAngle: number = 0;
  
  private mouseX: number = Math.PI / 4;
  private mouseY: number = 0.35;
  private isMouseDown: boolean = false;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private sensitivity: number = CAMERA_SETTINGS.SENSITIVITY;
  private panSpeed: number = ASSET_DEBUG_CAMERA_SETTINGS.PAN_SPEED;
  private keyPanSpeed: number = ASSET_DEBUG_CAMERA_SETTINGS.KEY_PAN_SPEED;
  
  private touchSensitivity: number = CAMERA_SETTINGS.SENSITIVITY * 3;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private isTouching: boolean = false;
  private initialPinchDistance: number = 0;
  private lastPinchDistance: number = 0;
  private isPinching: boolean = false;
  
  private lastInteractionTime: number = 0;
  private autoReturnDelay: number = CAMERA_SETTINGS.AUTO_RETURN_DELAY;
  
  private transitionSpeed: number = CAMERA_SETTINGS.TRANSITION_SPEED;
  private isTransitioning: boolean = false;
  private targetRotationAngle: number = 0;
  private currentRotationAngle: number = 0;

  private minRadius: number = CAMERA_SETTINGS.MIN_RADIUS;
  private maxRadius: number = CAMERA_SETTINGS.MAX_RADIUS;
  private zoomSensitivity: number = CAMERA_SETTINGS.ZOOM_SENSITIVITY;

  private keysPressed: Set<string> = new Set();
  private readonly panVector = new THREE.Vector3();
  private readonly panRight = new THREE.Vector3();
  private readonly panUp = new THREE.Vector3();

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundContextMenu = (e) => e.preventDefault();
    this.setupEventListeners();
  }

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

  public setAssetDebugMode(enabled: boolean): void {
    this.assetDebugMode = enabled;
    if (enabled) {
      const s = ASSET_DEBUG_CAMERA_SETTINGS;
      this.radius = s.RADIUS;
      this.targetRadius = s.RADIUS;
      this.height = s.HEIGHT;
      this.sensitivity = s.SENSITIVITY;
      this.minRadius = s.MIN_RADIUS;
      this.maxRadius = s.MAX_RADIUS;
      this.zoomSensitivity = s.ZOOM_SENSITIVITY;
      this.panSpeed = s.PAN_SPEED;
      this.keyPanSpeed = s.KEY_PAN_SPEED;
      this.autoRotation = false;
      this.isManualControl = true;
      this.isTransitioning = false;
      this.updateManualCamera();
    } else {
      const s = CAMERA_SETTINGS;
      this.radius = s.RADIUS;
      this.targetRadius = s.RADIUS;
      this.height = s.HEIGHT;
      this.sensitivity = s.SENSITIVITY;
      this.minRadius = s.MIN_RADIUS;
      this.maxRadius = s.MAX_RADIUS;
      this.zoomSensitivity = s.ZOOM_SENSITIVITY;
      this.isManualControl = false;
      this.autoRotation = true;
    }
  }

  public focusOnTarget(position: THREE.Vector3, height?: number, radius?: number): void {
    this.targetPosition.copy(position);
    if (height !== undefined) {
      this.height = height;
    }
    if (radius !== undefined) {
      this.radius = radius;
      this.targetRadius = radius;
    }
    if (this.assetDebugMode) {
      this.updateManualCamera();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.assetDebugMode) return;
    if (this.isTypingInInput(event.target)) return;
    this.keysPressed.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  }

  private updateKeyboardPan(deltaTime: number): void {
    if (!this.assetDebugMode || this.keysPressed.size === 0) return;

    const speed = this.keyPanSpeed * (deltaTime / 16);
    this.panRight.setFromMatrixColumn(this.camera.matrix, 0);
    this.panUp.set(0, 1, 0);

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) {
      this.targetPosition.addScaledVector(this.getForwardOnXZ(), speed);
    }
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) {
      this.targetPosition.addScaledVector(this.getForwardOnXZ(), -speed);
    }
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) {
      this.targetPosition.addScaledVector(this.panRight, -speed);
    }
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) {
      this.targetPosition.addScaledVector(this.panRight, speed);
    }
    if (this.keysPressed.has('KeyQ')) {
      this.targetPosition.y -= speed;
    }
    if (this.keysPressed.has('KeyE')) {
      this.targetPosition.y += speed;
    }
  }

  private getForwardOnXZ(): THREE.Vector3 {
    this.panVector.set(
      this.targetPosition.x - this.camera.position.x,
      0,
      this.targetPosition.z - this.camera.position.z
    );
    if (this.panVector.lengthSq() < 0.0001) {
      this.panVector.set(0, 0, 1);
    }
    return this.panVector.normalize();
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = true;
      this.isPanning = this.assetDebugMode && event.shiftKey;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      if (!this.assetDebugMode) {
        this.enableManualControl();
      }
    } else if (event.button === 2 && this.assetDebugMode) {
      this.isPanning = true;
      this.isMouseDown = false;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isPanning && (this.isMouseDown || event.buttons === 2)) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      this.panTarget(deltaX, deltaY);
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      return;
    }

    if (this.isMouseDown && (this.isManualControl || this.assetDebugMode)) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.mouseX += deltaX * this.sensitivity;
      this.mouseY += deltaY * this.sensitivity;
      this.mouseY = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.mouseY));
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.lastInteractionTime = Date.now();
    }
  }

  private panTarget(deltaX: number, deltaY: number): void {
    const scale = this.panSpeed * this.radius;
    this.panRight.setFromMatrixColumn(this.camera.matrix, 0);
    this.panUp.setFromMatrixColumn(this.camera.matrix, 1);
    this.targetPosition.addScaledVector(this.panRight, -deltaX * scale);
    this.targetPosition.addScaledVector(this.panUp, deltaY * scale);
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
      this.isPanning = false;
    }
    if (event.button === 2) {
      this.isPanning = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.assetDebugMode) {
      const dialogueSelector = document.getElementById('dialogue-selector');
      if (dialogueSelector) {
        const rect = dialogueSelector.getBoundingClientRect();
        const isOverSelector = 
          event.clientX >= rect.left && 
          event.clientX <= rect.right && 
          event.clientY >= rect.top && 
          event.clientY <= rect.bottom;
        if (isOverSelector) return;
      }
    }
    
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? this.zoomSensitivity : -this.zoomSensitivity;
    this.targetRadius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetRadius + delta)
    );
    
    this.lastInteractionTime = Date.now();
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.assetDebugMode) {
      const dialogueSelector = document.getElementById('dialogue-selector');
      if (dialogueSelector && event.touches.length > 0) {
        const rect = dialogueSelector.getBoundingClientRect();
        const touch = event.touches[0];
        const isOverSelector = 
          touch.clientX >= rect.left && 
          touch.clientX <= rect.right && 
          touch.clientY >= rect.top && 
          touch.clientY <= rect.bottom;
        if (isOverSelector) return;
      }
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.isTouching = true;
      if (!this.assetDebugMode) {
        this.enableManualControl();
      }
    } else if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.initialPinchDistance = this.getTouchDistance(touch1, touch2);
      this.lastPinchDistance = this.initialPinchDistance;
      this.isPinching = true;
      this.isTouching = false;
      if (!this.assetDebugMode) {
        this.enableManualControl();
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isTouching && !this.isPinching) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.lastTouchX;
      const deltaY = touch.clientY - this.lastTouchY;
      
      this.mouseX += deltaX * this.touchSensitivity;
      this.mouseY += deltaY * this.touchSensitivity;
      this.mouseY = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.mouseY));
      
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.lastInteractionTime = Date.now();
      event.preventDefault();
    } else if (event.touches.length === 2 && this.isPinching) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const distanceDelta = currentDistance - this.lastPinchDistance;
      const zoomFactor = distanceDelta * 0.1;
      this.targetRadius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, this.targetRadius - zoomFactor)
      );
      this.lastPinchDistance = currentDistance;
      this.lastInteractionTime = Date.now();
      event.preventDefault();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isTouching = false;
      this.isPinching = false;
      this.initialPinchDistance = 0;
      this.lastPinchDistance = 0;
    } else if (event.touches.length === 1 && this.isPinching) {
      const touch = event.touches[0];
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.isPinching = false;
      this.isTouching = true;
    }
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public enableManualControl(): void {
    this.isManualControl = true;
    this.autoRotation = false;
    this.lastInteractionTime = Date.now();
  }

  public disableManualControl(): void {
    if (this.assetDebugMode) return;
    this.isManualControl = false;
    this.autoRotation = true;
    this.isTransitioning = true;
    this.targetRotationAngle = this.rotationAngle;
  }

  public setAutoRotation(enabled: boolean): void {
    if (this.assetDebugMode) return;
    this.autoRotation = enabled;
  }

  public setTargetPosition(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
  }

  public update(deltaTime: number): void {
    if (!this.assetDebugMode) {
      const currentTime = Date.now();
      if (this.isManualControl && !this.isMouseDown && !this.isTouching && !this.isPinching &&
          currentTime - this.lastInteractionTime > this.autoReturnDelay) {
        this.disableManualControl();
      }
    }

    this.updateKeyboardPan(deltaTime);
    this.updateZoom(deltaTime);
    
    if (this.isManualControl || this.assetDebugMode) {
      this.updateManualCamera();
    } else if (this.autoRotation) {
      this.updateAutoRotation(deltaTime);
    }
    
    if (this.isTransitioning && !this.assetDebugMode) {
      this.updateTransition();
    }
  }

  private updateZoom(deltaTime: number): void {
    const speed = (this.assetDebugMode ? ASSET_DEBUG_CAMERA_SETTINGS : CAMERA_SETTINGS).ZOOM_SPEED * deltaTime;
    this.radius += (this.targetRadius - this.radius) * speed;
  }

  private updateManualCamera(): void {
    const offsetX = Math.sin(this.mouseX) * Math.cos(this.mouseY) * this.radius;
    const offsetY = Math.sin(this.mouseY) * this.radius + this.height;
    const offsetZ = Math.cos(this.mouseX) * Math.cos(this.mouseY) * this.radius;
    
    this.camera.position.set(
      this.targetPosition.x + offsetX,
      this.targetPosition.y + offsetY,
      this.targetPosition.z + offsetZ
    );
    this.camera.lookAt(this.targetPosition);
  }

  private updateAutoRotation(deltaTime: number): void {
    this.rotationAngle += this.rotationSpeed * deltaTime;
    
    const x = Math.sin(this.rotationAngle) * this.radius;
    const z = Math.cos(this.rotationAngle) * this.radius;
    const y = this.height;
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.targetPosition);
  }

  private updateTransition(): void {
    this.currentRotationAngle += (this.targetRotationAngle - this.currentRotationAngle) * this.transitionSpeed;
    
    if (Math.abs(this.currentRotationAngle - this.targetRotationAngle) < 0.01) {
      this.isTransitioning = false;
      this.rotationAngle = this.currentRotationAngle;
    }
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
