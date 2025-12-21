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
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-5, 10, -4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    // Настройка области камеры теней для корректного отображения теней
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    
    this.scene.add(directionalLight);
  }
  
  private createEnvironment(): void {
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Создание бетонного забора
    this.createConcreteFence();
    
    // Создание детского сада
    this.createKindergarten();
    
    // Создание панельного дома (9 этажей, 7 подъездов)
    this.createPanelHouse(9, 7, { x: -45, z: 0 });
    
    // Создание панельного дома (5 этажей, 7 подъездов)
    this.createPanelHouse(5, 7, { x: 45, z: 0 });


    // Создание веранд между забором и детским садом
    this.createVerandas();
    
    // Создание труб возле забора
    this.createPipes();
    
    // Несколько деревьев по бокам для атмосферы
    this.createSideTrees();
  }

  private createConcreteFence(): void {
    const fenceGroup = new THREE.Group();
    
    // Основная часть забора - бетонные панели
    for (let i = 0; i < 30; i++) {
      const panelGeometry = new THREE.BoxGeometry(1.5, 1.242, 0.2);
      const panelMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 }); // Светло-серый бетон
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(i * 1.8 - 26.1, 0.621, -6);
      panel.castShadow = true;
      panel.receiveShadow = true;
      fenceGroup.add(panel);
    }
    
    // Верхняя часть забора - бетонная балка (увеличена ширина)
    const topBeamGeometry = new THREE.BoxGeometry(54.1, 0.3, 0.3);
    const topBeamMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 }); // Светло-серебристый
    const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
    topBeam.position.set(0, 1.3455, -5.9);
    topBeam.castShadow = true;
    fenceGroup.add(topBeam);
    
    // Опорные столбы (увеличено количество с 19 до 31)
    for (let i = 0; i < 31; i++) {
      const postGeometry = new THREE.BoxGeometry(0.3, 1.518, 0.3);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 }); // Светло-серебристый
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(i * 1.8 - 27, 0.759, -5.85);
      post.castShadow = true;
      fenceGroup.add(post);
    }
    
    this.scene.add(fenceGroup);
  }

  private createKindergarten(): void {
    const kindergartenGroup = new THREE.Group();
    
    // Основное здание (первый этаж) - увеличена высота с 4 до 5
    const groundFloorGeometry = new THREE.BoxGeometry(36, 5, 10);
    const groundFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFF0F5 }); // Почти белый с легким розовым оттенком
    const groundFloor = new THREE.Mesh(groundFloorGeometry, groundFloorMaterial);
    groundFloor.position.set(0, 2.5, -42);
    groundFloor.castShadow = true;
    groundFloor.receiveShadow = true;
    kindergartenGroup.add(groundFloor);
    
    // Второй этаж - увеличена высота с 4 до 5
    const secondFloorGeometry = new THREE.BoxGeometry(36, 5, 10);
    const secondFloorMaterial = new THREE.MeshLambertMaterial({ color: 0xFFF0F5 }); // Почти белый с легким розовым оттенком
    const secondFloor = new THREE.Mesh(secondFloorGeometry, secondFloorMaterial);
    secondFloor.position.set(0, 7.5, -42);
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

  private createPanelHouse(floors: number, entrances: number, position: { x: number, z: number } = { x: 0, z: 0 }): void {
    const houseGroup = new THREE.Group();

    // Параметры дома
    const floorHeight = 3; // Высота одного этажа
    const entranceWidth = 12; // Ширина одного подъезда
    const houseDepth = 12; // Глубина дома
    const totalHeight = floors * floorHeight;
    const totalWidth = entrances * entranceWidth;
    
    // Основная структура дома - панельные блоки
    const panelMaterial = new THREE.MeshLambertMaterial({ color: 0xE0E0E0 }); // Светло-серый цвет панелей
    
    // Создаем этажи (относительно центра группы)
    for (let floor = 0; floor < floors; floor++) {
      const floorY = floor * floorHeight + floorHeight / 2;
      
      // Основной блок этажа
      const floorGeometry = new THREE.BoxGeometry(totalWidth, floorHeight, houseDepth);
      const floorMesh = new THREE.Mesh(floorGeometry, panelMaterial);
      floorMesh.position.set(0, floorY, 0); // Центр группы
      floorMesh.castShadow = true;
      floorMesh.receiveShadow = true;
      houseGroup.add(floorMesh);
      
      // Окна на каждом этаже для каждого подъезда (передняя сторона)
      for (let entrance = 0; entrance < entrances; entrance++) {
        const entranceX = (entrance - (entrances - 1) / 2) * entranceWidth;
        
        // По 2 окна на подъезд (симметрично по бокам от центра подъезда)
        for (let windowIndex = 0; windowIndex < 2; windowIndex++) {
          const windowOffsetX = (windowIndex === 0 ? -2 : 2); // Увеличено расстояние между окнами
          const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.3);
          const windowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a4d7a, 
            emissive: 0x0a1f33 
          });
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            entranceX + windowOffsetX, 
            floorY, 
            -houseDepth / 2
          );
          houseGroup.add(window);
        }
      }
      
      // Окна на каждом этаже для каждого подъезда (задняя сторона)
      for (let entrance = 0; entrance < entrances; entrance++) {
        const entranceX = (entrance - (entrances - 1) / 2) * entranceWidth;
        
        // По 2 окна на подъезд (симметрично по бокам от центра подъезда)
        for (let windowIndex = 0; windowIndex < 2; windowIndex++) {
          const windowOffsetX = (windowIndex === 0 ? -2 : 2);
          const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.3);
          const windowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a4d7a, 
            emissive: 0x0a1f33 
          });
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            entranceX + windowOffsetX, 
            floorY, 
            houseDepth / 2
          );
          houseGroup.add(window);
        }
      }
    }
    
    // Подъезды с дверями и углублениями (только на первом этаже)
    for (let entrance = 0; entrance < entrances; entrance++) {
      const entranceX = (entrance - (entrances - 1) / 2) * entranceWidth;
      
      // Дверь подъезда
      const doorGeometry = new THREE.BoxGeometry(1.2, 2.2, 0.2);
      const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x4a2c1a }); // Темно-коричневая дверь
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.position.set(entranceX, 1.1, -houseDepth / 2 );
      door.castShadow = true;
      houseGroup.add(door);
      
      // Козырек над подъездом
      const canopyGeometry = new THREE.BoxGeometry(2, 0.3, 1.5);
      const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.set(entranceX, floorHeight + 0.15, -houseDepth / 2 + 0.75);
      canopy.castShadow = true;
      houseGroup.add(canopy);
    }
    
    // Балконы на каждом этаже (кроме первого) - передняя сторона
    for (let floor = 1; floor < floors; floor++) {
      const floorY = floor * floorHeight;
      
      for (let entrance = 0; entrance < entrances; entrance++) {
        const entranceX = (entrance - (entrances - 1) / 2) * entranceWidth;
        
        // Платформа балкона
        const balconyPlatformGeometry = new THREE.BoxGeometry(1.8, 0.2, 1.2);
        const balconyPlatformMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
        const balconyPlatform = new THREE.Mesh(balconyPlatformGeometry, balconyPlatformMaterial);
        balconyPlatform.position.set(entranceX, floorY, -houseDepth / 2 - 0.6);
        balconyPlatform.castShadow = true;
        balconyPlatform.receiveShadow = true;
        houseGroup.add(balconyPlatform);
        
        // Ограждение балкона
        const railingGeometry = new THREE.BoxGeometry(1.8, 0.8, 0.1);
        const railingMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
        const railing = new THREE.Mesh(railingGeometry, railingMaterial);
        railing.position.set(entranceX, floorY + 0.5, -houseDepth / 2 - 1.15);
        railing.castShadow = true;
        houseGroup.add(railing);
      }
    }
    
    // Балконы на каждом этаже (кроме первого) - задняя сторона
    for (let floor = 1; floor < floors; floor++) {
      const floorY = floor * floorHeight;
      
      for (let entrance = 0; entrance < entrances; entrance++) {
        const entranceX = (entrance - (entrances - 1) / 2) * entranceWidth;
        
        // Платформа балкона
        const balconyPlatformGeometry = new THREE.BoxGeometry(1.8, 0.2, 1.2);
        const balconyPlatformMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
        const balconyPlatform = new THREE.Mesh(balconyPlatformGeometry, balconyPlatformMaterial);
        balconyPlatform.position.set(entranceX, floorY, houseDepth / 2 + 0.6);
        balconyPlatform.castShadow = true;
        balconyPlatform.receiveShadow = true;
        houseGroup.add(balconyPlatform);
        
        // Ограждение балкона
        const railingGeometry = new THREE.BoxGeometry(1.8, 0.8, 0.1);
        const railingMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
        const railing = new THREE.Mesh(railingGeometry, railingMaterial);
        railing.position.set(entranceX, floorY + 0.5, houseDepth / 2 + 1.15);
        railing.castShadow = true;
        houseGroup.add(railing);
      }
    }
    
    // Крыша
    const roofGeometry = new THREE.BoxGeometry(totalWidth + 1, 0.5, houseDepth + 1);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 }); // Темно-серый
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, totalHeight + 0.25, 0); // Центр группы
    roof.castShadow = true;
    roof.receiveShadow = true;
    houseGroup.add(roof);
    
    // Поворот дома на 90 градусов вокруг своей оси
    houseGroup.rotation.y = - Math.PI / 2;
    
    // Перемещение группы в нужное место после поворота
    houseGroup.position.set(position.x, 0, position.z);
    
    this.scene.add(houseGroup);
  }

  private createSingleVeranda(x: number, z: number): THREE.Group {
    const verandaGroup = new THREE.Group();
    
    // Крыша веранды - увеличена высота позиции
    const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 6.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Темно-коричневая крыша
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, 3.2, z);
    roof.castShadow = true;
    verandaGroup.add(roof);
    
    // Опорные столбы веранды - увеличена высота с 2.2 до 2.8
    for (let i = 0; i < 4; i++) {
      const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.8);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      const postX = (i % 2) * 7 + (x - 3.5);
      const postZ = Math.floor(i / 2) * 5.5 + (z - 2.75);
      post.position.set(postX, 1.4, postZ);
      post.castShadow = true;
      verandaGroup.add(post);
    }
    
    // Бетонные стены веранды (3 стены) - увеличена высота с 2 до 2.5
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 }); // Светло-серый бетон
    
    // Задняя стена
    const backWallGeometry = new THREE.BoxGeometry(8, 2.5, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(x, 1.25, z + 3);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    verandaGroup.add(backWall);
    
    // Левая стена
    const leftWallGeometry = new THREE.BoxGeometry(0.2, 2.5, 6);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(x - 4, 1.25, z);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    verandaGroup.add(leftWall);
    
    // Правая стена
    const rightWallGeometry = new THREE.BoxGeometry(0.2, 2.5, 6);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(x + 4, 1.25, z);
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

  private createSinglePipe(x: number, z: number): THREE.Mesh {
    const pipeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 16);
    const pipeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Коричневый цвет
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    pipe.position.set(x, 0.3, z); // На полу (y = 0.3 - радиус трубы)
    pipe.rotation.z = Math.PI / 2; // Горизонтально
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    return pipe;
  }

  private createPipes(): void {
    const pipe1 = this.createSinglePipe(0, -5);
    this.scene.add(pipe1);
    
    const pipe2 = this.createSinglePipe(0, -5.5);
    this.scene.add(pipe2);
  }

  private createSideTrees(): void {
    // Создаем деревья вдоль забора с обеих сторон
    const treePositions = [];
    
    // Левая сторона забора (отрицательные X координаты)
    for (let i = 0; i < 8; i++) {
      const x = -35 + (i * 4.5); // Распределяем деревья вдоль левой стороны с большим интервалом
      const z = -8 + (Math.random() - 0.5) * 2; // Небольшое случайное смещение по Z
      treePositions.push({ x, z, side: 'left' });
    }
    
    // Правая сторона забора (положительные X координаты)
    for (let i = 0; i < 8; i++) {
      const x = 35 - (i * 4.5); // Распределяем деревья вдоль правой стороны с большим интервалом
      const z = -8 + (Math.random() - 0.5) * 2; // Небольшое случайное смещение по Z
      treePositions.push({ x, z, side: 'right' });
    }
    
    // Создаем деревья в каждой позиции
    treePositions.forEach((pos) => {
      const treeGroup = new THREE.Group();
      
      // Случайные размеры для разнообразия
      const trunkHeight = 3 + Math.random() * 2; // Высота ствола от 3 до 5
      const trunkRadius = 0.2 + Math.random() * 0.2; // Радиус ствола от 0.2 до 0.4
      const crownRadius = 1.5 + Math.random() * 1; // Радиус кроны от 1.5 до 2.5
      
      // Ствол
      const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.1, 0.6, 0.3 + Math.random() * 0.2) // Разные оттенки коричневого
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = trunkHeight / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      // Крона
      const crownGeometry = new THREE.SphereGeometry(crownRadius, 8, 6);
      const crownMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.3) // Разные оттенки зеленого
      });
      const crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.y = trunkHeight + crownRadius * 0.7;
      crown.castShadow = true;
      treeGroup.add(crown);
      
      // Небольшое случайное вращение для естественности
      treeGroup.rotation.y = Math.random() * 0.2 - 0.1;
      
      // Размещаем дерево
      treeGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(treeGroup);
    });
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
