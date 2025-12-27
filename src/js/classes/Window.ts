import * as THREE from 'three';

export class Window {
  private group: THREE.Group;
  
  constructor(panes: number = 2) {
    this.group = new THREE.Group();
    this.createWindow(panes);
  }
  
  private createWindow(panes: number): void {
    const totalWindowWidth = 1.5;
    const windowHeight = 2;
    const windowDepth = 0.3;
    const paneSpacing = 0.02; // Расстояние между створками (рамка)
    
    // Рассчитываем ширину одной створки
    const paneWidth = (totalWindowWidth - (panes - 1) * paneSpacing) / panes;
    
    // Рассчитываем начальную позицию для центрирования
    const startX = -(totalWindowWidth - paneWidth) / 2;
    
    // Создаем каждую створку окна
    for (let i = 0; i < panes; i++) {
      const paneGeometry = new THREE.BoxGeometry(paneWidth, windowHeight, windowDepth);
      const paneMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x1a4d7a, 
        emissive: 0x0a1f33 
      });
      const pane = new THREE.Mesh(paneGeometry, paneMaterial);
      
      // Позиционируем створку
      const paneX = startX + i * (paneWidth + paneSpacing);
      pane.position.set(paneX, 0, 0);
      
      this.group.add(pane);
    }
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }
}

