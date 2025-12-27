import * as THREE from 'three';
import { CAMERA_SETTINGS } from '../utils/constants.js';

export interface CameraControllerInterface {
  update(deltaTime: number): void;
  dispose(): void;
  enableManualControl(): void;
  disableManualControl(): void;
  setAutoRotation(enabled: boolean): void;
  setTargetPosition(position: THREE.Vector3): void;
  getCamera(): THREE.Camera;
}

export class CameraController implements CameraControllerInterface {
  private camera: THREE.PerspectiveCamera;
  private isManualControl: boolean = false;
  private autoRotation: boolean = true;
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Настройки автоматического вращения
  private rotationSpeed: number = CAMERA_SETTINGS.ROTATION_SPEED;
  private radius: number = CAMERA_SETTINGS.RADIUS;
  private targetRadius: number = CAMERA_SETTINGS.RADIUS;
  private height: number = CAMERA_SETTINGS.HEIGHT;
  private rotationAngle: number = 0;
  
  // Настройки ручного управления
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private sensitivity: number = CAMERA_SETTINGS.SENSITIVITY;
  
  // Настройки touch-управления
  private touchSensitivity: number = CAMERA_SETTINGS.SENSITIVITY * 3; // Немного выше чувствительность для touch
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private isTouching: boolean = false;
  private initialPinchDistance: number = 0;
  private lastPinchDistance: number = 0;
  private isPinching: boolean = false;
  
  // Таймер для автоматического возврата к вращению
  private lastInteractionTime: number = 0;
  private autoReturnDelay: number = CAMERA_SETTINGS.AUTO_RETURN_DELAY;
  
  // Настройки плавного перехода
  private transitionSpeed: number = CAMERA_SETTINGS.TRANSITION_SPEED;
  private isTransitioning: boolean = false;
  private targetRotationAngle: number = 0;
  private currentRotationAngle: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Обработчики мыши для ручного управления
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Обработчик скролла для зума
    document.addEventListener('wheel', this.onWheel.bind(this));
    
    // Обработчики touch для мобильных устройств
    document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
    
    // Обработчики для предотвращения контекстного меню
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Левая кнопка мыши
      this.isMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.enableManualControl();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isMouseDown && this.isManualControl) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      // Обновляем углы вращения
      this.mouseX += deltaX * this.sensitivity;
      this.mouseY += deltaY * this.sensitivity;
      
      // Ограничиваем вертикальное вращение
      this.mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseY));
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.lastInteractionTime = Date.now();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    // Проверяем, находится ли курсор над dialogue-selector
    const dialogueSelector = document.getElementById('dialogue-selector');
    if (dialogueSelector) {
      const rect = dialogueSelector.getBoundingClientRect();
      const isOverSelector = 
        event.clientX >= rect.left && 
        event.clientX <= rect.right && 
        event.clientY >= rect.top && 
        event.clientY <= rect.bottom;
      
      // Если скролл происходит над селектором диалогов, не обрабатываем зум
      if (isOverSelector) {
        return;
      }
    }
    
    event.preventDefault();
    
    // Вычисляем изменение радиуса на основе направления скролла
    // Скролл вверх (deltaY < 0) - приближаем (уменьшаем радиус)
    // Скролл вниз (deltaY > 0) - отдаляем (увеличиваем радиус)
    const delta = event.deltaY > 0 ? CAMERA_SETTINGS.ZOOM_SENSITIVITY : -CAMERA_SETTINGS.ZOOM_SENSITIVITY;
    this.targetRadius = Math.max(
      CAMERA_SETTINGS.MIN_RADIUS,
      Math.min(CAMERA_SETTINGS.MAX_RADIUS, this.targetRadius + delta)
    );
    
    // Обновляем время последнего взаимодействия
    this.lastInteractionTime = Date.now();
  }

  private onTouchStart(event: TouchEvent): void {
    // Проверяем, находится ли касание над dialogue-selector
    const dialogueSelector = document.getElementById('dialogue-selector');
    if (dialogueSelector && event.touches.length > 0) {
      const rect = dialogueSelector.getBoundingClientRect();
      const touch = event.touches[0];
      const isOverSelector = 
        touch.clientX >= rect.left && 
        touch.clientX <= rect.right && 
        touch.clientY >= rect.top && 
        touch.clientY <= rect.bottom;
      
      // Если касание происходит над селектором диалогов, не обрабатываем управление камерой
      if (isOverSelector) {
        return;
      }
    }

    if (event.touches.length === 1) {
      // Одно касание - вращение камеры
      const touch = event.touches[0];
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.isTouching = true;
      this.enableManualControl();
    } else if (event.touches.length === 2) {
      // Два касания - pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.initialPinchDistance = this.getTouchDistance(touch1, touch2);
      this.lastPinchDistance = this.initialPinchDistance;
      this.isPinching = true;
      this.isTouching = false; // Отключаем вращение при pinch
      this.enableManualControl();
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isTouching && !this.isPinching) {
      // Вращение камеры одним пальцем
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.lastTouchX;
      const deltaY = touch.clientY - this.lastTouchY;
      
      // Обновляем углы вращения
      this.mouseX += deltaX * this.touchSensitivity;
      this.mouseY += deltaY * this.touchSensitivity;
      
      // Ограничиваем вертикальное вращение
      this.mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseY));
      
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.lastInteractionTime = Date.now();
      
      event.preventDefault();
    } else if (event.touches.length === 2 && this.isPinching) {
      // Приближение/отдаление двумя пальцами
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = this.getTouchDistance(touch1, touch2);
      
      // Вычисляем изменение расстояния
      const distanceDelta = currentDistance - this.lastPinchDistance;
      
      // Масштабируем изменение для плавного зума
      const zoomFactor = distanceDelta * 0.1; // Коэффициент для плавности
      this.targetRadius = Math.max(
        CAMERA_SETTINGS.MIN_RADIUS,
        Math.min(CAMERA_SETTINGS.MAX_RADIUS, this.targetRadius - zoomFactor)
      );
      
      this.lastPinchDistance = currentDistance;
      this.lastInteractionTime = Date.now();
      
      event.preventDefault();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      // Все касания завершены
      this.isTouching = false;
      this.isPinching = false;
      this.initialPinchDistance = 0;
      this.lastPinchDistance = 0;
    } else if (event.touches.length === 1 && this.isPinching) {
      // Переход от pinch к одному касанию
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
    this.isManualControl = false;
    this.autoRotation = true;
    this.isTransitioning = true;
    this.targetRotationAngle = this.rotationAngle;
  }

  public setAutoRotation(enabled: boolean): void {
    this.autoRotation = enabled;
  }

  public setTargetPosition(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
  }

  public update(deltaTime: number): void {
    const currentTime = Date.now();
    
    // Проверяем, нужно ли вернуться к автоматическому вращению
    // Учитываем как мышь, так и touch-события
    if (this.isManualControl && !this.isMouseDown && !this.isTouching && !this.isPinching &&
        currentTime - this.lastInteractionTime > this.autoReturnDelay) {
      this.disableManualControl();
    }
    
    // Плавное изменение радиуса для зума
    this.updateZoom(deltaTime);
    
    if (this.isManualControl) {
      // Ручное управление камерой
      this.updateManualCamera();
    } else if (this.autoRotation) {
      // Автоматическое вращение
      this.updateAutoRotation(deltaTime);
    }
    
    // Плавный переход между режимами
    if (this.isTransitioning) {
      this.updateTransition();
    }
  }

  private updateZoom(deltaTime: number): void {
    // Плавно изменяем радиус для зума
    const speed = CAMERA_SETTINGS.ZOOM_SPEED * deltaTime;
    this.radius += (this.targetRadius - this.radius) * speed;
  }

  private updateManualCamera(): void {
    // Вычисляем позицию камеры на основе углов мыши
    const x = Math.sin(this.mouseX) * Math.cos(this.mouseY) * this.radius;
    const y = Math.sin(this.mouseY) * this.radius + this.height;
    const z = Math.cos(this.mouseX) * Math.cos(this.mouseY) * this.radius;
    
    this.camera.position.set(x, y, z);
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
    // Плавно переходим от ручного управления к автоматическому вращению
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
    document.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('wheel', this.onWheel.bind(this));
    document.removeEventListener('touchstart', this.onTouchStart.bind(this));
    document.removeEventListener('touchmove', this.onTouchMove.bind(this));
    document.removeEventListener('touchend', this.onTouchEnd.bind(this));
    document.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
  }
}
