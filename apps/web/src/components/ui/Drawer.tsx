'use client';

import React, { useEffect } from 'react';

export interface DrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}

export function Drawer({ isOpen = true, onClose, title, subtitle, children, width = 450, size }: DrawerProps) {
  const finalWidth = size === 'lg' ? 650 : size === 'sm' ? 360 : size === 'xl' ? 800 : width;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(1px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: typeof finalWidth === 'number' ? `min(100vw, ${finalWidth}px)` : finalWidth,
          height: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          borderInlineStart: '1px solid var(--border-default)',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <div
          className="mobile-p-sm"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div>
            {typeof title === 'string' ? (
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div className="mobile-p-sm" style={{ padding: '24px', overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>{children}</div>
      </div>
    </div>
  );
}
