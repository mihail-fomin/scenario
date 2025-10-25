import { CharacterData, AnimationSettings, CameraSettings, TTSSettings } from '@/types/index';

// Константы персонажей - стоят перед забором
export const CHARACTER_DATA: CharacterData[] = [
  { name: 'Лёха', color: 0x4CAF50, position: [0, 0, -2] },      // По центру перед забором
  { name: 'Федот', color: 0x2196F3, position: [-2, 0, -1] },    // Слева перед забором
  { name: 'Тихон', color: 0xFF9800, position: [2, 0, -1] }      // Справа перед забором
];

// Настройки анимации
export const ANIMATION_SETTINGS: AnimationSettings = {
  SPEAKING_ROTATION_SPEED: 0.005,
  BREATHING_SPEED: 0.002,
  BREATHING_AMPLITUDE: 0.02,
  SPEAKING_AMPLITUDE: 0.1
};

// Настройки камеры
export const CAMERA_SETTINGS: CameraSettings = {
  ROTATION_SPEED: 0.0005,
  RADIUS: 10,
  HEIGHT: 3,
  SENSITIVITY: 0.002,
  AUTO_RETURN_DELAY: 10000,
  TRANSITION_SPEED: 0.02,
  MIN_RADIUS: 3,
  MAX_RADIUS: 20,
  ZOOM_SENSITIVITY: 0.8,
  ZOOM_SPEED: 0.05
};

// Настройки TTS
export const TTS_SETTINGS: TTSSettings = {
  LANG: 'ru-RU',
  RATE: 1.0,
  PITCH: 1,
  VOLUME: 0.8
};
