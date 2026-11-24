import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeSelector = () => {
  const { theme, setTheme, isDark, isLight, isSystem } = useTheme();

  return (
    <div className="theme-selector">
      <button
        className={`theme-option ${isLight ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        aria-label="Light theme"
      >
        <Sun size={18} />
      </button>
      <button
        className={`theme-option ${isDark ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-label="Dark theme"
      >
        <Moon size={18} />
      </button>
      <button
        className={`theme-option ${isSystem ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        aria-label="System theme"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
};

export default ThemeSelector;