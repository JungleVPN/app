import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { svgImage } from '../svgImage';

function renderIcon(options: { className?: string; loading?: 'eager' | 'lazy' } = {}) {
  const Icon = svgImage({
    src: '/assets/ready-icon.svg',
    width: 622,
    height: 546,
    className: 'w-auto h-full',
  });
  const { container } = render(<Icon className={options.className} loading={options.loading} />);
  const img = container.querySelector('img');
  if (!img) throw new Error('expected an <img>');
  return img;
}

describe('svgImage', () => {
  it('renders the file as a decorative image', () => {
    const img = renderIcon();

    expect(img.getAttribute('src')).toBe('/assets/ready-icon.svg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the sizing the SVG used to carry on its root element', () => {
    expect(renderIcon().className).toBe('w-auto h-full');
  });

  it('lets a caller className replace that default, as it did for the inline SVG', () => {
    expect(renderIcon({ className: 'h-28 m-auto' }).className).toBe('h-28 m-auto');
  });

  it('reserves its space before the file arrives', () => {
    expect(renderIcon().style.aspectRatio).toBe('622 / 546');
  });

  it('defers loading by default and honours an eager override', () => {
    expect(renderIcon().getAttribute('loading')).toBe('lazy');
    expect(renderIcon({ loading: 'eager' }).getAttribute('loading')).toBe('eager');
  });
});
