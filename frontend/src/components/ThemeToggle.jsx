import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('sm_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('sm_theme', theme);
    } catch {
      // The theme still applies for this session if storage is unavailable.
    }
  }, [isDarkMode]);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-pressed={isDarkMode}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      onClick={() => setIsDarkMode((current) => !current)}
    >
      <span className="theme-toggle-knob" aria-hidden="true" />
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDarkMode ? '☀' : '☾'}
      </span>
    </button>
  );
}