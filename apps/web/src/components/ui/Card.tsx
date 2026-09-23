'use client';

import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({
  title,
  subtitle,
  actions,
  headerAction,
  children,
  footer,
  padding = 'md',
  style,
  bodyStyle,
  className,
  onClick,
}: CardProps) {
  const resolvedActions = actions ?? headerAction;
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return '12px 16px';
      case 'lg':
        return '24px 28px';
      case 'md':
      default:
        return '18px 22px';
    }
  };

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            {typeof title === 'string' ? (
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </div>
          {resolvedActions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{resolvedActions}</div>}
        </div>
      )}

      <div style={{ padding: getPadding(), flex: 1, ...bodyStyle }}>{children}</div>

      {footer && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-subtle)',
            borderBottomLeftRadius: 'var(--radius-md)',
            borderBottomRightRadius: 'var(--radius-md)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
