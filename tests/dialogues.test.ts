import { describe, it, expect } from 'vitest';
import { ALL_DIALOGUE_SETS } from '../src/js/data/index';
import { CHARACTER_DATA } from '../src/js/utils/constants';
import { DIALOGUE_LOCATION, LOCATIONS, getLocationForDialogue } from '../src/js/data/stages';
import { DialogueSetManager } from '../src/js/systems/DialogueSetManager';

describe('наборы диалогов', () => {
  it('id уникальны', () => {
    const ids = ALL_DIALOGUE_SETS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ALL_DIALOGUE_SETS.map(s => [s.id, s] as const))('%s: реплики согласованы с персонажами', (_id, set) => {
    expect(set.title).not.toBe('');
    expect(set.dialogues.length).toBeGreaterThan(0);

    for (const d of set.dialogues) {
      expect(d.text.trim()).not.toBe('');
      // position — индекс персонажа, speaker — его имя
      expect(d.position).toBeGreaterThanOrEqual(0);
      expect(d.position).toBeLessThan(CHARACTER_DATA.length);
      expect(d.speaker).toBe(CHARACTER_DATA[d.position].name);
    }
  });

  it('у каждого набора есть место действия', () => {
    for (const set of ALL_DIALOGUE_SETS) {
      expect(DIALOGUE_LOCATION[set.id], `нет места для ${set.id}`).toBeDefined();
    }
  });
});

describe('DialogueSetManager', () => {
  it('хранит наборы и переключает текущий', () => {
    const m = new DialogueSetManager();
    ALL_DIALOGUE_SETS.forEach(s => m.addDialogueSet(s));
    expect(m.getAllDialogueSets()).toHaveLength(ALL_DIALOGUE_SETS.length);
    expect(m.getCurrentDialogueSet()).toBeUndefined();

    m.setCurrentDialogueSet(ALL_DIALOGUE_SETS[1].id);
    expect(m.getCurrentDialogueSet()?.id).toBe(ALL_DIALOGUE_SETS[1].id);
  });

  it('бросает ошибку для неизвестного id', () => {
    expect(() => new DialogueSetManager().setCurrentDialogueSet('nope')).toThrow();
  });
});

describe('места действия', () => {
  it('все ссылки из DIALOGUE_LOCATION существуют', () => {
    for (const locId of Object.values(DIALOGUE_LOCATION)) {
      expect(LOCATIONS[locId]).toBeDefined();
    }
  });

  it('неизвестный диалог попадает во двор', () => {
    expect(getLocationForDialogue('unknown').id).toBe('yard');
  });

  it('часы в допустимом диапазоне, центр и точка интереса различаются', () => {
    for (const loc of Object.values(LOCATIONS)) {
      expect(loc.hour).toBeGreaterThanOrEqual(0);
      expect(loc.hour).toBeLessThan(24);
      expect(loc.center).not.toEqual(loc.lookAt);
    }
  });
});
