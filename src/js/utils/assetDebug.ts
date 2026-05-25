/** Режим отладки ассетов: только в dev, через ?asset-debug или #asset-debug */
export function isAssetDebugMode(): boolean {
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('asset-debug') || window.location.hash === '#asset-debug';
}

export function getAssetDebugIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('asset');
}
