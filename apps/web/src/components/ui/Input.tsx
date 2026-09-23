'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, required, style, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {label}
            {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
          </label>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                insetInlineStart: 12,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            required={required}
            style={{
              width: '100%',
              padding: '9px 14px',
              paddingInlineStart: leftIcon ? 38 : 14,
              paddingInlineEnd: rightIcon ? 38 : 14,
              backgroundColor: '#ffffff',
              border: `1px solid ${error ? 'var(--status-danger)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.925rem',
              color: 'var(--text-primary)',
              ...style,
            }}
            {...props}
          />

          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                insetInlineEnd: 12,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--status-danger)', fontWeight: 500 }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
