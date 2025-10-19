import { Character } from './classes/Character.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { TextToSpeech } from './systems/TextToSpeech.js';
import { SceneManager } from './systems/SceneManager.js';
import { UIManager } from './ui/UIManager.js';
import { CHARACTER_DATA } from './utils/constants.js';

export class App {
    constructor() {
        this.sceneManager = new SceneManager();
        this.uiManager = new UIManager();
        this.tts = new TextToSpeech();
        this.characters = [];
        this.dialogueSystem = null;
        this.isRunning = false;
        this.lastTime = 0;
        
        this.init();
    }
    
    init() {
        this.createCharacters();
        this.setupDialogueSystem();
        this.setupUI();
        this.setupEventListeners();
        this.start();
    }
    
    createCharacters() {
        CHARACTER_DATA.forEach(data => {
            const character = new Character(data, this.sceneManager.getScene(), this.sceneManager.getCamera());
            this.characters.push(character);
            this.sceneManager.addCharacter(character);
        });
    }
    
    setupDialogueSystem() {
        this.dialogueSystem = new DialogueSystem(this.characters, (dialogue, character) => {
            this.onDialogueChange(dialogue, character);
        });
    }
    
    setupUI() {
        this.uiManager.setCallbacks({
            onStart: () => this.startDialogue(),
            onPause: () => this.pauseDialogue(),
            onNext: () => this.nextDialogue()
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });
    }
    
    onDialogueChange(dialogue, character) {
        // Обновление UI
        this.uiManager.updateSpeakerInfo(character.name, 'Говорит...');
        this.uiManager.showSubtitles(dialogue.text);
        
        // Воспроизведение речи
        this.tts.speak(
            dialogue.text,
            () => {
                console.log('Начало речи персонажа:', character.name);
            },
            () => {
                console.log('Конец речи персонажа:', character.name);
                // Автоматический переход к следующей реплике через 500мс
                setTimeout(() => {
                    if (this.dialogueSystem.getIsPlaying() && !this.dialogueSystem.getIsPaused()) {
                        this.nextDialogue();
                    }
                }, 500);
            },
            (error) => {
                console.error('Ошибка TTS:', error);
                this.uiManager.showError('Ошибка воспроизведения речи');
            }
        );
    }
    
    startDialogue() {
        this.dialogueSystem.start();
        this.uiManager.setPlayingState(true, false);
    }
    
    pauseDialogue() {
        this.dialogueSystem.pause();
        const isPaused = this.dialogueSystem.getIsPaused();
        this.uiManager.setPlayingState(true, isPaused);
        
        if (isPaused) {
            this.tts.pause();
        } else {
            this.tts.resume();
        }
    }
    
    nextDialogue() {
        this.dialogueSystem.next();
        
        if (!this.dialogueSystem.getIsPlaying()) {
            this.endDialogue();
        } else {
            const progress = this.dialogueSystem.getProgress();
            this.uiManager.showProgress(progress.current, progress.total);
        }
    }
    
    endDialogue() {
        this.tts.stop();
        this.uiManager.setReadyState();
        this.uiManager.hideSubtitles();
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        this.tts.stop();
        this.dialogueSystem.end();
    }
    
    animate(currentTime = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Обновление сцены
        this.sceneManager.update(deltaTime);
        
        // Рендеринг
        this.sceneManager.render();
        
        // Продолжение анимации
        requestAnimationFrame((time) => this.animate(time));
    }
    
    dispose() {
        this.stop();
        this.sceneManager.dispose();
    }
}
