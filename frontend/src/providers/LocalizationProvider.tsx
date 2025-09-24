import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Locale } from '../localization/translations';

const LANGUAGE_STORAGE_KEY = 'logger_language';

interface LocalizationContextValue {
  language: Locale;
  setLanguage: (language: Locale) => void;
}

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

const getStoredLanguage = (): Locale | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale | null;
  return stored ?? null;
};

export const LocalizationProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [language, setLanguageState] = useState<Locale>(() => getStoredLanguage() ?? 'en');

  const setLanguage = useCallback((nextLanguage: Locale) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      setLanguage
    }),
    [language, setLanguage]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLocalization = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
};
