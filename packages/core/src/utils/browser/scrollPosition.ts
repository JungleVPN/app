const positions = new Map<string, number>();

function getScrollElement(): HTMLElement {
  const root = document.getElementById('root');
  if (root && root.scrollHeight > root.clientHeight) return root;
  return document.scrollingElement as HTMLElement;
}

export function saveScrollPosition(key: string) {
  positions.set(key, getScrollElement().scrollTop);
}

export function restoreScrollPosition(key: string) {
  getScrollElement().scrollTop = positions.get(key) ?? 0;
}
