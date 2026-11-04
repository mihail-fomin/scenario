import * as THREE from 'three';
import { SceneManagerInterface, CharacterInterface, DebugAsset } from '@/types/index';
import { CameraController } from './CameraController.js';
import { Window } from '../classes/Window.js';
import { isAssetDebugMode, getAssetDebugIdFromUrl } from '../utils/assetDebug.js';
import { AssetDebugPanel } from '../ui/AssetDebugPanel.js';
import { SceneDecor } from './SceneDecor.js';
import { SceneBuildings } from './SceneBuildings.js';
import { TimeOfDay } from './TimeOfDay.js';
import { NpcSystem } from './NpcSystem.js';
import { SceneInteraction } from './SceneInteraction.js';
import { grassTexture, withRepeat, setMaxAnisotropy } from '../utils/textures.js';

export class SceneManager implements SceneManagerInterface {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private characters: CharacterInterface[] = [];
  private nameLabels: THREE.Mesh[] = [];
  private cameraController!: CameraController;
  private debugAssets: DebugAsset[] = [];
  private currentDebugAssetId: string = 'origin';
  private assetDebugPanel: AssetDebugPanel | null = null;
  private debugHelpers: THREE.Object3D[] = [];
  private assetDebugMode: boolean = false;
  private decor: SceneDecor | null = null;
  private npcs: NpcSystem | null = null;
  private interaction: SceneInteraction | null = null;
  private timeOfDay!: TimeOfDay;
  private sunLight!: THREE.DirectionalLight;
  private moonLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private stageLight!: THREE.PointLight;
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly shadowRight = new THREE.Vector3();
  private readonly shadowUp = new THREE.Vector3();
  private readonly shadowCenter = new THREE.Vector3();
  
  constructor() {
    this.assetDebugMode = isAssetDebugMode();
    this.init();
  }
  
  private init(): void {
    // Создание сцены
    this.scene = new THREE.Scene();
    // Фон и туман задаёт TimeOfDay (небесный купол)
    
    // Создание камеры
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.3, 2500);
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);
    
    // Создание рендерера
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    // Добавление освещения и системы времени суток
    this.setupLighting();
    this.timeOfDay = new TimeOfDay(this.scene, this.renderer, this.camera, this.sunLight, this.moonLight, this.hemiLight);

    // Создание окружения
    this.createEnvironment();

    // Инициализация контроллера камеры
    this.cameraController = new CameraController(this.camera);

    // Ночью окна, фонари и свет у персонажей включаются по состоянию времени суток
    this.timeOfDay.onChange((state) => {
      Window.setNightFactor(state.night);
      this.decor?.setNight(state.night);
      this.stageLight.intensity = state.night * 38;
    });

    this.interaction = new SceneInteraction(this.camera, this.renderer.domElement, this.scene);

    if (this.assetDebugMode) {
      this.setupAssetDebugMode();
    }
  }

  private setupAssetDebugMode(): void {
    this.debugAssets.unshift({
      id: 'origin',
      label: 'Новый ассет (0, 0, 0)',
      group: null,
      position: new THREE.Vector3(0, 0, 0),
      focusRadius: 20
    });

    const grid = new THREE.GridHelper(80, 80, 0x888888, 0x444444);
    const axes = new THREE.AxesHelper(15);
    this.scene.add(grid);
    this.scene.add(axes);
    this.debugHelpers.push(grid, axes);

    this.cameraController.setAssetDebugMode(true);

    const urlAssetId = getAssetDebugIdFromUrl();
    if (urlAssetId && this.debugAssets.some(a => a.id === urlAssetId)) {
      this.currentDebugAssetId = urlAssetId;
    }
    this.focusDebugAsset(this.currentDebugAssetId);

    this.assetDebugPanel = new AssetDebugPanel();
    this.assetDebugPanel.setAssets(this.debugAssets, this.currentDebugAssetId);
    this.assetDebugPanel.setOnAssetChange((id) => this.focusDebugAsset(id));

    document.addEventListener('keydown', this.onAssetDebugKeyDown.bind(this));
  }

  private onAssetDebugKeyDown(event: KeyboardEvent): void {
    if (!this.assetDebugMode) return;
    if (event.target instanceof HTMLElement) {
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    }

    const index = this.debugAssets.findIndex(a => a.id === this.currentDebugAssetId);
    if (event.code === 'BracketLeft' && index > 0) {
      this.focusDebugAsset(this.debugAssets[index - 1].id);
    } else if (event.code === 'BracketRight' && index < this.debugAssets.length - 1) {
      this.focusDebugAsset(this.debugAssets[index + 1].id);
    }
  }

  private registerDebugAsset(
    id: string,
    label: string,
    group: THREE.Group | null,
    position?: THREE.Vector3,
    focusHeight?: number,
    focusRadius?: number
  ): void {
    const worldPos = position ?? (group ? this.getGroupCenter(group) : new THREE.Vector3());
    const radius = focusRadius ?? (group ? this.getGroupFocusRadius(group) : 20);

    this.debugAssets.push({
      id,
      label,
      group,
      position: worldPos,
      focusHeight,
      focusRadius: radius
    });
  }

  private getGroupCenter(group: THREE.Group): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  private getGroupFocusRadius(group: THREE.Group): number {
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.y, size.z) * 1.2 + 5;
  }

  public focusDebugAsset(assetId: string): void {
    const asset = this.debugAssets.find(a => a.id === assetId);
    if (!asset) return;

    this.currentDebugAssetId = assetId;
    const height = asset.focusHeight ?? Math.max(asset.position.y * 0.3 + 8, 8);
    const radius = asset.focusRadius ?? 25;

    this.cameraController.focusOnTarget(asset.position, height, radius);
    this.assetDebugPanel?.setCurrentAsset(assetId);
  }

  public isAssetDebugMode(): boolean {
    return this.assetDebugMode;
  }
  
  private setupLighting(): void {
    // Мягкая подсветка «небо/земля» — тени не чёрные, как было с одним ambient
    this.hemiLight = new THREE.HemisphereLight(0xbcd4ff, 0x6a6a50, 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    // Область теней следует за камерой (см. update), поэтому она небольшая и чёткая
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45;
    sc.near = 1; sc.far = 220;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.05;
    this.scene.add(this.sunLight, this.sunLight.target);

    this.moonLight = new THREE.DirectionalLight(0x9db6ff, 0.4);
    this.scene.add(this.moonLight, this.moonLight.target);

    // Тёплый свет фонаря рядом с действием — включается ночью
    this.stageLight = new THREE.PointLight(0xffd9a0, 0, 32, 2);
    this.scene.add(this.stageLight);
  }

  private createEnvironment(): void {
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, map: withRepeat(grassTexture(), 1250, 1250) });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Застройка: забор, детский сад, магазин, дома, веранды, трубы, деревья
    new SceneBuildings(this.scene, this.assetDebugMode
      ? (id, label, group) => this.registerDebugAsset(id, label, group)
      : undefined
    ).buildAll();

    // Наполнение двора: дорога, площадки, машины, гаражи и т.д.
    this.decor = new SceneDecor(this.scene, (id, label, group) => {
      if (this.assetDebugMode) this.registerDebugAsset(id, label, group);
    });

    // Жители двора: бабушки, дети, прохожие
    this.npcs = new NpcSystem(this.scene, this.camera);
  }

  public addCharacter(character: CharacterInterface): void {
    this.characters.push(character);
    if (character.nameLabel) {
      this.nameLabels.push(character.nameLabel);
    }
  }
  
  public update(deltaTime: number): void {
    // Обновление персонажей
    this.characters.forEach(character => {
      character.update(deltaTime);
    });
    
    // Обновление контроллера камеры
    this.cameraController.update(deltaTime);

    const dtSec = Math.min(deltaTime, 100) / 1000;
    this.timeOfDay.update(dtSec);

    // Анимация декора (машины, качели, облака) и статистов
    this.decor?.update(deltaTime);
    this.npcs?.update(deltaTime);
    this.interaction?.update(dtSec);

    // Солнце, луна и ночной свет следуют за точкой интереса, чтобы тени оставались чёткими
    const focus = this.cameraController.getTarget();
    // Привязываем центр теней к сетке текселей В ПРОСТРАНСТВЕ СВЕТА — иначе края теней «ползут» при движении камеры
    const sunDir = this.timeOfDay.sunDir;
    const texel = (this.sunLight.shadow.camera.right - this.sunLight.shadow.camera.left) / this.sunLight.shadow.mapSize.x;
    this.shadowRight.crossVectors(this.worldUp, sunDir).normalize();
    this.shadowUp.crossVectors(sunDir, this.shadowRight);
    const sx = Math.round((focus.x * this.shadowRight.x + focus.z * this.shadowRight.z) / texel) * texel;
    const sy = Math.round((focus.x * this.shadowUp.x + focus.z * this.shadowUp.z) / texel) * texel;
    const sd = focus.x * sunDir.x + focus.z * sunDir.z;
    this.shadowCenter.set(0, 0, 0)
      .addScaledVector(this.shadowRight, sx)
      .addScaledVector(this.shadowUp, sy)
      .addScaledVector(sunDir, sd);
    const fx = this.shadowCenter.x;
    const fz = this.shadowCenter.z;
    this.sunLight.target.position.copy(this.shadowCenter);
    this.sunLight.position.copy(this.shadowCenter).addScaledVector(sunDir, 90);
    this.moonLight.target.position.set(fx, 0, fz);
    this.moonLight.position.set(fx, 0, fz).addScaledVector(this.timeOfDay.moonDir, 90);
    this.stageLight.position.set(focus.x, 4.5, focus.z);
  }
  
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  public onWindowResize(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  public getCameraController(): CameraController {
    return this.cameraController;
  }

  public getTimeOfDay(): TimeOfDay {
    return this.timeOfDay;
  }

  public getInteraction(): SceneInteraction | null {
    return this.interaction;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.Camera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public getCharacters(): CharacterInterface[] {
    return this.characters;
  }
  
  public dispose(): void {
    this.assetDebugPanel?.dispose();
    this.interaction?.dispose();
    this.npcs?.dispose();

    // Очистка персонажей
    this.characters.forEach(character => {
      character.dispose();
    });
    
    // Очистка контроллера камеры
    this.cameraController.dispose();
    
    // Очистка сцены
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        // Общие материалы (окна) живут дольше сцены и пересоздаваться не должны
        materials.forEach(material => { if (material && !material.userData.shared) material.dispose(); });
      }
    });
    
    // Очистка рендерера
    this.renderer.dispose();
  }
}
