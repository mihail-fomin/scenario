import { TTSInterface, TTSErrorType } from '@/types/index';

export class TextToSpeech implements TTSInterface {
  private isSupported: boolean;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechTimeout: number | null = null;

  constructor() {
    this.isSupported = 'speechSynthesis' in window;
  }
  
  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void, 
    onError?: (error: TTSErrorType) => void
  ): void {
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
    
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      console.log('Ошибка воспроизведения речи:', event.error);
      this.isSpeaking = false;
      
      // Преобразование ошибки в наш тип
      const errorType: TTSErrorType = this.mapErrorType(event.error);
      if (onError) onError(errorType);
    };
    
    this.currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  }
  
  private mapErrorType(error: string): TTSErrorType {
    switch (error) {
      case 'network':
        return 'network';
      case 'synthesis-failed':
        return 'synthesis_failed';
      case 'synthesis-unavailable':
        return 'synthesis_unavailable';
      case 'language-unavailable':
        return 'language_unavailable';
      case 'voice-unavailable':
        return 'voice_unavailable';
      case 'text-too-long':
        return 'text_too_long';
      case 'invalid-argument':
        return 'invalid_argument';
      case 'not-allowed':
        return 'not_allowed';
      default:
        return 'synthesis_failed';
    }
  }
  
  public stop(): void {
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
  
  public pause(): void {
    if (this.isSupported) {
      speechSynthesis.pause();
    }
  }
  
  public resume(): void {
    if (this.isSupported) {
      speechSynthesis.resume();
    }
  }
  
  public setRate(rate: number): void {
    if (this.currentUtterance) {
      this.currentUtterance.rate = rate;
    }
  }
  
  public setPitch(pitch: number): void {
    if (this.currentUtterance) {
      this.currentUtterance.pitch = pitch;
    }
  }
  
  public setVolume(volume: number): void {
    if (this.currentUtterance) {
      this.currentUtterance.volume = volume;
    }
  }
  
  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
  
  public getIsSupported(): boolean {
    return this.isSupported;
  }
  
  // Получение доступных голосов
  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    return speechSynthesis.getVoices();
  }
  
  // Установка голоса
  public setVoice(voice: SpeechSynthesisVoice): void {
    if (this.currentUtterance && voice) {
      this.currentUtterance.voice = voice;
    }
  }
}
