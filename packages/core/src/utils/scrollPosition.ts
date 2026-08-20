const positions = new Map<string, number>();

function getScrollElement(): HTMLElement {
  return document.getElementById('root') ?? document.documentElement;
}

export function saveScrollPosition(key: string) {
  positions.set(key, getScrollElement().scrollTop);
}

export function restoreScrollPosition(key: string) {
  getScrollElement().scrollTop = positions.get(key) ?? 0;
}
