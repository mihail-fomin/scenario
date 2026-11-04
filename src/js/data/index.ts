import { DialogueSet } from '@/types/index';
import { brokenLegDialogueSet } from './brokenLegDialogue.js';
import { hairProblemDialogueSet } from './hairProblemDialogue.js';
import { armyDialogueSet } from './armyDialogue.js';
import { tikhonCharacterDialogueSet } from './tikhonCharacterDialogue.js';
import { oreoChocolateDialogueSet } from './oreoChocolateDialogue.js';
import { grishaShitDialogueSet } from './grishaShitDialogue.js';
import { grishaTwinsDialogueSet } from './grishaTwinsDialogue.js';
import { policeStationDialogueSet } from './policeStationDialogue.js';

/** Все наборы диалогов в порядке отображения в меню. Первый набор — выбранный по умолчанию. */
export const ALL_DIALOGUE_SETS: DialogueSet[] = [
  brokenLegDialogueSet,
  hairProblemDialogueSet,
  armyDialogueSet,
  tikhonCharacterDialogueSet,
  oreoChocolateDialogueSet,
  grishaShitDialogueSet,
  grishaTwinsDialogueSet,
  policeStationDialogueSet
];
