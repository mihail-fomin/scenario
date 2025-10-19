import * as THREE from 'three';

// Сцена и основные объекты
let scene, camera, renderer, characters = [];
let currentDialogueIndex = 0;
let isPlaying = false;
let isPaused = false;
let isSpeaking = false;
let speechTimeout = null;
let nameLabels = [];

// Элементы UI
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const nextBtn = document.getElementById('nextBtn');
const subtitles = document.getElementById('subtitles');
const currentSpeaker = document.getElementById('currentSpeaker');
const currentStatus = document.getElementById('currentStatus');

// Диалоги между персонажами
const dialogues = [
    {
        speaker: 'Алекс',
        text: 'Привет, ребята! Как дела?',
        position: 0
    },
    {
        speaker: 'Мария',
        text: 'Привет, Алекс! У меня всё отлично, спасибо!',
        position: 1
    },
    {
        speaker: 'Дмитрий',
        text: 'А у меня сегодня был тяжелый день на работе.',
        position: 2
    },
    {
        speaker: 'Алекс',
        text: 'Понимаю, Дмитрий. Расскажи, что случилось?',
        position: 0
    },
    {
        speaker: 'Дмитрий',
        text: 'Проект срывается, начальство недовольно. Очень стрессово.',
        position: 2
    },
    {
        speaker: 'Мария',
        text: 'Не переживай! Всё наладится. Может, стоит взять выходной?',
        position: 1
    },
    {
        speaker: 'Алекс',
        text: 'Согласен с Марией. Отдых поможет взглянуть на ситуацию свежим взглядом.',
        position: 0
    },
    {
        speaker: 'Дмитрий',
        text: 'Спасибо за поддержку, друзья. Вы правы, нужно отдохнуть.',
        position: 2
    },
    {
        speaker: 'Мария',
        text: 'Отлично! Тогда завтра идем в парк?',
        position: 1
    },
    {
        speaker: 'Алекс',
        text: 'Отличная идея! Я за!',
        position: 0
    },
    {
        speaker: 'Дмитрий',
        text: 'И я! Спасибо, что поддержали меня.',
        position: 2
    }
];

// Имена персонажей и их цвета
const characterData = [
    { name: 'Алекс', color: 0x4CAF50, position: [-3, 0, 0] },
    { name: 'Мария', color: 0x2196F3, position: [0, 0, 0] },
    { name: 'Дмитрий', color: 0xFF9800, position: [3, 0, 0] }
];

// Инициализация сцены
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Небесно-голубой фон
    
    // Создание камеры
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    
    // Создание рендерера
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Создание персонажей
    createCharacters();
    
    // Создание окружения
    createEnvironment();
    
    // Обработчики событий
    setupEventListeners();
    
    // Запуск анимации
    animate();
}

// Обновление подсветки имени персонажа
function updateNameLabelHighlight(character) {
    // Сброс всех меток к обычному виду
    characters.forEach(char => {
        if (char.nameLabel) {
            char.nameLabel.scale.set(1, 1, 1);
            char.nameLabel.material.opacity = 0.8;
        }
    });
    
    // Подсветка текущего говорящего
    if (character.nameLabel) {
        character.nameLabel.scale.set(1.2, 1.2, 1.2);
        character.nameLabel.material.opacity = 1.0;
    }
}

// Создание текстовой метки с именем персонажа
function createNameLabel(name, position) {
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
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
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
    const label = new THREE.Mesh(geometry, material);
    
    // Позиционирование метки над персонажем
    label.position.set(position[0], position[1] + 2.5, position[2]);
    
    return label;
}

// Создание персонажей
function createCharacters() {
    characterData.forEach((data, index) => {
        // Создание группы для персонажа
        const characterGroup = new THREE.Group();
        
        // Тело (цилиндр)
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: data.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        characterGroup.add(body);
        
        // Голова (сфера)
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        characterGroup.add(head);
        
        // Глаза
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 1.85, 0.25);
        characterGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 1.85, 0.25);
        characterGroup.add(rightEye);
        
        // Руки
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.6, 1.2, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        characterGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.6, 1.2, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        characterGroup.add(rightArm);
        
        // Ноги
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.4, 0);
        leftLeg.castShadow = true;
        characterGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.4, 0);
        rightLeg.castShadow = true;
        characterGroup.add(rightLeg);
        
        // Позиционирование персонажа
        characterGroup.position.set(data.position[0], data.position[1], data.position[2]);
        
        // Создание метки с именем
        const nameLabel = createNameLabel(data.name, data.position);
        scene.add(nameLabel);
        nameLabels.push(nameLabel);
        
        // Добавление в сцену
        scene.add(characterGroup);
        
        // Сохранение данных персонажа
        characters.push({
            group: characterGroup,
            name: data.name,
            color: data.color,
            isSpeaking: false,
            nameLabel: nameLabel
        });
    });
}

// Создание окружения
function createEnvironment() {
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
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
        scene.add(treeGroup);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    startBtn.addEventListener('click', startDialogue);
    pauseBtn.addEventListener('click', pauseDialogue);
    nextBtn.addEventListener('click', nextDialogue);
    
    window.addEventListener('resize', onWindowResize);
}

// Начало диалога
function startDialogue() {
    currentDialogueIndex = 0;
    isPlaying = true;
    isPaused = false;
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    nextBtn.disabled = false;
    
    playCurrentDialogue();
}

// Пауза диалога
function pauseDialogue() {
    if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = 'Пауза';
        playCurrentDialogue();
    } else {
        isPaused = true;
        pauseBtn.textContent = 'Продолжить';
        stopSpeaking();
    }
}

// Следующая реплика
function nextDialogue() {
    if (currentDialogueIndex < dialogues.length - 1) {
        currentDialogueIndex++;
        playCurrentDialogue();
    } else {
        endDialogue();
    }
}

// Воспроизведение текущего диалога
function playCurrentDialogue() {
    if (isPaused) return;
    
    const dialogue = dialogues[currentDialogueIndex];
    const character = characters[dialogue.position];
    
    // Очистка предыдущего таймера
    if (speechTimeout) {
        clearTimeout(speechTimeout);
        speechTimeout = null;
    }
    
    // Остановка предыдущего говорящего
    characters.forEach(char => {
        char.isSpeaking = false;
        char.group.scale.set(1, 1, 1);
        if (char.nameLabel) {
            char.nameLabel.scale.set(1, 1, 1);
            char.nameLabel.material.opacity = 0.8;
        }
    });
    
    // Активация текущего говорящего
    character.isSpeaking = true;
    character.group.scale.set(1.1, 1.1, 1.1);
    
    // Подсветка имени говорящего персонажа
    updateNameLabelHighlight(character);
    
    // Обновление UI
    currentSpeaker.textContent = character.name;
    currentStatus.textContent = 'Говорит...';
    
    // Показ субтитров
    showSubtitles(dialogue.text);
    
    // Text-to-Speech
    speakText(dialogue.text);
    
    // Резервный таймер на случай, если TTS не сработает
    speechTimeout = setTimeout(() => {
        if (isPlaying && !isPaused && !isSpeaking) {
            nextDialogue();
        }
    }, 3000);
}

// Показ субтитров
function showSubtitles(text) {
    subtitles.textContent = text;
    subtitles.classList.add('show');
}

// Скрытие субтитров
function hideSubtitles() {
    subtitles.classList.remove('show');
}

// Text-to-Speech
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Остановка предыдущего воспроизведения
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
            console.log('Начало воспроизведения речи');
            isSpeaking = true;
            // Очищаем резервный таймер, так как TTS работает
            if (speechTimeout) {
                clearTimeout(speechTimeout);
                speechTimeout = null;
            }
        };
        
        utterance.onend = () => {
            console.log('Конец воспроизведения речи');
            isSpeaking = false;
            if (isPlaying && !isPaused) {
                // Автоматический переход к следующей реплике через 1.5 секунды после окончания речи
                setTimeout(() => {
                    nextDialogue();
                }, 500);
            }
        };
        
        utterance.onerror = (event) => {
            console.log('Ошибка воспроизведения речи:', event.error);
            isSpeaking = false;
            // Если TTS не работает, используем резервный таймер
            if (isPlaying && !isPaused) {
                speechTimeout = setTimeout(() => {
                    nextDialogue();
                }, 3000);
            }
        };
        
        speechSynthesis.speak(utterance);
    } else {
        console.log('Text-to-Speech не поддерживается');
        // Если TTS не поддерживается, используем резервный таймер
        if (isPlaying && !isPaused) {
            speechTimeout = setTimeout(() => {
                nextDialogue();
            }, 4000);
        }
    }
}

// Остановка речи
function stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    isSpeaking = false;
    if (speechTimeout) {
        clearTimeout(speechTimeout);
        speechTimeout = null;
    }
    hideSubtitles();
}

// Завершение диалога
function endDialogue() {
    isPlaying = false;
    isPaused = false;
    isSpeaking = false;
    
    // Очистка таймеров
    if (speechTimeout) {
        clearTimeout(speechTimeout);
        speechTimeout = null;
    }
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    nextBtn.disabled = true;
    pauseBtn.textContent = 'Пауза';
    
    // Сброс персонажей
    characters.forEach(char => {
        char.isSpeaking = false;
        char.group.scale.set(1, 1, 1);
        if (char.nameLabel) {
            char.nameLabel.scale.set(1, 1, 1);
            char.nameLabel.material.opacity = 0.8;
        }
    });
    
    currentSpeaker.textContent = 'Готов к диалогу';
    currentStatus.textContent = 'Нажмите "Начать диалог"';
    
    stopSpeaking();
}

// Обработка изменения размера окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    
    // Анимация персонажей
    characters.forEach((character, index) => {
        if (character.isSpeaking) {
            // Легкое покачивание при разговоре
            character.group.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;
        } else {
            character.group.rotation.y = 0;
        }
        
        // Легкое дыхание
        const breatheScale = 1 + Math.sin(Date.now() * 0.002 + index) * 0.02;
        if (!character.isSpeaking) {
            character.group.scale.y = breatheScale;
        }
    });
    
    // Обновление меток с именами - всегда смотрят на камеру
    nameLabels.forEach(label => {
        label.lookAt(camera.position);
    });
    
    // Вращение камеры вокруг сцены
    const time = Date.now() * 0.0005;
    camera.position.x = Math.sin(time) * 8;
    camera.position.z = Math.cos(time) * 8;
    camera.lookAt(0, 0, 0);
    
    renderer.render(scene, camera);
}

// Запуск приложения
init();
