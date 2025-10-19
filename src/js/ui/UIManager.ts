import { UIManagerInterface, UIElements, UICallbacks } from '@/types/index';

export class UIManager implements UIManagerInterface {
  private elements: UIElements;
  private callbacks: UICallbacks = {
    onStart: undefined,
    onPause: undefined,
    onNext: undefined
  };
  
  constructor() {
    this.elements = {
      startBtn: document.getElementById('startBtn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
      nextBtn: document.getElementById('nextBtn') as HTMLButtonElement,
      subtitles: document.getElementById('subtitles') as HTMLElement,
      currentSpeaker: document.getElementById('currentSpeaker') as HTMLElement,
      currentStatus: document.getElementById('currentStatus') as HTMLElement
    };
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.elements.startBtn.addEventListener('click', () => {
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
    });
    
    this.elements.pauseBtn.addEventListener('click', () => {
      if (this.callbacks.onPause) {
        this.callbacks.onPause();
      }
    });
    
    this.elements.nextBtn.addEventListener('click', () => {
      if (this.callbacks.onNext) {
        this.callbacks.onNext();
      }
    });
  }
  
  public setCallbacks(callbacks: UICallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  public showSubtitles(text: string): void {
    this.elements.subtitles.textContent = text;
    this.elements.subtitles.classList.add('show');
  }
  
  public hideSubtitles(): void {
    this.elements.subtitles.classList.remove('show');
  }
  
  public updateSpeakerInfo(speakerName: string, status: string): void {
    this.elements.currentSpeaker.textContent = speakerName;
    this.elements.currentStatus.textContent = status;
  }
  
  public setPlayingState(isPlaying: boolean, isPaused: boolean): void {
    this.elements.startBtn.disabled = isPlaying;
    this.elements.pauseBtn.disabled = !isPlaying;
    this.elements.nextBtn.disabled = !isPlaying;
    
    if (isPaused) {
      this.elements.pauseBtn.textContent = 'Продолжить';
    } else {
      this.elements.pauseBtn.textContent = 'Пауза';
    }
  }
  
  public setReadyState(): void {
    this.elements.startBtn.disabled = false;
    this.elements.pauseBtn.disabled = true;
    this.elements.nextBtn.disabled = true;
    this.elements.pauseBtn.textContent = 'Пауза';
    this.updateSpeakerInfo('Готов к диалогу', 'Нажмите "Начать диалог"');
  }
  
  public showError(message: string): void {
    console.error('UI Error:', message);
    this.updateSpeakerInfo('Ошибка', message);
  }
  
  public showProgress(current: number, total: number): void {
    this.elements.currentStatus.textContent = `Реплика ${current} из ${total}`;
  }
}
