'use client';

import React from 'react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormField({
  label,
  required = false,
  error,
  helperText,
  children,
  style,
}: FormFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', ...style }}>
      {label && (
        <label
          style={{
            fontSize: '0.8125rem',
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

      {children}

      {error ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-danger)', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
