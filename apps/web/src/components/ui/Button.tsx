'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--brand-primary)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--surface-subtle)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        };
      case 'outline':
        return {
          backgroundColor: '#ffffff',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--status-danger)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'success':
        return {
          backgroundColor: 'var(--status-success)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-xs)' };
      case 'md':
        return { padding: '8px 16px', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '1rem', borderRadius: 'var(--radius-md)' };
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.65 : 1,
        boxShadow: variant === 'primary' || variant === 'danger' || variant === 'success' ? 'var(--shadow-sm)' : 'none',
        ...getSizeStyles(),
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'shimmer 1s linear infinite' }} />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
