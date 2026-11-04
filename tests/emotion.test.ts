import { describe, it, expect } from 'vitest';
import { detectEmotion, reactionTo } from '../src/js/utils/emotion';

describe('detectEmotion', () => {
  it('смех → happy', () => {
    expect(detectEmotion('Ахаха, ну ты и ржал тогда')).toBe('happy');
  });

  it('грусть и страх → sad', () => {
    expect(detectEmotion('Мне было так страшно, я весь дрожал')).toBe('sad');
  });

  it('вопрос → curious', () => {
    expect(detectEmotion('Помните, как мы туда попали?')).toBe('curious');
  });

  it('восклицание → surprised', () => {
    expect(detectEmotion('Вот это да!')).toBe('surprised');
    expect(detectEmotion('Всё, пошли!')).toBe('surprised');
  });

  it('нейтральный текст → neutral', () => {
    expect(detectEmotion('Мы пошли дальше по дороге.')).toBe('neutral');
  });

  it('регистр не важен', () => {
    expect(detectEmotion('АХАХАХ')).toBe('happy');
  });

  it('смех приоритетнее вопроса', () => {
    expect(detectEmotion('Ха-ха, помнишь?')).toBe('happy');
  });
});

describe('reactionTo', () => {
  it('слушатели разделяют радость, удивление и грусть', () => {
    expect(reactionTo('happy')).toBe('happy');
    expect(reactionTo('surprised')).toBe('surprised');
    expect(reactionTo('sad')).toBe('sad');
  });

  it('на злость слушатели реагируют с любопытством', () => {
    expect(reactionTo('angry')).toBe('curious');
  });

  it('на нейтральное не реагируют', () => {
    expect(reactionTo('neutral')).toBe('neutral');
    expect(reactionTo('curious')).toBe('neutral');
  });
});
