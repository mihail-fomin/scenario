import * as THREE from 'three';

// Типы персонажей
export interface CharacterData {
  name: string;
  color: number;
  position: [number, number, number];
}

// Типы диалогов
export interface Dialogue {
  speaker: string;
  text: string;
  position: number;
}

// Новый тип для набора диалогов
export interface DialogueSet {
  id: string;
  title: string;
  description: string;
  dialogues: Dialogue[];
}

// Типы персонажа
export interface CharacterInterface {
  name: string;
  color: number;
  position: [number, number, number];
  isSpeaking: boolean;
  group: THREE.Group;
  nameLabel: THREE.Mesh | null;
  startSpeaking(): void;
  stopSpeaking(): void;
  update(deltaTime: number): void;
  dispose(): void;
}

// Типы UI элементов
export interface UIElements {
  startBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  subtitles: HTMLElement;
  currentSpeaker: HTMLElement;
  currentStatus: HTMLElement;
  dialogueSelector: HTMLElement;
  dialogueInfo: HTMLElement;
}

// Типы колбэков UI
export interface UICallbacks {
  onStart?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onDialogueSetChange?: (dialogueSetId: string) => void;
}

// Типы прогресса диалога
export interface DialogueProgress {
  current: number;
  total: number;
}

// Типы настроек анимации
export interface AnimationSettings {
  SPEAKING_ROTATION_SPEED: number;
  BREATHING_SPEED: number;
  BREATHING_AMPLITUDE: number;
  SPEAKING_AMPLITUDE: number;
}

// Типы настроек камеры
export interface CameraSettings {
  ROTATION_SPEED: number;
  RADIUS: number;
  HEIGHT: number;
}

// Типы настроек TTS
export interface TTSSettings {
  LANG: string;
  RATE: number;
  PITCH: number;
  VOLUME: number;
}

// Типы событий TTS
export type TTSEventType = 'start' | 'end' | 'error';
export type TTSErrorType = 'not_supported' | 'network' | 'synthesis_failed' | 'synthesis_unavailable' | 'language_unavailable' | 'voice_unavailable' | 'text_too_long' | 'invalid_argument' | 'not_allowed';

// Интерфейс для системы диалогов
export interface DialogueSystemInterface {
  start(): void;
  pause(): void;
  next(): void;
  end(): void;
  getCurrentDialogue(): Dialogue | undefined;
  getIsPlaying(): boolean;
  getIsPaused(): boolean;
  getProgress(): DialogueProgress;
  setDialogueSet(dialogueSet: DialogueSet): void;
  getCurrentDialogueSet(): DialogueSet | undefined;
}

// Интерфейс для системы TTS
export interface TTSInterface {
  speak(text: string, onStart?: () => void, onEnd?: () => void, onError?: (error: TTSErrorType) => void): void;
  stop(): void;
  pause(): void;
  resume(): void;
  setRate(rate: number): void;
  setPitch(pitch: number): void;
  setVolume(volume: number): void;
  getIsSpeaking(): boolean;
  getIsSupported(): boolean;
  getVoices(): SpeechSynthesisVoice[];
  setVoice(voice: SpeechSynthesisVoice): void;
}

// Интерфейс для управления сценой
export interface SceneManagerInterface {
  getScene(): THREE.Scene;
  getCamera(): THREE.Camera;
  getRenderer(): THREE.WebGLRenderer;
  getCharacters(): CharacterInterface[];
  addCharacter(character: CharacterInterface): void;
  update(deltaTime: number): void;
  render(): void;
  onWindowResize(): void;
  dispose(): void;
}

// Новый интерфейс для управления наборами диалогов
export interface DialogueSetManagerInterface {
  addDialogueSet(dialogueSet: DialogueSet): void;
  getDialogueSet(id: string): DialogueSet | undefined;
  getAllDialogueSets(): DialogueSet[];
  setCurrentDialogueSet(id: string): void;
  getCurrentDialogueSet(): DialogueSet | undefined;
}

// Интерфейс для управления UI
export interface UIManagerInterface {
  setCallbacks(callbacks: UICallbacks): void;
  showSubtitles(text: string): void;
  hideSubtitles(): void;
  updateSpeakerInfo(speakerName: string, status: string): void;
  setPlayingState(isPlaying: boolean, isPaused: boolean): void;
  setReadyState(): void;
  showError(message: string): void;
  showProgress(current: number, total: number): void;
  updateDialogueSelector(dialogueSets: DialogueSet[], currentId: string): void;
  setDialogueInfo(title: string, description: string): void;
  setActiveDialogueCard(dialogueId: string): void;
}
