import { App } from './src/js/App.js';

// Создание и запуск приложения
const app = new App();

// Добавление рендерера в DOM
const canvasContainer = document.getElementById('canvas-container');
if (canvasContainer) {
  canvasContainer.appendChild(app.getSceneManager().getRenderer().domElement);
}

// Обработка закрытия страницы
window.addEventListener('beforeunload', () => {
  app.dispose();
});
