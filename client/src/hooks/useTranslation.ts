import { useCallback } from 'react';
import { translations, TranslationRecord, Locale } from '../localization/translations';
import { useLocalization } from '../providers/LocalizationProvider';

const getFromRecord = (record: TranslationRecord, segments: string[]): string | undefined => {
  let current: string | TranslationRecord | undefined = record;
  for (const segment of segments) {
    if (!current || typeof current === 'string') {
      return typeof current === 'string' ? current : undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
};

const resolveTranslation = (locale: Locale, key: string): string | undefined => {
  const segments = key.split('.');
  return getFromRecord(translations[locale], segments);
};

const formatTemplate = (template: string, values?: Record<string, unknown>): string => {
  if (!values) {
    return template;
  }
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, placeholder) => {
    const value = values[placeholder];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });
};

export const useTranslation = () => {
  const { language, setLanguage } = useLocalization();

  const t = useCallback(
    (key: string, values?: Record<string, unknown>) => {
      const translation = resolveTranslation(language, key) ?? resolveTranslation('en', key) ?? key;
      return formatTemplate(translation, values);
    },
    [language]
  );

  return { t, language, setLanguage };
};
