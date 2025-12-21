import { UIManagerInterface, UIElements, UICallbacks, DialogueSet } from '@/types/index';

export class UIManager implements UIManagerInterface {
  private elements: UIElements;
  private callbacks: UICallbacks = {
    onDialogueSetChange: undefined,
    onDialogueStart: undefined
  };
  
  constructor() {
    this.elements = {
      subtitles: document.getElementById('subtitles') as HTMLElement,
      dialogueSelector: document.getElementById('dialogue-selector') as HTMLElement,
      dialogueInfo: document.getElementById('dialogue-info') as HTMLElement,
      burgerMenu: document.getElementById('burger-menu') as HTMLButtonElement
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

    // Обработчик для бургер-меню
    if (this.elements.burgerMenu) {
      addTouchSupport(this.elements.burgerMenu, () => {
        this.toggleDialogueMenu();
      });
    }

    // Обработчик для карточек диалогов будет добавлен в updateDialogueSelector
  }

  private toggleDialogueMenu(): void {
    if (!this.elements.dialogueSelector || !this.elements.burgerMenu) return;
    
    const isOpen = this.elements.dialogueSelector.classList.contains('menu-open');
    
    if (isOpen) {
      this.elements.dialogueSelector.classList.remove('menu-open');
      this.elements.burgerMenu.classList.remove('active');
    } else {
      this.elements.dialogueSelector.classList.add('menu-open');
      this.elements.burgerMenu.classList.add('active');
    }
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
  
  public showError(message: string): void {
    console.error('UI Error:', message);
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
      
      // Обработчик клика: на мобильных устройствах автоматически запускает диалог
      const handleCardClick = () => {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          // На мобильных устройствах автоматически запускаем диалог
          if (this.callbacks.onDialogueStart) {
            this.callbacks.onDialogueStart(dialogueSet.id);
          }
          // Закрываем меню после выбора
          if (this.elements.dialogueSelector && this.elements.burgerMenu) {
            this.elements.dialogueSelector.classList.remove('menu-open');
            this.elements.burgerMenu.classList.remove('active');
          }
        } else {
          // На десктопе просто меняем набор диалогов
          if (this.callbacks.onDialogueSetChange) {
            this.callbacks.onDialogueSetChange(dialogueSet.id);
          }
        }
      };

      // Обработчик двойного клика для десктопа (автоматический запуск)
      const handleCardDoubleClick = () => {
        // Двойной клик работает только на десктопе
        if (window.innerWidth > 768 && this.callbacks.onDialogueStart) {
          this.callbacks.onDialogueStart(dialogueSet.id);
        }
      };

      card.addEventListener('click', handleCardClick);
      card.addEventListener('dblclick', handleCardDoubleClick);
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
