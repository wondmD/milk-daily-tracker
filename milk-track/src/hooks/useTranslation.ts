import { useContext } from 'react';
import { LanguageContext } from '@/providers/LanguageProvider';
import { en } from '@/locales/en';
import { am } from '@/locales/am';
import { om } from '@/locales/om';

const dictionaries = {
  en,
  am,
  om,
};

type Dictionary = typeof en;

export const useTranslation = () => {
  const { language, setLanguage } = useContext(LanguageContext);

  const t = (namespace: keyof Dictionary, key: string): string => {
    const dict = dictionaries[language] as any;
    
    // Fallback to English if translation is missing
    if (!dict[namespace] || !dict[namespace][key]) {
      return dictionaries['en'][namespace][key as keyof typeof en[typeof namespace]] || `${namespace}.${key}`;
    }
    
    return dict[namespace][key];
  };

  return { t, language, setLanguage };
};
