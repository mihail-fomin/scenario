import * as THREE from 'three';
import { Character } from '../classes/Character.js';
import { CharacterAppearance } from '@/types/index';

interface Wanderer {
  character: Character;
  /** контрольные точки маршрута (по кругу или туда-обратно) */
  route?: Array<[number, number]>;
  /** случайные блуждания в прямоугольнике */
  area?: { x1: number; x2: number; z1: number; z2: number };
  speed: number;
  idx: number;
  pause: number;
}

interface ChatPair {
  a: Character;
  b: Character;
  timer: number;
  turn: number;
}

/** Жители двора: бабушки на лавочке, дети на площадке, прохожие. Не участвуют в диалогах. */
export class NpcSystem {
  private wanderers: Wanderer[] = [];
  private chats: ChatPair[] = [];
  private all: Character[] = [];

  constructor(private scene: THREE.Scene, private camera: THREE.Camera) {
    this.createBenchSitters();
    this.createKids();
    this.createPedestrians();
  }

  private spawn(name: string, x: number, z: number, look: CharacterAppearance, shirtColor: number): Character {
    const c = new Character(
      { name, color: shirtColor, position: [x, 0, z], npc: true, appearance: { shirt: shirtColor, ...look } },
      this.scene,
      this.camera
    );
    this.all.push(c);
    return c;
  }

  private createBenchSitters(): void {
    // Скамейка у дорожки (-14, 5.2): две бабушки
    const granny1 = this.spawn('Бабушка', -14.45, 5.05, { hair: 'scarf', hatColor: 0xb23a48, pants: 0x4a4a4a, skin: 0xe8bf99 }, 0x8e6c8a);
    const granny2 = this.spawn('Бабушка', -13.55, 5.05, { hair: 'scarf', hatColor: 0x4a7a9a, pants: 0x3e3e3e, skin: 0xe8bf99 }, 0x6a8f6a);
    // Скамейка (8, 5.2): дедушка в кепке
    const grandpa = this.spawn('Дедушка', 8, 5.05, { hair: 'cap', hatColor: 0x5d4e3a, pants: 0x2f3a45, skin: 0xe2b58f }, 0x7a6a55);

    for (const c of [granny1, granny2, grandpa]) {
      c.setSitting(true);
      c.faceTowards(c.group.position.x, 100);
    }
    granny1.lookAtCharacter(granny2);
    granny2.lookAtCharacter(granny1);
    this.chats.push({ a: granny1, b: granny2, timer: 2, turn: 0 });
  }

  private createKids(): void {
    const area = { x1: -31, x2: -13, z1: 12, z2: 28 };
    const kids: Array<[string, number, number, number]> = [
      ['Мальчик', -26, 16, 0xe53935],
      ['Девочка', -18, 24, 0xec407a],
      ['Мальчик', -28, 24, 0x1e88e5],
      ['Девочка', -16, 15, 0xfdd835]
    ];
    for (const [name, x, z, color] of kids) {
      const kid = this.spawn(name, x, z, {
        scale: 0.55,
        hair: name === 'Девочка' ? 'long' : 'short',
        hairColor: name === 'Девочка' ? 0xc9a24a : 0x4a3322,
        pants: 0x3949ab
      }, color);
      this.wanderers.push({ character: kid, area, speed: 2.2 + Math.random(), idx: 0, pause: Math.random() * 3 });
    }
  }

  private createPedestrians(): void {
    const walkers: Array<{ name: string; look: CharacterAppearance; color: number; route: Array<[number, number]>; speed: number }> = [
      { name: 'Прохожий', look: { hair: 'short', hairColor: 0x2a2018, pants: 0x2c3e50 }, color: 0x607d8b, route: [[-42, 3], [42, 3]], speed: 1.7 },
      { name: 'Прохожая', look: { hair: 'long', hairColor: 0x6b3f22, pants: 0x1f2933 }, color: 0xab47bc, route: [[40, 1.6], [-40, 1.6]], speed: 1.5 },
      { name: 'Прохожий', look: { hair: 'cap', hatColor: 0x1565c0, pants: 0x424242 }, color: 0x8d6e63, route: [[-70, 51.5], [70, 51.5]], speed: 1.8 },
      { name: 'Прохожая', look: { hair: 'short', hairColor: 0xa0522d, pants: 0x37474f }, color: 0xef5350, route: [[0.5, 6], [0.5, 36], [0.5, 6]], speed: 1.6 }
    ];
    walkers.forEach((w, i) => {
      const start = w.route[0];
      const c = this.spawn(w.name, start[0], start[1], w.look, w.color);
      this.wanderers.push({ character: c, route: w.route, speed: w.speed, idx: 1, pause: i * 0.7 });
    });
  }

  /** @param deltaTimeMs время кадра в миллисекундах */
  public update(deltaTimeMs: number): void {
    const dt = Math.min(deltaTimeMs, 100) / 1000;

    for (const w of this.wanderers) {
      if (w.character.isMoving()) continue;
      w.pause -= dt;
      if (w.pause > 0) continue;

      if (w.route) {
        const p = w.route[w.idx % w.route.length];
        w.idx++;
        w.character.walkTo(p[0], p[1], w.speed);
        // чтобы маршрут по кругу не обрывался: пауза после дохода до точки
        w.pause = 0.2 + Math.random() * 1.5;
      } else if (w.area) {
        const a = w.area;
        w.character.walkTo(a.x1 + Math.random() * (a.x2 - a.x1), a.z1 + Math.random() * (a.z2 - a.z1), w.speed);
        w.pause = 0.8 + Math.random() * 3.5;
        if (Math.random() < 0.3) w.character.jump();
      }
    }

    // Бабушки по очереди «разговаривают»
    for (const chat of this.chats) {
      chat.timer -= dt;
      if (chat.timer <= 0) {
        const speaker = chat.turn % 2 === 0 ? chat.a : chat.b;
        const other = speaker === chat.a ? chat.b : chat.a;
        speaker.startSpeaking();
        other.stopSpeaking();
        chat.turn++;
        chat.timer = 3 + Math.random() * 4;
      }
    }

    for (const c of this.all) c.update(deltaTimeMs);
  }

  public dispose(): void {
    this.all.forEach(c => c.dispose());
    this.all = [];
  }
}
