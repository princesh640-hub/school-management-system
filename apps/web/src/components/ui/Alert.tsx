'use client';

import React from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  type?: AlertVariant;
  title?: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export function Alert({ variant, type, title, message, children, onClose, style }: AlertProps) {
  const actualVariant = variant || type || 'info';
  const getStyles = () => {
    switch (actualVariant) {
      case 'success':
        return {
          bg: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          border: 'rgba(21, 128, 61, 0.25)',
          icon: '✓',
        };
      case 'warning':
        return {
          bg: 'var(--status-warning-bg)',
          color: 'var(--status-warning)',
          border: 'rgba(180, 83, 9, 0.25)',
          icon: '⚠️',
        };
      case 'danger':
        return {
          bg: 'var(--status-danger-bg)',
          color: 'var(--status-danger)',
          border: 'rgba(185, 28, 28, 0.25)',
          icon: '✕',
        };
      case 'info':
      default:
        return {
          bg: 'var(--status-info-bg)',
          color: 'var(--status-info)',
          border: 'rgba(3, 105, 161, 0.25)',
          icon: 'ℹ️',
        };
    }
  };

  const current = getStyles();

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-sm)',
        color: current.color,
        fontSize: '0.875rem',
        ...style,
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{current.icon}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>}
        {(children || message) && <div style={{ lineHeight: 1.4 }}>{children || message}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            background: 'none',
            border: 'none',
            color: 'currentColor',
            cursor: 'pointer',
            padding: 0,
            opacity: 0.7,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
