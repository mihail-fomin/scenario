import * as THREE from 'three';

export class Character {
    constructor(data, scene, camera) {
        this.name = data.name;
        this.color = data.color;
        this.position = data.position;
        this.isSpeaking = false;
        this.scene = scene;
        this.camera = camera;
        
        this.group = new THREE.Group();
        this.nameLabel = null;
        
        this.createCharacter();
        this.createNameLabel();
    }
    
    createCharacter() {
        // Тело (цилиндр)
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        this.group.add(body);
        
        // Голова (сфера)
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        this.group.add(head);
        
        // Глаза
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 1.85, 0.25);
        this.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 1.85, 0.25);
        this.group.add(rightEye);
        
        // Руки
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.6, 1.2, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        this.group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.6, 1.2, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        this.group.add(rightArm);
        
        // Ноги
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.4, 0);
        leftLeg.castShadow = true;
        this.group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.4, 0);
        rightLeg.castShadow = true;
        this.group.add(rightLeg);
        
        // Позиционирование персонажа
        this.group.position.set(this.position[0], this.position[1], this.position[2]);
        
        // Добавление в сцену
        this.scene.add(this.group);
    }
    
    createNameLabel() {
        // Создание canvas для текста
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Настройка стиля текста
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Добавляем рамку
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        context.fillStyle = 'white';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.name, canvas.width / 2, canvas.height / 2);
        
        // Создание текстуры из canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Создание материала
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            alphaTest: 0.1,
            opacity: 0.8
        });
        
        // Создание геометрии для метки
        const geometry = new THREE.PlaneGeometry(2, 0.5);
        this.nameLabel = new THREE.Mesh(geometry, material);
        
        // Позиционирование метки над персонажем
        this.nameLabel.position.set(this.position[0], this.position[1] + 2.5, this.position[2]);
        
        // Добавление в сцену
        this.scene.add(this.nameLabel);
    }
    
    startSpeaking() {
        this.isSpeaking = true;
        this.group.scale.set(1.1, 1.1, 1.1);
        this.nameLabel.scale.set(1.2, 1.2, 1.2);
        this.nameLabel.material.opacity = 1.0;
    }
    
    stopSpeaking() {
        this.isSpeaking = false;
        this.group.scale.set(1, 1, 1);
        this.nameLabel.scale.set(1, 1, 1);
        this.nameLabel.material.opacity = 0.8;
    }
    
    update(deltaTime) {
        if (this.isSpeaking) {
            // Легкое покачивание при разговоре
            this.group.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;
        } else {
            this.group.rotation.y = 0;
        }
        
        // Легкое дыхание
        const breatheScale = 1 + Math.sin(Date.now() * 0.002) * 0.02;
        if (!this.isSpeaking) {
            this.group.scale.y = breatheScale;
        }
        
        // Обновление метки с именем - всегда смотрит на камеру
        if (this.nameLabel) {
            this.nameLabel.lookAt(this.camera.position);
        }
    }
    
    dispose() {
        // Очистка ресурсов
        this.scene.remove(this.group);
        this.scene.remove(this.nameLabel);
        
        // Очистка геометрий и материалов
        this.group.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        if (this.nameLabel) {
            this.nameLabel.geometry.dispose();
            this.nameLabel.material.dispose();
        }
    }
}
