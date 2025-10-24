import { UIManagerInterface, UIElements, UICallbacks, DialogueSet } from '@/types/index';

export class UIManager implements UIManagerInterface {
  private elements: UIElements;
  private callbacks: UICallbacks = {
    onStart: undefined,
    onPause: undefined,
    onDialogueSetChange: undefined
  };
  
  constructor() {
    this.elements = {
      startBtn: document.getElementById('startBtn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
      subtitles: document.getElementById('subtitles') as HTMLElement,
      dialogueSelector: document.getElementById('dialogue-selector') as HTMLElement,
      dialogueInfo: document.getElementById('dialogue-info') as HTMLElement
    };
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Добавляем поддержку touch событий для мобильных устройств
    const addTouchSupport = (element: HTMLElement, callback: () => void) => {
      element.addEventListener('click', callback);
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        callback();
      });
    };

    addTouchSupport(this.elements.startBtn, () => {
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
    });
    
    addTouchSupport(this.elements.pauseBtn, () => {
      if (this.callbacks.onPause) {
        this.callbacks.onPause();
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
  
  
  public setPlayingState(isPlaying: boolean, isPaused: boolean): void {
    this.elements.startBtn.disabled = isPlaying;
    this.elements.pauseBtn.disabled = !isPlaying;
    
    if (isPaused) {
      this.elements.pauseBtn.textContent = 'Продолжить';
    } else {
      this.elements.pauseBtn.textContent = 'Пауза';
    }
  }
  
  public setReadyState(): void {
    this.elements.startBtn.disabled = false;
    this.elements.pauseBtn.disabled = true;
    this.elements.pauseBtn.textContent = 'Пауза';
  }
  
  public showError(message: string): void {
    console.error('UI Error:', message);
  }
  
  public showProgress(current: number, total: number): void {
    // Прогресс теперь отображается в субтитрах
    console.log(`Прогресс: ${current} из ${total}`);
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
      
      // Добавляем обработчики клика и touch для мобильных устройств
      const handleCardClick = () => {
        if (this.callbacks.onDialogueSetChange) {
          this.callbacks.onDialogueSetChange(dialogueSet.id);
        }
      };

      card.addEventListener('click', handleCardClick);
      card.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleCardClick();
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
