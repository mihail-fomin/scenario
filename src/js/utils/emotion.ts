import { Emotion } from '@/types/index';

/**
 * Грубое определение настроения реплики по тексту — чтобы лица и жесты
 * соответствовали сказанному без ручной разметки всех диалогов.
 */
export function detectEmotion(text: string): Emotion {
  const t = text.toLowerCase();

  if (/(ха-?ха|хах|ахах|ржал|ржач|смеш|угар|прикол|обхохо|поржал)/.test(t)) return 'happy';
  if (/(груст|плак|слез|слёз|жаль|страшн|боял|боит|дрожал|трясл|холодно|тоскл|обидн)/.test(t)) return 'sad';
  if (/(бесит|злой|злил|орал|орёт|орет|охуе|пиздец|ебан|сука|нахуй|заебал|достал)/.test(t)) return 'angry';
  if (/(\?!|!\?|вот это да|нифига|ничего себе|офиг|внезапно|прикинь|представ)/.test(t)) return 'surprised';
  if (/\?\s*$/.test(t.trim()) || /(а помните|помните|кстати)/.test(t)) return 'curious';
  if (/!\s*$/.test(t.trim())) return 'surprised';
  return 'neutral';
}

/** Как слушатели реагируют на эмоцию говорящего */
export function reactionTo(emotion: Emotion): Emotion {
  switch (emotion) {
    case 'happy': return 'happy';
    case 'surprised': return 'surprised';
    case 'sad': return 'sad';
    case 'angry': return 'curious';
    default: return 'neutral';
  }
}
