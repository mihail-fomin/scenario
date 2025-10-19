import { Character } from './classes/Character.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { TextToSpeech } from './systems/TextToSpeech.js';
import { SceneManager } from './systems/SceneManager.js';
import { UIManager } from './ui/UIManager.js';
import { CHARACTER_DATA } from './utils/constants.js';
import { Dialogue, CharacterInterface, DialogueSystemInterface, TTSInterface, SceneManagerInterface, UIManagerInterface } from '@/types/index';

export class App {
  private sceneManager: SceneManagerInterface;
  private uiManager: UIManagerInterface;
  private tts: TTSInterface;
  private characters: CharacterInterface[] = [];
  private dialogueSystem: DialogueSystemInterface | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  
  constructor() {
    this.sceneManager = new SceneManager();
    this.uiManager = new UIManager();
    this.tts = new TextToSpeech();
    
    this.init();
  }
  
  private init(): void {
    this.createCharacters();
    this.setupDialogueSystem();
    this.setupUI();
    this.setupEventListeners();
    this.start();
  }
  
  private createCharacters(): void {
    CHARACTER_DATA.forEach(data => {
      const character = new Character(data, this.sceneManager.getScene(), this.sceneManager.getCamera());
      this.characters.push(character);
      this.sceneManager.addCharacter(character);
    });
  }
  
  private setupDialogueSystem(): void {
    this.dialogueSystem = new DialogueSystem(this.characters, (dialogue: Dialogue, character: CharacterInterface) => {
      this.onDialogueChange(dialogue, character);
    });
  }
  
  private setupUI(): void {
    this.uiManager.setCallbacks({
      onStart: () => this.startDialogue(),
      onPause: () => this.pauseDialogue(),
      onNext: () => this.nextDialogue()
    });
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize();
    });
  }
  
  private onDialogueChange(dialogue: Dialogue, character: CharacterInterface): void {
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
          if (this.dialogueSystem && this.dialogueSystem.getIsPlaying() && !this.dialogueSystem.getIsPaused()) {
            this.nextDialogue();
          }
        }, 500);
      },
      (error: string) => {
        console.error('Ошибка TTS:', error);
        this.uiManager.showError('Ошибка воспроизведения речи');
      }
    );
  }
  
  private startDialogue(): void {
    if (this.dialogueSystem) {
      this.dialogueSystem.start();
      this.uiManager.setPlayingState(true, false);
    }
  }
  
  private pauseDialogue(): void {
    if (this.dialogueSystem) {
      this.dialogueSystem.pause();
      const isPaused = this.dialogueSystem.getIsPaused();
      this.uiManager.setPlayingState(true, isPaused);
      
      if (isPaused) {
        this.tts.pause();
      } else {
        this.tts.resume();
      }
    }
  }
  
  private nextDialogue(): void {
    if (this.dialogueSystem) {
      this.dialogueSystem.next();
      
      if (!this.dialogueSystem.getIsPlaying()) {
        this.endDialogue();
      } else {
        const progress = this.dialogueSystem.getProgress();
        this.uiManager.showProgress(progress.current, progress.total);
      }
    }
  }
  
  private endDialogue(): void {
    this.tts.stop();
    this.uiManager.setReadyState();
    this.uiManager.hideSubtitles();
  }
  
  public start(): void {
    this.isRunning = true;
    this.animate();
  }
  
  public stop(): void {
    this.isRunning = false;
    this.tts.stop();
    if (this.dialogueSystem) {
      this.dialogueSystem.end();
    }
  }
  
  private animate(currentTime: number = 0): void {
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
  
  public dispose(): void {
    this.stop();
    this.sceneManager.dispose();
  }
  
  // Геттеры для доступа к внутренним компонентам
  public getSceneManager(): SceneManagerInterface {
    return this.sceneManager;
  }
  
  public getUIManager(): UIManagerInterface {
    return this.uiManager;
  }
  
  public getTTS(): TTSInterface {
    return this.tts;
  }
  
  public getCharacters(): CharacterInterface[] {
    return this.characters;
  }
}
