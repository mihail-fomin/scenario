/**
 * Места действия. Для каждой темы разговора персонажи идут в «своё» место двора,
 * а режиссёр камеры и время суток подстраиваются под него.
 */
export interface StageLocation {
  id: string;
  label: string;
  /** точка, вокруг которой встают персонажи (x, z) */
  center: [number, number];
  /** на что «смотрит» компания: определяет, как повёрнут треугольник персонажей */
  lookAt: [number, number];
  /** час, к которому плавно перематывается время суток */
  hour: number;
}

export const LOCATIONS: Record<string, StageLocation> = {
  yard:       { id: 'yard',       label: 'Двор у забора',        center: [0, 0],    lookAt: [0, 40],  hour: 13 },
  garage:     { id: 'garage',     label: 'У гаражей',            center: [26, 24],  lookAt: [26, 31], hour: 15.5 },
  football:   { id: 'football',   label: 'Футбольное поле',      center: [22, 17],  lookAt: [35, 17], hour: 17.5 },
  flowerbed:  { id: 'flowerbed',  label: 'У клумбы',             center: [-8, 14],  lookAt: [-8, 8],  hour: 10 },
  store:      { id: 'store',      label: 'У продуктового',       center: [30, 56],  lookAt: [30, 69], hour: 18.7 },
  playground: { id: 'playground', label: 'Детская площадка',     center: [-22, 34], lookAt: [-22, 20], hour: 19.8 },
  busstop:    { id: 'busstop',    label: 'Остановка',            center: [-12, 33], lookAt: [-12, 40], hour: 21.3 },
  crossing:   { id: 'crossing',   label: 'Пешеходный переход',   center: [0, 36],   lookAt: [0, 45],  hour: 23 }
};

/** id набора диалога → id места */
export const DIALOGUE_LOCATION: Record<string, string> = {
  dialogue1: 'garage',
  dialogue4: 'flowerbed',
  army_dialogue: 'football',
  tikhon_character_dialogue: 'yard',
  oreo_chocolate_dialogue: 'store',
  grisha_shit_dialogue: 'playground',
  grisha_twins_dialogue: 'busstop',
  police_station_dialogue: 'crossing'
};

export function getLocationForDialogue(dialogueSetId: string): StageLocation {
  return LOCATIONS[DIALOGUE_LOCATION[dialogueSetId] ?? 'yard'] ?? LOCATIONS.yard;
}

/** Позиции персонажей относительно центра: [вбок, вперёд] (вперёд — в сторону lookAt) */
export const SLOT_OFFSETS: Array<[number, number]> = [
  [0, -2],   // Лёха — чуть позади
  [-2, -1],  // Федот
  [2, -1]    // Тихон
];
