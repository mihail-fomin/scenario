export class UIManager {
    constructor() {
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            nextBtn: document.getElementById('nextBtn'),
            subtitles: document.getElementById('subtitles'),
            currentSpeaker: document.getElementById('currentSpeaker'),
            currentStatus: document.getElementById('currentStatus')
        };
        
        this.callbacks = {
            onStart: null,
            onPause: null,
            onNext: null
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
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
    
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    showSubtitles(text) {
        this.elements.subtitles.textContent = text;
        this.elements.subtitles.classList.add('show');
    }
    
    hideSubtitles() {
        this.elements.subtitles.classList.remove('show');
    }
    
    updateSpeakerInfo(speakerName, status) {
        this.elements.currentSpeaker.textContent = speakerName;
        this.elements.currentStatus.textContent = status;
    }
    
    setPlayingState(isPlaying, isPaused) {
        this.elements.startBtn.disabled = isPlaying;
        this.elements.pauseBtn.disabled = !isPlaying;
        this.elements.nextBtn.disabled = !isPlaying;
        
        if (isPaused) {
            this.elements.pauseBtn.textContent = 'Продолжить';
        } else {
            this.elements.pauseBtn.textContent = 'Пауза';
        }
    }
    
    setReadyState() {
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        this.elements.nextBtn.disabled = true;
        this.elements.pauseBtn.textContent = 'Пауза';
        this.updateSpeakerInfo('Готов к диалогу', 'Нажмите "Начать диалог"');
    }
    
    showError(message) {
        console.error('UI Error:', message);
        this.updateSpeakerInfo('Ошибка', message);
    }
    
    showProgress(current, total) {
        this.elements.currentStatus.textContent = `Реплика ${current} из ${total}`;
    }
}
