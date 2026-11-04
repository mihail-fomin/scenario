import { Character } from './classes/Character.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { DialogueSetManager } from './systems/DialogueSetManager.js';
import { TextToSpeech } from './systems/TextToSpeech.js';
import { SceneManager } from './systems/SceneManager.js';
import { UIManager } from './ui/UIManager.js';
import { CHARACTER_DATA } from './utils/constants.js';
import { ALL_DIALOGUE_SETS } from './data/index.js';
import { isAssetDebugMode } from './utils/assetDebug.js';
import { StageManager } from './systems/StageManager.js';
import { CameraDirector } from './systems/CameraDirector.js';
import { AmbientAudio } from './systems/AmbientAudio.js';
import { TimeControl } from './ui/TimeControl.js';
import { LOCATIONS, getLocationForDialogue } from './data/stages.js';
import { detectEmotion, reactionTo } from './utils/emotion.js';

import { Dialogue, CharacterInterface, DialogueSystemInterface, TTSInterface, SceneManagerInterface, UIManagerInterface, DialogueSetManagerInterface } from '@/types/index';

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class App {
  private sceneManager: SceneManager;
  private uiManager: UIManagerInterface;
  private tts: TTSInterface;
  private dialogueSetManager: DialogueSetManagerInterface;
  private characters: CharacterInterface[] = [];
  private dialogueSystem: DialogueSystemInterface | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private assetDebugMode: boolean = false;
  private stage: StageManager | null = null;
  private director: CameraDirector | null = null;
  private audio = new AmbientAudio();
  private timeControl: TimeControl | null = null;
  private startToken = 0;

  constructor() {
    this.assetDebugMode = isAssetDebugMode();
    this.sceneManager = new SceneManager();
    this.uiManager = new UIManager();
    this.tts = new TextToSpeech();
    this.dialogueSetManager = new DialogueSetManager();
    
    this.init();
  }
  
  private init(): void {
    if (this.assetDebugMode) {
      this.hideDialogueUI();
      this.setupEventListeners();
      this.start();
      return;
    }

    this.createCharacters();
    this.setupStageAndCamera();
    this.setupDialogueSets();
    this.setupDialogueSystem();
    this.setupUI();
    this.setupEventListeners();
    this.start();
  }

  private hideDialogueUI(): void {
    const ui = document.getElementById('ui');
    if (ui) {
      ui.style.display = 'none';
    }
  }
  
  private createCharacters(): void {
    CHARACTER_DATA.forEach(data => {
      const character = new Character(data, this.sceneManager.getScene(), this.sceneManager.getCamera());
      this.characters.push(character);
      this.sceneManager.addCharacter(character);
    });
  }

  private setupStageAndCamera(): void {
    this.stage = new StageManager(this.characters);
    void this.stage.goTo(LOCATIONS.yard, true);
    this.director = new CameraDirector(this.sceneManager.getCameraController(), this.characters, this.stage);
    this.timeControl = new TimeControl(this.sceneManager.getTimeOfDay(), this.audio);
  }

  private setupDialogueSets(): void {
    ALL_DIALOGUE_SETS.forEach(set => this.dialogueSetManager.addDialogueSet(set));

    // Устанавливаем первый набор как текущий
    this.dialogueSetManager.setCurrentDialogueSet(ALL_DIALOGUE_SETS[0].id);
  }
  
  private setupDialogueSystem(): void {
    this.dialogueSystem = new DialogueSystem(this.characters, (dialogue: Dialogue, character: CharacterInterface) => {
      this.onDialogueChange(dialogue, character);
    });

    // Устанавливаем текущий набор диалогов
    const currentDialogueSet = this.dialogueSetManager.getCurrentDialogueSet();
    if (currentDialogueSet && this.dialogueSystem) {
      this.dialogueSystem.setDialogueSet(currentDialogueSet);
    }
  }
  
  private setupUI(): void {
    this.uiManager.setCallbacks({
      onDialogueSetChange: (dialogueSetId: string) => this.changeDialogueSet(dialogueSetId),
      onDialogueStart: (dialogueSetId: string) => this.startDialogueFromCard(dialogueSetId)
    });

    // Инициализируем селектор диалогов
    const dialogueSets = this.dialogueSetManager.getAllDialogueSets();
    const currentDialogueSet = this.dialogueSetManager.getCurrentDialogueSet();
    this.uiManager.updateDialogueSelector(dialogueSets, currentDialogueSet?.id || '');
    
    if (currentDialogueSet) {
      this.uiManager.setDialogueInfo(currentDialogueSet.title, currentDialogueSet.description);
    }
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize();
    });
  }
  
  private onDialogueChange(dialogue: Dialogue, character: CharacterInterface): void {
    // Обновление UI
    this.uiManager.showSubtitles(dialogue.text, character.name);

    // Настроение реплики: лицо говорящего, реакции слушателей, выбор плана камерой
    const emotion = detectEmotion(dialogue.text);
    const listeners = this.characters.filter(c => c !== character);
    character.setEmotion(emotion, Math.max(1.5, dialogue.text.length * 0.07));
    character.lookAtCharacter(listeners[Math.floor(Math.random() * listeners.length)] ?? null);
    listeners.forEach(l => {
      l.lookAtCharacter(character);
      const reaction = reactionTo(emotion);
      if (reaction !== 'neutral') {
        // слушатели реагируют с небольшой задержкой, а не все разом
        setTimeout(() => l.setEmotion(reaction, 1.6 + Math.random()), 400 + Math.random() * 900);
      }
    });
    this.director?.onLine(character, dialogue.text, emotion);
    
    // Воспроизведение речи
    this.tts.speak(
      dialogue.text,
      undefined,
      () => {
        this.director?.onLineEnd();
        // Автоматический переход к следующей реплике через 500мс
        setTimeout(() => {
          if (this.dialogueSystem?.getIsPlaying()) {
            this.nextDialogue();
          }
        }, 200);
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
    }
  }
  
  private nextDialogue(): void {
    if (this.dialogueSystem) {
      this.dialogueSystem.next();
      
      if (!this.dialogueSystem.getIsPlaying()) {
        this.endDialogue();
      }
    }
  }
  
  private endDialogue(): void {
    this.tts.stop();
    this.uiManager.hideSubtitles();
    this.director?.onLineEnd();
    this.characters.forEach(c => {
      c.lookAtCharacter(null);
      c.setEmotion('neutral');
    });
  }

  private changeDialogueSet(dialogueSetId: string): void {
    if (this.dialogueSystem) {
      // Останавливаем текущий диалог
      this.dialogueSystem.end();
      this.tts.stop();
      
      // Устанавливаем новый набор диалогов
      this.dialogueSetManager.setCurrentDialogueSet(dialogueSetId);
      const newDialogueSet = this.dialogueSetManager.getCurrentDialogueSet();
      
      if (newDialogueSet && this.dialogueSystem) {
        this.dialogueSystem.setDialogueSet(newDialogueSet);
        this.uiManager.setDialogueInfo(newDialogueSet.title, newDialogueSet.description);
        this.uiManager.setActiveDialogueCard(dialogueSetId);
        this.uiManager.hideSubtitles();
      }
    }
  }

  private async startDialogueFromCard(dialogueSetId: string): Promise<void> {
    // Сначала меняем набор диалогов
    this.changeDialogueSet(dialogueSetId);
    const token = ++this.startToken;

    const location = getLocationForDialogue(dialogueSetId);
    if (this.stage && this.director) {
      const needWalk = location.id !== this.stage.getLocation().id;

      if (this.timeControl?.isAutoByStory()) {
        this.sceneManager.getTimeOfDay().transitionTo(location.hour, needWalk ? 5 : 3);
      }

      if (needWalk) {
        // Компания идёт на место, камера сопровождает
        this.uiManager.showSubtitles(`📍 ${location.label}`);
        this.director.followWalk();
        await this.stage.goTo(location);
        if (token !== this.startToken) return;
        this.uiManager.hideSubtitles();
        this.director.establish(2.4);
        await wait(1800);
      } else {
        this.director.reset();
        await wait(300);
      }
      if (token !== this.startToken) return;
    } else {
      await wait(100);
    }

    this.startDialogue();
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
    
    const dtSec = Math.min(deltaTime, 100) / 1000;

    // Сначала режиссёр выбирает кадр, потом сцена (и камера) обновляются
    this.stage?.update();
    this.director?.update(dtSec);
    this.audio.update(dtSec, this.sceneManager.getTimeOfDay().getState(), this.sceneManager.getCamera().position);

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
