import { DebugAsset } from '@/types/index';
import template from '@/templates/asset-debug-panel.html?raw';

export class AssetDebugPanel {
  private panel: HTMLElement;
  private select: HTMLSelectElement;
  private onAssetChange?: (assetId: string) => void;

  constructor() {
    const container = document.createElement('div');
    container.innerHTML = template.trim();
    this.panel = container.firstElementChild as HTMLElement;
    this.select = this.panel.querySelector('#asset-debug-select') as HTMLSelectElement;
    this.select.addEventListener('change', () => {
      this.onAssetChange?.(this.select.value);
    });
    document.body.appendChild(this.panel);
  }

  public setAssets(assets: DebugAsset[], currentId: string): void {
    this.select.innerHTML = '';
    for (const asset of assets) {
      const option = document.createElement('option');
      option.value = asset.id;
      option.textContent = asset.label;
      this.select.appendChild(option);
    }
    this.select.value = currentId;
  }

  public setCurrentAsset(id: string): void {
    this.select.value = id;
  }

  public setOnAssetChange(callback: (assetId: string) => void): void {
    this.onAssetChange = callback;
  }

  public dispose(): void {
    this.panel.remove();
  }
}
