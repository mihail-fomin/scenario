import { Character } from './classes/Character.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { DialogueSetManager } from './systems/DialogueSetManager.js';
import { TextToSpeech } from './systems/TextToSpeech.js';
import { SceneManager } from './systems/SceneManager.js';
import { UIManager } from './ui/UIManager.js';
import { CHARACTER_DATA } from './utils/constants.js';
import { armyDialogueSet } from './data/armyDialogue.js';
import { tikhonCharacterDialogueSet } from './data/tikhonCharacterDialogue.js';
import { Dialogue, CharacterInterface, DialogueSystemInterface, TTSInterface, SceneManagerInterface, UIManagerInterface, DialogueSet, DialogueSetManagerInterface } from '@/types/index';

export class App {
  private sceneManager: SceneManagerInterface;
  private uiManager: UIManagerInterface;
  private tts: TTSInterface;
  private dialogueSetManager: DialogueSetManagerInterface;
  private characters: CharacterInterface[] = [];
  private dialogueSystem: DialogueSystemInterface | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  
  constructor() {
    this.sceneManager = new SceneManager();
    this.uiManager = new UIManager();
    this.tts = new TextToSpeech();
    this.dialogueSetManager = new DialogueSetManager();
    
    this.init();
  }
  
  private init(): void {
    this.createCharacters();
    this.setupDialogueSets();
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

  private setupDialogueSets(): void {
    // Создаем несколько наборов диалогов
    const dialogueSet1: DialogueSet = {
      id: 'dialogue1',
      title: 'Сломанная нога',
      description: 'Диалог о том, как Тихон сломал ногу, прыгая с гаража',
      dialogues: [
        {
            speaker: 'Лёха',
            text: 'Бля, Тихон, что с тобой? Лежишь как овощ!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да вставай уже, придурок! Хватит притворяться!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'Блять, ребята... У меня нога сломана! Не могу встать!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Ахахаха! Сломана? Да ты просто неудачно прыгнул с гаража!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да ладно, вставай! Мы же видели, как ты прыгал. Ничего страшного!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'Ебать, да я же говорю - НОГА СЛОМАНА! Болит как сука!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Блять, Тихон, хватит ныть! Давай вставай, идем дальше!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да, давай уже! Мы тебя ждем тут как дураки!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'Ебать вашу мать! Я не могу! Нога не держит!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Ахахаха! "Не держит"! Да ты просто трус!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да, давай уже! Хватит прикидываться!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'БЛЯТЬ! Я НЕ ПРИКИДЫВАЮСЬ! У МЕНЯ НОГА СЛОМАНА!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Ну и хуй с тобой! Идем без него, Федот!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да, пошли! Пусть лежит тут, если хочет!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'Ебать, ребята! Не бросайте меня! Вызовите скорую!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Ахахаха! "Скорую"! Да ты просто ленивый!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да, давай уже вставай! Хватит ныть!',
            position: 1
          },
          {
            speaker: 'Тихон',
            text: 'БЛЯТЬ! Я УМРУ ТУТ! ВЫЗОВИТЕ СКОРУЮ!',
            position: 2
          },
          {
            speaker: 'Лёха',
            text: 'Ну и хуй с тобой! Идем, Федот!',
            position: 0
          },
          {
            speaker: 'Федот',
            text: 'Да, пошли! Пусть лежит!',
            position: 1
          }
      ]
    };

    const dialogueSet2: DialogueSet = {
      id: 'dialogue4',
      title: 'Проблема с волосами',
      description: 'Диалог про облысение - Леха утверждает, что не лысеет, а у него просто форма буквы М',
      dialogues: [
        {
          speaker: 'Федот',
          text: 'Блять, Лёха, у тебя что, лысина уже? На висках-то волос нет!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, я тоже заметил! У тебя уже залысины видны!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'Что за хуйню вы несете? Я не лысею! У меня просто такая форма головы!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Ахахаха! "Форма головы"! Да ты уже почти лысый!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха, признавайся! У тебя уже залысины как у деда!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'Ебать, да я же говорю - я НЕ ЛЫСЕЮ! Это просто особенность!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Особенность? Ахахаха! Да ты скоро совсем лысый будешь!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха, смирись уже! Ты лысеешь!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'Блять, да я же не лысею! У меня просто... просто... это похоже на букву М!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Ахахаха! "Букву М"! Да ты придумал!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха! "Буква М"! Ахахаха!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'Да! М - это Михеев! Моя фамилия! Это не лысина, это моя особенность!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Ахахаха! "Михеев"! Да ты совсем ебанулся!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха! "Михеев"! Ахахаха! Ты лысеешь, а придумываешь!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'Ебать вашу мать! Я НЕ ЛЫСЕЮ! У меня просто форма головы как буква М!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Ахахаха! "Форма головы"! Да ты скоро совсем лысый будешь!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха! Признавайся уже! Ты лысеешь!',
          position: 2
        },
        {
          speaker: 'Лёха',
          text: 'БЛЯТЬ! Я НЕ ЛЫСЕЮ! У МЕНЯ ПРОСТО ТАКАЯ ФОРМА ГОЛОВЫ!',
          position: 0
        },
        {
          speaker: 'Федот',
          text: 'Ахахаха! "Форма головы"! Да ты совсем ебанулся!',
          position: 1
        },
        {
          speaker: 'Тихон',
          text: 'Да, Лёха! Ты лысеешь, а придумываешь всякую хуйню!',
          position: 2
        }
      ]
    };

    // Добавляем наборы диалогов
    this.dialogueSetManager.addDialogueSet(dialogueSet1);
    this.dialogueSetManager.addDialogueSet(dialogueSet2);
    this.dialogueSetManager.addDialogueSet(armyDialogueSet);
    this.dialogueSetManager.addDialogueSet(tikhonCharacterDialogueSet);

    // Устанавливаем первый набор как текущий
    this.dialogueSetManager.setCurrentDialogueSet('dialogue1');
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
      onStart: () => this.startDialogue(),
      onPause: () => this.pauseDialogue(),
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
        this.uiManager.setReadyState();
        this.uiManager.hideSubtitles();
      }
    }
  }

  private startDialogueFromCard(dialogueSetId: string): void {
    // Сначала меняем набор диалогов
    this.changeDialogueSet(dialogueSetId);
    
    // Затем автоматически запускаем диалог
    setTimeout(() => {
      this.startDialogue();
    }, 100); // Небольшая задержка для корректной инициализации
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
