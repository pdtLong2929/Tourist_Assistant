import './globals.css';
import { Header } from '@/components/layout/Header';
import React from 'react';

export const metadata = {
  title: 'Aetherion - Next Gen Platform',
  description: 'Vehicle booking, renting suggestions, and intelligent tour judging.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0 }}>
        <Header />
        <div style={{ flex: 1, position: 'relative' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
