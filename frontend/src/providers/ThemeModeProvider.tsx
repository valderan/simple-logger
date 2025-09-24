import { CssBaseline } from '@mui/material';
import { PaletteMode } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
/* eslint-disable react-refresh/only-export-components */
import { ReactNode, createContext, useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../theme';

export interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
  setMode: (mode: PaletteMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'logger-theme-mode';

export interface ThemeModeProviderProps {
  children: ReactNode;
}

export const ThemeModeProvider = ({ children }: ThemeModeProviderProps): JSX.Element => {
  const [mode, setMode] = useState<PaletteMode>('light');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedMode = window.localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
    if (storedMode === 'light' || storedMode === 'dark') {
      setMode(storedMode);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setMode(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    setMode,
    toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }), [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
