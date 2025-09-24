import { useContext } from 'react';
import { ThemeModeContext } from '../providers/ThemeModeProvider';

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode должен использоваться внутри ThemeModeProvider');
  }
  return context;
};
