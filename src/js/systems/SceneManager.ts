import * as THREE from 'three';
import { SceneManagerInterface, CharacterInterface } from '@/types/index';
import { CameraController } from './CameraController.js';

export class SceneManager implements SceneManagerInterface {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private characters: CharacterInterface[] = [];
  private nameLabels: THREE.Mesh[] = [];
  private cameraController!: CameraController;
  
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
    
    // Инициализация контроллера камеры
    this.cameraController = new CameraController(this.camera);
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
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(50, 80);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Создание бетонного забора
    this.createConcreteFence();
    
    // Создание детского сада
    this.createKindergarten();
    
    // Создание веранд между забором и детским садом
    this.createVerandas();
    
    // Несколько деревьев по бокам для атмосферы
    this.createSideTrees();
  }

  private createConcreteFence(): void {
    const fenceGroup = new THREE.Group();
    
    // Основная часть забора - бетонные панели
    for (let i = 0; i < 18; i++) {
      const panelGeometry = new THREE.BoxGeometry(1.5, 1.242, 0.2);
      const panelMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 }); // Светло-серый бетон
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(i * 1.8 - 15.3, 0.621, -6);
      panel.castShadow = true;
      panel.receiveShadow = true;
      fenceGroup.add(panel);
    }
    
    // Верхняя часть забора - бетонная балка
    const topBeamGeometry = new THREE.BoxGeometry(32.3, 0.3, 0.3);
    const topBeamMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 }); // Светло-серебристый
    const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
    topBeam.position.set(0, 1.3455, -5.9);
    topBeam.castShadow = true;
    fenceGroup.add(topBeam);
    
    // Опорные столбы
    for (let i = 0; i < 19; i++) {
      const postGeometry = new THREE.BoxGeometry(0.3, 1.518, 0.3);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 }); // Светло-серебристый
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(i * 1.8 - 16.2, 0.759, -5.85);
      post.castShadow = true;
      fenceGroup.add(post);
    }
    
    this.scene.add(fenceGroup);
  }

  private createKindergarten(): void {
    const kindergartenGroup = new THREE.Group();
    
    // Основное здание (первый этаж)
    const groundFloorGeometry = new THREE.BoxGeometry(36, 4, 10);
    const groundFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFF0F5 }); // Почти белый с легким розовым оттенком
    const groundFloor = new THREE.Mesh(groundFloorGeometry, groundFloorMaterial);
    groundFloor.position.set(0, 2, -42);
    groundFloor.castShadow = true;
    groundFloor.receiveShadow = true;
    kindergartenGroup.add(groundFloor);
    
    // Второй этаж
    const secondFloorGeometry = new THREE.BoxGeometry(36, 4, 10);
    const secondFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFF0F5 }); // Почти белый с легким розовым оттенком
    const secondFloor = new THREE.Mesh(secondFloorGeometry, secondFloorMaterial);
    secondFloor.position.set(0, 6, -42);
    secondFloor.castShadow = true;
    secondFloor.receiveShadow = true;
    kindergartenGroup.add(secondFloor);
    
    
    // Окна первого этажа (передняя сторона)
    for (let i = 0; i < 6; i++) {
      const windowGeometry = new THREE.BoxGeometry(3, 2, 0.5);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x0066CC, emissive: 0x003366, depthTest: true, depthWrite: false }); // Ярко-синие окна с небольшим свечением
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 6.5 - 16.25, 2, -36.5);
      kindergartenGroup.add(window);
    }
    
    // Окна второго этажа (передняя сторона)
    for (let i = 0; i < 6; i++) {
      const windowGeometry = new THREE.BoxGeometry(3, 2, 0.5);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x0066CC, emissive: 0x003366, depthTest: true, depthWrite: false });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 6.5 - 16.25, 6, -36.5);
      kindergartenGroup.add(window);
    }
    
    // Дверь
    const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.1);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(-12, 1.5, -37.9);
    kindergartenGroup.add(door);

    this.scene.add(kindergartenGroup);
  }

  private createSingleVeranda(x: number, z: number): THREE.Group {
    const verandaGroup = new THREE.Group();
    
    // Крыша веранды
    const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 6.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Темно-коричневая крыша
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, 2.5, z);
    roof.castShadow = true;
    verandaGroup.add(roof);
    
    // Опорные столбы веранды
    for (let i = 0; i < 4; i++) {
      const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.2);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      const postX = (i % 2) * 7 + (x - 3.5);
      const postZ = Math.floor(i / 2) * 5.5 + (z - 2.75);
      post.position.set(postX, 1.1, postZ);
      post.castShadow = true;
      verandaGroup.add(post);
    }
    
    // Бетонные стены веранды (3 стены)
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 }); // Светло-серый бетон
    
    // Задняя стена
    const backWallGeometry = new THREE.BoxGeometry(8, 2, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(x, 1, z + 3);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    verandaGroup.add(backWall);
    
    // Левая стена
    const leftWallGeometry = new THREE.BoxGeometry(0.2, 2, 6);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(x - 4, 1, z);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    verandaGroup.add(leftWall);
    
    // Правая стена
    const rightWallGeometry = new THREE.BoxGeometry(0.2, 2, 6);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(x + 4, 1, z);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    verandaGroup.add(rightWall);
    
    return verandaGroup;
  }

  private createVerandas(): void {
    // Первая веранда (ближе к забору)
    const veranda1 = this.createSingleVeranda(-7, -15);
    this.scene.add(veranda1);
    
    // Вторая веранда (ближе к детскому саду)
    const veranda2 = this.createSingleVeranda(10, -15);
    this.scene.add(veranda2);
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
    
    // Обновление контроллера камеры
    this.cameraController.update(deltaTime);
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
    
    // Очистка контроллера камеры
    this.cameraController.dispose();
    
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
