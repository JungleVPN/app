import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Link } from './Link';

function renderLinkAt(pathname: string, href: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Link href={href}>Pricing</Link>
    </MemoryRouter>,
  );
  return screen.getByRole('link', { name: 'Pricing' });
}

describe('Link', () => {
  it('keeps the language prefix on marketing links', () => {
    expect(renderLinkAt('/ar', '/pricing').getAttribute('href')).toBe('/ar/pricing');
  });

  it('leaves marketing links unprefixed on an English page', () => {
    expect(renderLinkAt('/', '/pricing').getAttribute('href')).toBe('/pricing');
  });
});
