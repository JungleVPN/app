export function scrollToTop() {
  const root = document.getElementById('root');
  (root ?? window).scrollTo({ top: 0, behavior: 'smooth' });
}
