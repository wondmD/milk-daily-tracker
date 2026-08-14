'use client';

import { Bell, Menu, Plus, UserCircle, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import QuickActionsSheet from './QuickActionsSheet';
import Button from '../ui/Button';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEthiopianDate } from '@/lib/dateFormatter';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const [ethiopianDate, setEthiopianDate] = useState("");
  const { language } = useTranslation();

  useEffect(() => {
    // Generate the real Ethiopian date on the client side to avoid hydration mismatches
    setEthiopianDate(formatEthiopianDate(EthDateTime.now(), language));
  }, [language]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-border bg-surface px-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] sm:gap-x-6 sm:px-6 lg:px-8">
        <button 
          type="button" 
          className="-m-2.5 p-2.5 text-muted md:hidden hover:bg-surface-secondary rounded-md"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between items-center">
          
          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold text-foreground">
              Good morning, {session?.user?.name || 'User'}
            </h2>
            <p className="text-xs text-muted font-medium">
              {ethiopianDate}
            </p>
          </div>

          <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
            
            <div className="hidden md:block">
              <Button 
                variant="primary" 
                size="sm" 
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsQuickActionsOpen(true)}
              >
                Quick Action
              </Button>
            </div>

            <button type="button" className="-m-2.5 p-2.5 text-muted hover:text-foreground relative transition-colors">
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface"></span>
            </button>
            
            <LanguageSwitcher />

            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
            
            <div className="flex items-center gap-x-3">
              {session?.user?.name ? (
                <div className="h-8 w-8 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold text-sm border border-primary-light/50">
                  {session.user.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <UserCircle className="h-8 w-8 text-muted bg-surface-secondary rounded-full" />
              )}
            </div>
            
            <button 
              onClick={() => signOut()}
              className="lg:hidden -m-2.5 p-2.5 text-muted hover:text-danger rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      
      <QuickActionsSheet 
        isOpen={isQuickActionsOpen} 
        onClose={() => setIsQuickActionsOpen(false)} 
      />
    </>
  );
}
