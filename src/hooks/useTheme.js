import { useEffect, useState } from 'react';

const THEME_KEY = 'karman-theme';
const SYSTEM_PREF_KEY = 'karman-theme-system';

export function useTheme() {
  const [theme, setTheme] = useState('system');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    // Check if we have a saved theme preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to system preference
      setTheme('system');
    }
    setMounted(true);
  }, []);

  // Apply theme to document root
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Handle system theme preference
    const isSystem = theme === 'system';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const actualTheme = isSystem ? (systemPrefersDark ? 'dark' : 'light') : theme;

    // Apply theme classes and variables
    if (actualTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Save theme preference
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  // Watch for system preference changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const actualTheme = mediaQuery.matches ? 'dark' : 'light';
        const root = document.documentElement;
        if (actualTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Theme selector function
  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  // Get current effective theme (light/dark)
  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  return {
    theme,
    setTheme: toggleTheme,
    getEffectiveTheme,
    isDark: getEffectiveTheme() === 'dark',
    isLight: getEffectiveTheme() === 'light',
    isSystem: theme === 'system'
  };
}