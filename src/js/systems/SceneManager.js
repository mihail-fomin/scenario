import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.characters = [];
        this.nameLabels = [];
        
        this.init();
    }
    
    init() {
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
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    createEnvironment() {
        // Пол
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Деревья на заднем плане
        for (let i = 0; i < 5; i++) {
            const treeGroup = new THREE.Group();
            
            // Ствол
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1.5;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            // Крона
            const crownGeometry = new THREE.SphereGeometry(1.5, 8, 6);
            const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.y = 3.5;
            crown.castShadow = true;
            treeGroup.add(crown);
            
            treeGroup.position.set(
                (Math.random() - 0.5) * 30,
                0,
                -8 - Math.random() * 10
            );
            this.scene.add(treeGroup);
        }
    }
    
    addCharacter(character) {
        this.characters.push(character);
        this.nameLabels.push(character.nameLabel);
    }
    
    update(deltaTime) {
        // Обновление персонажей
        this.characters.forEach(character => {
            character.update(deltaTime);
        });
        
        // Вращение камеры вокруг сцены
        const time = Date.now() * 0.0005;
        this.camera.position.x = Math.sin(time) * 8;
        this.camera.position.z = Math.cos(time) * 8;
        this.camera.lookAt(0, 0, 0);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
    
    getRenderer() {
        return this.renderer;
    }
    
    getCharacters() {
        return this.characters;
    }
    
    dispose() {
        // Очистка персонажей
        this.characters.forEach(character => {
            character.dispose();
        });
        
        // Очистка сцены
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        // Очистка рендерера
        this.renderer.dispose();
    }
}
