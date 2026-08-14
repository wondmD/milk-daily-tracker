'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Truck, Plus, FileText } from 'lucide-react';
import { useState } from 'react';
import QuickActionsSheet from './QuickActionsSheet';

const navItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Ops', href: '/collections', icon: Truck },
];

const navItemsRight = [
  { name: 'Contacts', href: '/suppliers', icon: Users },
  { name: 'Reports', href: '/reconciliation', icon: FileText },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 z-40 w-full bg-surface border-t border-border pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <div className="flex h-16 justify-between px-2">
          
          <div className="flex flex-1 justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full px-2 py-1 space-y-1 group transition-colors ${isActive ? 'text-primary' : 'text-muted hover:text-foreground'}`}
                >
                  <item.icon className={`h-6 w-6 ${isActive ? 'fill-primary-light/50 text-primary' : ''}`} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center px-2 relative -top-5">
            <button
              onClick={() => setIsQuickActionsOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-surface hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          <div className="flex flex-1 justify-around">
            {navItemsRight.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full px-2 py-1 space-y-1 group transition-colors ${isActive ? 'text-primary' : 'text-muted hover:text-foreground'}`}
                >
                  <item.icon className={`h-6 w-6 ${isActive ? 'fill-primary-light/50 text-primary' : ''}`} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

        </div>
      </div>

      <QuickActionsSheet 
        isOpen={isQuickActionsOpen} 
        onClose={() => setIsQuickActionsOpen(false)} 
      />
    </>
  );
}
