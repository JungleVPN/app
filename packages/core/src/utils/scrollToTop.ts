export function scrollToTop() {
  const root = document.getElementById('root');
  const target = root && root.scrollHeight > root.clientHeight ? root : window;
  target.scrollTo({ top: 0, behavior: 'smooth' });
}
