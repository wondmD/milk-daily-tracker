'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Droplets, 
  ArchiveRestore,
  Settings,
  LogOut,
  Factory,
  Wallet,
  Receipt,
  Milk,
  Building2,
  FileText,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from '@/hooks/useTranslation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'ADMIN';

  const navGroups: {
    title: string;
    allowedRoles: string[];
    items: {
      name: string;
      href: string;
      icon: any;
      roles?: string[];
    }[];
  }[] = [
    {
      title: 'Dashboard',
      allowedRoles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { name: t('sidebar', 'dashboard'), href: '/', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Operations',
      allowedRoles: ['ADMIN', 'COLLECTION_WORKER', 'DISTRIBUTION_WORKER', 'ACCOUNTANT'],
      items: [
        { name: t('sidebar', 'collections'), href: '/collections', icon: Droplets, roles: ['ADMIN', 'COLLECTION_WORKER'] },
        { name: t('sidebar', 'distributions'), href: '/distributions', icon: Truck, roles: ['ADMIN', 'DISTRIBUTION_WORKER'] },
        { name: t('sidebar', 'reconciliation'), href: '/reconciliation', icon: ArchiveRestore, roles: ['ADMIN', 'ACCOUNTANT'] },
        { name: t('sidebar', 'processing'), href: '/processing', icon: Factory, roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: 'Business',
      allowedRoles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { name: t('sidebar', 'suppliers'), href: '/suppliers', icon: Users, roles: ['ADMIN', 'ACCOUNTANT'] },
        { name: t('sidebar', 'customers'), href: '/customers', icon: Building2, roles: ['ADMIN', 'ACCOUNTANT'] },
        { name: t('sidebar', 'settlements'), href: '/settlements', icon: Wallet, roles: ['ADMIN', 'ACCOUNTANT'] },
        { name: t('sidebar', 'expenses'), href: '/expenses', icon: Receipt, roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: 'Analytics',
      allowedRoles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { name: t('sidebar', 'reports'), href: '/reports', icon: FileText, roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    }
  ];

  // Filter groups and items based on role
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(role))
  })).filter(group => group.items.length > 0 && (group.allowedRoles.includes(role) || role === 'ADMIN'));

  return (
    <div className="flex h-full w-64 flex-col bg-primary border-r border-primary-hover z-30 flex-shrink-0 shadow-sm text-primary-light">
      <div className="flex h-16 items-center justify-between px-6 border-b border-primary-hover">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary-light rounded-lg flex items-center justify-center shadow-sm">
            <Milk className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold !text-white tracking-tight">
            Arkani
          </h1>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden text-primary-light hover:text-white p-1.5 -mr-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6 px-3">
          {filteredNavGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 text-xs font-bold text-primary-light/50 uppercase tracking-wider mb-2">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        isActive 
                          ? 'bg-primary-light text-primary font-bold shadow-sm' 
                          : 'text-primary-light hover:bg-primary-hover hover:text-white font-semibold',
                        'group flex items-center rounded-md px-3 py-2 text-sm transition-all'
                      )}
                    >
                      <item.icon
                        className={cn(
                        isActive ? 'text-primary' : 'text-primary-light/80 group-hover:text-primary-light',
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      
      <div className="border-t border-primary-hover p-4 bg-primary/50">
        {role === 'ADMIN' && (
          <Link href="/settings" className="flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold text-primary-light hover:bg-primary-hover hover:text-white transition-colors">
            <Settings className="mr-3 h-5 w-5 text-primary-light/80" />
            {t('sidebar', 'settings')}
          </Link>
        )}
        <button 
          onClick={() => signOut()}
          className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold text-primary-light hover:bg-danger-subtle hover:text-danger transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-primary-light/80 hover:text-danger" />
          Logout
        </button>
      </div>
    </div>
  );
}
