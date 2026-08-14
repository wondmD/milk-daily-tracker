'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'am', label: 'አማርኛ', short: 'አማ' },
    { code: 'om', label: 'Afaan Oromoo', short: 'OM' },
  ] as const;

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm font-medium text-muted hover:text-foreground hover:bg-surface-secondary transition-colors border border-transparent hover:border-border"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline-block">{currentLang.label}</span>
        <span className="sm:hidden">{currentLang.short}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-[14px] bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black ring-opacity-5 focus:outline-none border border-border z-50 overflow-hidden">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as any);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  language === lang.code
                    ? 'bg-primary-subtle text-primary font-semibold'
                    : 'text-foreground hover:bg-surface-secondary'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
