'use client';

import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: React.CSSProperties;
}

export function ErrorState({
  title = 'Failed to load data',
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--status-danger-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(185, 28, 28, 0.2)',
        color: 'var(--status-danger)',
        ...style,
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: '0 0 16px', fontSize: '0.875rem', opacity: 0.9, maxWidth: 460 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--status-danger)',
            backgroundColor: '#ffffff',
            color: 'var(--status-danger)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
