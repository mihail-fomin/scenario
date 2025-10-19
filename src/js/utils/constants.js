// Константы персонажей
export const CHARACTER_DATA = [
    { name: 'Алекс', color: 0x4CAF50, position: [-3, 0, 0] },
    { name: 'Мария', color: 0x2196F3, position: [0, 0, 0] },
    { name: 'Дмитрий', color: 0xFF9800, position: [3, 0, 0] }
];

// Настройки анимации
export const ANIMATION_SETTINGS = {
    SPEAKING_ROTATION_SPEED: 0.005,
    BREATHING_SPEED: 0.002,
    BREATHING_AMPLITUDE: 0.02,
    SPEAKING_AMPLITUDE: 0.1
};

// Настройки камеры
export const CAMERA_SETTINGS = {
    ROTATION_SPEED: 0.0005,
    RADIUS: 8,
    HEIGHT: 2
};

// Настройки TTS
export const TTS_SETTINGS = {
    LANG: 'ru-RU',
    RATE: 1.0,
    PITCH: 1,
    VOLUME: 0.8
};
