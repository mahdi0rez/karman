import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeSelector = () => {
  const { theme, setTheme, isDark, isLight } = useTheme();

  return (
    <div className="theme-selector">
      <button
        className={`theme-option ${isLight ? 'active' : ''}`}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
};

export default ThemeSelector;