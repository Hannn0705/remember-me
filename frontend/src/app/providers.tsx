'use client';

import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'white',
            color: '#333',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />
    </AuthProvider>
  );
}
