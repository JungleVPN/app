import { renderHook } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useNavigation } from './useNavigation';

function renderAt(pathname: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>
  );
  return renderHook(() => ({ navigate: useNavigation(), location: useLocation() }), { wrapper });
}

describe('useNavigation', () => {
  it('keeps the language prefix when moving between marketing pages', () => {
    const { result } = renderAt('/ar');

    act(() => result.current.navigate('/pricing'));

    expect(result.current.location.pathname).toBe('/ar/pricing');
  });

  it('does not prefix app pages', () => {
    const { result } = renderAt('/ar/pricing');

    act(() => result.current.navigate('/login'));

    expect(result.current.location.pathname).toBe('/login');
  });
});
