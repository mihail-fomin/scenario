import { TimeOfDay } from '../systems/TimeOfDay.js';
import { AmbientAudio } from '../systems/AmbientAudio.js';

const PRESETS: Array<{ label: string; hour: number }> = [
  { label: 'Утро', hour: 8 },
  { label: 'День', hour: 13 },
  { label: 'Вечер', hour: 19 },
  { label: 'Ночь', hour: 23.5 }
];

/** Панель времени суток: слайдер, пресеты, «по сюжету», смена дня и звук */
export class TimeControl {
  private root: HTMLDivElement;
  private slider: HTMLInputElement;
  private clock: HTMLSpanElement;
  private autoCheckbox: HTMLInputElement;
  private cycleCheckbox: HTMLInputElement;
  private soundButton: HTMLButtonElement;

  constructor(private time: TimeOfDay, private audio: AmbientAudio) {
    this.root = document.createElement('div');
    this.root.id = 'time-panel';
    this.root.innerHTML = `
      <div class="tp-head">
        <span class="tp-title">Время суток</span>
        <span class="tp-clock" id="tp-clock">13:00</span>
      </div>
      <input id="tp-slider" type="range" min="0" max="24" step="0.05" value="13" aria-label="Время суток">
      <div class="tp-presets"></div>
      <label class="tp-check"><input id="tp-auto" type="checkbox" checked> Время по сюжету</label>
      <label class="tp-check"><input id="tp-cycle" type="checkbox"> Смена дня и ночи</label>
      <button id="tp-sound" class="tp-sound" type="button">🔇 Звук выключен</button>
    `;
    (document.getElementById('ui') ?? document.body).appendChild(this.root);

    this.slider = this.root.querySelector('#tp-slider') as HTMLInputElement;
    this.clock = this.root.querySelector('#tp-clock') as HTMLSpanElement;
    this.autoCheckbox = this.root.querySelector('#tp-auto') as HTMLInputElement;
    this.cycleCheckbox = this.root.querySelector('#tp-cycle') as HTMLInputElement;
    this.soundButton = this.root.querySelector('#tp-sound') as HTMLButtonElement;

    const presets = this.root.querySelector('.tp-presets') as HTMLDivElement;
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.label;
      b.addEventListener('click', () => this.time.transitionTo(p.hour, 2.5));
      presets.appendChild(b);
    });

    this.slider.addEventListener('input', () => this.time.setHour(parseFloat(this.slider.value)));
    this.cycleCheckbox.addEventListener('change', () => {
      this.time.setCycleSpeed(this.cycleCheckbox.checked ? 0.4 : 0);
    });
    this.soundButton.addEventListener('click', () => {
      this.audio.setEnabled(!this.audio.isEnabled());
      this.soundButton.textContent = this.audio.isEnabled() ? '🔊 Звук включён' : '🔇 Звук выключен';
    });

    this.time.onChange((s) => this.syncClock(s.hour));
  }

  private syncClock(hour: number): void {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    this.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (document.activeElement !== this.slider) this.slider.value = String(hour);
  }

  /** Подстраивать время под место действия, когда начинается новый диалог */
  public isAutoByStory(): boolean {
    return this.autoCheckbox.checked;
  }
}
