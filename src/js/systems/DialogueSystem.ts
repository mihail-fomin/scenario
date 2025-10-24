import { Dialogue, DialogueSystemInterface, DialogueProgress, CharacterInterface, DialogueSet } from '@/types/index';

export class DialogueSystem implements DialogueSystemInterface {
  private characters: CharacterInterface[];
  private onDialogueChange: (dialogue: Dialogue, character: CharacterInterface) => void;
  private currentDialogueIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentDialogueSet: DialogueSet | null = null;
  

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
    if (!this.currentDialogueSet) return;
    
    const dialogues = this.currentDialogueSet.dialogues;
    if (this.currentDialogueIndex < dialogues.length - 1) {
      this.currentDialogueIndex++;
      this.playCurrentDialogue();
    } else {
      this.end();
    }
  }
  
  private playCurrentDialogue(): void {
    if (this.isPaused || !this.currentDialogueSet) return;
    
    const dialogues = this.currentDialogueSet.dialogues;
    const dialogue = dialogues[this.currentDialogueIndex];
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
    if (!this.currentDialogueSet) return undefined;
    
    const dialogues = this.currentDialogueSet.dialogues;
    return dialogues[this.currentDialogueIndex];
  }
  
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  public getIsPaused(): boolean {
    return this.isPaused;
  }
  
  public getProgress(): DialogueProgress {
    if (!this.currentDialogueSet) {
      return { current: 0, total: 0 };
    }
    
    const dialogues = this.currentDialogueSet.dialogues;
    return {
      current: this.currentDialogueIndex + 1,
      total: dialogues.length
    };
  }

  public setDialogueSet(dialogueSet: DialogueSet): void {
    this.currentDialogueSet = dialogueSet;
    this.currentDialogueIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Сброс всех персонажей
    this.characters.forEach(char => {
      char.stopSpeaking();
    });
  }

  public getCurrentDialogueSet(): DialogueSet | undefined {
    return this.currentDialogueSet || undefined;
  }
}
