'use client';

import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavigation from './MobileNavigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 focus:outline-none scroll-smooth">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>

        <div className="md:hidden">
          <MobileNavigation />
        </div>
      </div>
    </div>
  );
}
