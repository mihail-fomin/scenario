import { App } from './src/js/App.js';

// Создание и запуск приложения
const app = new App();

// Добавление рендерера в DOM
document.getElementById('canvas-container').appendChild(app.sceneManager.getRenderer().domElement);

// Обработка закрытия страницы
window.addEventListener('beforeunload', () => {
    app.dispose();
});
