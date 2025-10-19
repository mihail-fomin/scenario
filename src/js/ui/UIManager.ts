import { UIManagerInterface, UIElements, UICallbacks, DialogueSet } from '@/types/index';

export class UIManager implements UIManagerInterface {
  private elements: UIElements;
  private callbacks: UICallbacks = {
    onStart: undefined,
    onPause: undefined,
    onNext: undefined,
    onDialogueSetChange: undefined
  };
  
  constructor() {
    this.elements = {
      startBtn: document.getElementById('startBtn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
      nextBtn: document.getElementById('nextBtn') as HTMLButtonElement,
      subtitles: document.getElementById('subtitles') as HTMLElement,
      currentSpeaker: document.getElementById('currentSpeaker') as HTMLElement,
      currentStatus: document.getElementById('currentStatus') as HTMLElement,
      dialogueSelector: document.getElementById('dialogue-selector') as HTMLElement,
      dialogueInfo: document.getElementById('dialogue-info') as HTMLElement
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

    // Обработчик для карточек диалогов будет добавлен в updateDialogueSelector
  }
  
  public setCallbacks(callbacks: UICallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  public showSubtitles(text: string, speakerName?: string): void {
    if (speakerName) {
      this.elements.subtitles.innerHTML = `<div class="speaker-name">${speakerName}</div><div class="dialogue-text">${text}</div>`;
    } else {
      this.elements.subtitles.textContent = text;
    }
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

  public updateDialogueSelector(dialogueSets: DialogueSet[], currentId: string): void {
    if (!this.elements.dialogueSelector) {
      console.warn('Элемент dialogue-selector не найден в DOM');
      return;
    }

    // Очищаем текущие карточки
    this.elements.dialogueSelector.innerHTML = '';
    
    // Создаем карточки для каждого диалога
    dialogueSets.forEach(dialogueSet => {
      const card = document.createElement('div');
      card.className = 'dialogue-card';
      card.dataset.dialogueId = dialogueSet.id;
      
      // Добавляем класс active для текущего диалога
      if (dialogueSet.id === currentId) {
        card.classList.add('active');
      }
      
      card.innerHTML = `
        <div class="dialogue-card-title">${dialogueSet.title}</div>
        <div class="dialogue-card-description">${dialogueSet.description}</div>
      `;
      
      // Добавляем обработчик клика
      card.addEventListener('click', () => {
        if (this.callbacks.onDialogueSetChange) {
          this.callbacks.onDialogueSetChange(dialogueSet.id);
        }
      });
      
      this.elements.dialogueSelector.appendChild(card);
    });
  }

  public setDialogueInfo(title: string, description: string): void {
    if (this.elements.dialogueInfo) {
      this.elements.dialogueInfo.innerHTML = `
        <div class="dialogue-title">${title}</div>
        <div class="dialogue-description">${description}</div>
      `;
    } else {
      console.warn('Элемент dialogue-info не найден в DOM');
    }
  }

  public setActiveDialogueCard(dialogueId: string): void {
    if (!this.elements.dialogueSelector) return;

    // Убираем класс active со всех карточек
    const cards = this.elements.dialogueSelector.querySelectorAll('.dialogue-card');
    cards.forEach(card => card.classList.remove('active'));

    // Добавляем класс active к выбранной карточке
    const activeCard = this.elements.dialogueSelector.querySelector(`[data-dialogue-id="${dialogueId}"]`);
    if (activeCard) {
      activeCard.classList.add('active');
    }
  }
}
