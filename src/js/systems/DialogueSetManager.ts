import { DialogueSet, DialogueSetManagerInterface } from '@/types/index';

export class DialogueSetManager implements DialogueSetManagerInterface {
  private dialogueSets: Map<string, DialogueSet> = new Map();
  private currentDialogueSetId: string | null = null;

  public addDialogueSet(dialogueSet: DialogueSet): void {
    this.dialogueSets.set(dialogueSet.id, dialogueSet);
  }

  public getDialogueSet(id: string): DialogueSet | undefined {
    return this.dialogueSets.get(id);
  }

  public getAllDialogueSets(): DialogueSet[] {
    return Array.from(this.dialogueSets.values());
  }

  public setCurrentDialogueSet(id: string): void {
    if (this.dialogueSets.has(id)) {
      this.currentDialogueSetId = id;
    } else {
      throw new Error(`Диалог с ID "${id}" не найден`);
    }
  }

  public getCurrentDialogueSet(): DialogueSet | undefined {
    if (this.currentDialogueSetId) {
      return this.dialogueSets.get(this.currentDialogueSetId);
    }
    return undefined;
  }
}
