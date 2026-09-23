'use client';

import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand'
  | 'primary'
  | 'default'
  | 'outline'
  | 'secondary'
  | (string & {});

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg' | string;
  dot?: boolean;
  text?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  text,
  children,
  style,
}: BadgeProps) {
  const content = children ?? text;
  const getStyles = () => {
    switch (variant) {
      case 'brand':
      case 'primary':
        return { color: 'var(--brand-primary)', backgroundColor: 'var(--surface-subtle)' };
      case 'success':
        return { color: 'var(--status-success)', backgroundColor: 'var(--status-success-bg)' };
      case 'warning':
        return { color: 'var(--status-warning)', backgroundColor: 'var(--status-warning-bg)' };
      case 'danger':
        return { color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' };
      case 'info':
        return { color: 'var(--status-info)', backgroundColor: 'var(--status-info-bg)' };
      case 'outline':
        return { color: 'var(--text-secondary)', backgroundColor: 'transparent', border: '1px solid var(--border-default)' };
      case 'secondary':
      case 'neutral':
      default:
        return { color: 'var(--text-secondary)', backgroundColor: 'var(--surface-subtle)' };
    }
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px' : isLarge ? '6px 14px' : '4px 10px',
        fontSize: isSmall ? '0.75rem' : isLarge ? '0.875rem' : '0.8125rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        ...getStyles(),
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
          }}
        />
      )}
      {content}
    </span>
  );
}
