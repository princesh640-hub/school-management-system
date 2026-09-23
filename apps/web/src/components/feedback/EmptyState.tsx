'use client';

import React from 'react';

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({ icon = '📂', title, description, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-default)',
        ...style,
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 400 }}>
        {description}
      </p>
      {action}
    </div>
  );
}
