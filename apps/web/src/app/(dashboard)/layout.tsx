'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/components/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface-canvas)' }}>
          {/* Sidebar */}
          <Sidebar
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header onMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)} />
            <main
              className="mobile-p-sm"
              style={{
                flex: 1,
                padding: '28px 32px',
                overflowY: 'auto',
                overflowX: 'hidden',
                maxWidth: 1600,
                width: '100%',
                margin: '0 auto',
                boxSizing: 'border-box',
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
