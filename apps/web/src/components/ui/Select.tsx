'use client';

import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'placeholder'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, id, children, required, style, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        {label && (
          <label
            htmlFor={selectId}
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

        <select
          id={selectId}
          ref={ref}
          required={required}
          style={{
            width: '100%',
            padding: '9px 14px',
            backgroundColor: '#ffffff',
            border: `1px solid ${error ? 'var(--status-danger)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.925rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            ...style,
          }}
          {...props}
        >
          {placeholder && <option value="" disabled selected={!props.value}>{placeholder}</option>}
          {Array.isArray(options)
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

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

Select.displayName = 'Select';
