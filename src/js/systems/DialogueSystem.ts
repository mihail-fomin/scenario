import { Dialogue, DialogueSystemInterface, DialogueProgress, CharacterInterface } from '@/types/index';

export class DialogueSystem implements DialogueSystemInterface {
  private characters: CharacterInterface[];
  private onDialogueChange: (dialogue: Dialogue, character: CharacterInterface) => void;
  private currentDialogueIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  
  // Диалоги между персонажами
  private dialogues: Dialogue[] = [
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

  constructor(characters: CharacterInterface[], onDialogueChange: (dialogue: Dialogue, character: CharacterInterface) => void) {
    this.characters = characters;
    this.onDialogueChange = onDialogueChange;
  }
  
  public start(): void {
    this.currentDialogueIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.playCurrentDialogue();
  }
  
  public pause(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.playCurrentDialogue();
    } else {
      this.isPaused = true;
    }
  }
  
  public next(): void {
    if (this.currentDialogueIndex < this.dialogues.length - 1) {
      this.currentDialogueIndex++;
      this.playCurrentDialogue();
    } else {
      this.end();
    }
  }
  
  private playCurrentDialogue(): void {
    if (this.isPaused) return;
    
    const dialogue = this.dialogues[this.currentDialogueIndex];
    const character = this.characters[dialogue.position];
    
    // Остановка предыдущего говорящего
    this.characters.forEach(char => {
      char.stopSpeaking();
    });
    
    // Активация текущего говорящего
    character.startSpeaking();
    
    // Уведомление о смене диалога
    this.onDialogueChange(dialogue, character);
  }
  
  public end(): void {
    this.isPlaying = false;
    this.isPaused = false;
    
    // Сброс всех персонажей
    this.characters.forEach(char => {
      char.stopSpeaking();
    });
  }
  
  public getCurrentDialogue(): Dialogue | undefined {
    return this.dialogues[this.currentDialogueIndex];
  }
  
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  public getIsPaused(): boolean {
    return this.isPaused;
  }
  
  public getProgress(): DialogueProgress {
    return {
      current: this.currentDialogueIndex + 1,
      total: this.dialogues.length
    };
  }
}
