export class TextToSpeech {
    constructor() {
        this.isSupported = 'speechSynthesis' in window;
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.speechTimeout = null;
    }
    
    speak(text, onStart, onEnd, onError) {
        if (!this.isSupported) {
            console.log('Text-to-Speech не поддерживается');
            if (onError) onError('not_supported');
            return;
        }
        
        // Остановка предыдущего воспроизведения
        this.stop();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
            console.log('Начало воспроизведения речи');
            this.isSpeaking = true;
            if (onStart) onStart();
        };
        
        utterance.onend = () => {
            console.log('Конец воспроизведения речи');
            this.isSpeaking = false;
            if (onEnd) onEnd();
        };
        
        utterance.onerror = (event) => {
            console.log('Ошибка воспроизведения речи:', event.error);
            this.isSpeaking = false;
            if (onError) onError(event.error);
        };
        
        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
    }
    
    stop() {
        if (this.isSupported) {
            speechSynthesis.cancel();
        }
        this.isSpeaking = false;
        this.currentUtterance = null;
        
        if (this.speechTimeout) {
            clearTimeout(this.speechTimeout);
            this.speechTimeout = null;
        }
    }
    
    pause() {
        if (this.isSupported) {
            speechSynthesis.pause();
        }
    }
    
    resume() {
        if (this.isSupported) {
            speechSynthesis.resume();
        }
    }
    
    setRate(rate) {
        if (this.currentUtterance) {
            this.currentUtterance.rate = rate;
        }
    }
    
    setPitch(pitch) {
        if (this.currentUtterance) {
            this.currentUtterance.pitch = pitch;
        }
    }
    
    setVolume(volume) {
        if (this.currentUtterance) {
            this.currentUtterance.volume = volume;
        }
    }
    
    getIsSpeaking() {
        return this.isSpeaking;
    }
    
    getIsSupported() {
        return this.isSupported;
    }
    
    // Получение доступных голосов
    getVoices() {
        if (!this.isSupported) return [];
        return speechSynthesis.getVoices();
    }
    
    // Установка голоса
    setVoice(voice) {
        if (this.currentUtterance && voice) {
            this.currentUtterance.voice = voice;
        }
    }
}
