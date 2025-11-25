import { ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function AppShell({ children, fullWidth = false }: AppShellProps) {
  return (
    <div className="min-h-screen" style={{ background: fullWidth ? 'transparent' : undefined }}>
      <Header />
      <main className={fullWidth ? '' : 'container mx-auto px-4 py-6 bg-background'}>
        {children}
      </main>
    </div>
  );
}
