'use client';

import { useState, useEffect } from 'react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEthiopianDate } from '@/lib/dateFormatter';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const [ethiopianDate, setEthiopianDate] = useState("");
  const { language } = useTranslation();

  useEffect(() => {
    setEthiopianDate(formatEthiopianDate(EthDateTime.now(), language));
  }, [language]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20 shadow-sm hidden sm:inline-block">
            {ethiopianDate}
          </span>
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        {/* Mobile date display */}
        <div className="mt-2 sm:hidden inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
          {ethiopianDate}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
