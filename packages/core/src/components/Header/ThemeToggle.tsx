import { ToggleButton } from '@heroui/react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTheme } from '../../hooks';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <ToggleButton
      aria-label='Toggle theme'
      isIconOnly
      variant='default'
      className={'color-text-overlay'}
      isSelected={theme === 'dark'}
      size='md'
      onChange={toggleTheme}
    >
      {theme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ToggleButton>
  );
}
