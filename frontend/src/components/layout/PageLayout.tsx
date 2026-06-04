'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
