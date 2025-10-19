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
