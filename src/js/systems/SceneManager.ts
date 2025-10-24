import * as THREE from 'three';
import { SceneManagerInterface, CharacterInterface } from '@/types/index';
import { CAMERA_SETTINGS } from '../utils/constants.js';

export class SceneManager implements SceneManagerInterface {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private characters: CharacterInterface[] = [];
  private nameLabels: THREE.Mesh[] = [];
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    // Создание сцены
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Небесно-голубой фон
    
    // Создание камеры
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);
    
    // Создание рендерера
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Добавление освещения
    this.setupLighting();
    
    // Создание окружения
    this.createEnvironment();
  }
  
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }
  
  private createEnvironment(): void {
    // Пол - увеличили размер для покрытия всей сцены
    const floorGeometry = new THREE.PlaneGeometry(50, 80); // Увеличили размер (было 30x30, стало 50x80)
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Создание бетонного забора
    this.createConcreteFence();
    
    // Создание детского сада
    this.createKindergarten();
    
    // Несколько деревьев по бокам для атмосферы
    this.createSideTrees();
  }

  private createConcreteFence(): void {
    const fenceGroup = new THREE.Group();
    
    // Основная часть забора - бетонные панели (сделаем длиннее и ниже)
    for (let i = 0; i < 12; i++) {
      const panelGeometry = new THREE.BoxGeometry(1.5, 1.8, 0.2); // Сделали ниже (было 2.5, стало 1.8)
      const panelMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 }); // Серый бетон
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(i * 1.8 - 9.9, 0.9, -6); // Сделали длиннее (было 8 панелей, стало 12)
      panel.castShadow = true;
      panel.receiveShadow = true;
      fenceGroup.add(panel);
    }
    
    // Верхняя часть забора - бетонная балка (сделали длиннее)
    const topBeamGeometry = new THREE.BoxGeometry(21.5, 0.3, 0.3); // Сделали длиннее (было 14.5, стало 21.5)
    const topBeamMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
    topBeam.position.set(0, 1.95, -5.9); // Опустили ниже (было 2.65, стало 1.95)
    topBeam.castShadow = true;
    fenceGroup.add(topBeam);
    
    // Опорные столбы (сделали длиннее и ниже)
    for (let i = 0; i < 13; i++) {
      const postGeometry = new THREE.BoxGeometry(0.3, 2.2, 0.3); // Сделали ниже (было 3, стало 2.2)
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(i * 1.8 - 10.8, 1.1, -5.85); // Сделали длиннее (было 9 столбов, стало 13)
      post.castShadow = true;
      fenceGroup.add(post);
    }
    
    this.scene.add(fenceGroup);
  }

  private createKindergarten(): void {
    const kindergartenGroup = new THREE.Group();
    
    // Основное здание (первый этаж) - увеличили ширину еще в 2 раза
    const groundFloorGeometry = new THREE.BoxGeometry(36, 4, 10); // Увеличили ширину в 2 раза (было 18, стало 36)
    const groundFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFE4B5 }); // Светло-бежевый
    const groundFloor = new THREE.Mesh(groundFloorGeometry, groundFloorMaterial);
    groundFloor.position.set(0, 2, -42); // Отодвинули на 30 метров дальше (было -12, стало -42)
    groundFloor.castShadow = true;
    groundFloor.receiveShadow = true;
    kindergartenGroup.add(groundFloor);
    
    // Второй этаж - увеличили ширину еще в 2 раза
    const secondFloorGeometry = new THREE.BoxGeometry(36, 4, 10); // Увеличили ширину в 2 раза (было 18, стало 36)
    const secondFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFF8DC }); // Кремовый
    const secondFloor = new THREE.Mesh(secondFloorGeometry, secondFloorMaterial);
    secondFloor.position.set(0, 6, -42); // Отодвинули на 30 метров дальше
    secondFloor.castShadow = true;
    secondFloor.receiveShadow = true;
    kindergartenGroup.add(secondFloor);
    
    
    // Окна первого этажа (передняя сторона) - добавили больше окон для очень широкого здания
    for (let i = 0; i < 11; i++) {
      const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB }); // Голубые окна
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 3.5 - 17.5, 2, -37.9); // Распределили окна по всей ширине здания
      kindergartenGroup.add(window);
    }
    
    // Окна второго этажа (передняя сторона) - добавили больше окон для очень широкого здания
    for (let i = 0; i < 11; i++) {
      const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 3.5 - 17.5, 6, -37.9); // Распределили окна по всей ширине здания
      kindergartenGroup.add(window);
    }
    
    // Окна первого этажа (задняя сторона) - добавили окна на заднюю сторону
    for (let i = 0; i < 11; i++) {
      const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 3.5 - 17.5, 2, -46.1); // Задняя сторона здания
      kindergartenGroup.add(window);
    }
    
    // Окна второго этажа (задняя сторона) - добавили окна на заднюю сторону
    for (let i = 0; i < 11; i++) {
      const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 3.5 - 17.5, 6, -46.1); // Задняя сторона здания
      kindergartenGroup.add(window);
    }
    
    // Дверь - отодвинули на 30 метров дальше
    const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.1);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(-12, 1.5, -37.9); // Переместили дверь в соответствии с новой шириной
    kindergartenGroup.add(door);
    
    // Детская площадка перед садиком - увеличили ширину еще в 2 раза
    const playgroundGeometry = new THREE.PlaneGeometry(24, 8); // Увеличили ширину в 2 раза (было 12, стало 24)
    const playgroundMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 });
    const playground = new THREE.Mesh(playgroundGeometry, playgroundMaterial);
    playground.rotation.x = -Math.PI / 2;
    playground.position.set(0, 0.01, -38); // Отодвинули на 30 метров дальше
    playground.receiveShadow = true;
    kindergartenGroup.add(playground);
    
    // Качели - отодвинули на 30 метров дальше
    const swingGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
    const swingMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const swing = new THREE.Mesh(swingGeometry, swingMaterial);
    swing.position.set(6, 1.5, -35); // Переместили в соответствии с новой шириной площадки
    swing.castShadow = true;
    kindergartenGroup.add(swing);
    
    // Горка - отодвинули на 30 метров дальше
    const slideGeometry = new THREE.BoxGeometry(1, 2, 1);
    const slideMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6347 });
    const slide = new THREE.Mesh(slideGeometry, slideMaterial);
    slide.position.set(-6, 1, -35); // Переместили в соответствии с новой шириной площадки
    slide.castShadow = true;
    kindergartenGroup.add(slide);
    
    this.scene.add(kindergartenGroup);
  }

  private createSideTrees(): void {
    // Несколько деревьев по бокам для атмосферы
    for (let i = 0; i < 4; i++) {
      const treeGroup = new THREE.Group();
      
      // Ствол
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      // Крона
      const crownGeometry = new THREE.SphereGeometry(2, 8, 6);
      const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.y = 5;
      crown.castShadow = true;
      treeGroup.add(crown);
      
      // Размещаем деревья по бокам
      treeGroup.position.set(
        i % 2 === 0 ? -15 : 15,
        0,
        -5 - (Math.floor(i / 2) * 5)
      );
      this.scene.add(treeGroup);
    }
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
    
    // Вращение камеры вокруг сцены
    const time = Date.now() * CAMERA_SETTINGS.ROTATION_SPEED;
    this.camera.position.x = Math.sin(time) * CAMERA_SETTINGS.RADIUS;
    this.camera.position.z = Math.cos(time) * CAMERA_SETTINGS.RADIUS;
    this.camera.position.y = CAMERA_SETTINGS.HEIGHT;
    this.camera.lookAt(0, 0, 0);
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
    // Очистка персонажей
    this.characters.forEach(character => {
      character.dispose();
    });
    
    // Очистка сцены
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    // Очистка рендерера
    this.renderer.dispose();
  }
}
