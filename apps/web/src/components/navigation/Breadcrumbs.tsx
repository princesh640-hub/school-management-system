'use client';

import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumbs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        marginBottom: 16,
      }}
    >
      <Link
        href="/portal/dashboard"
        style={{
          textDecoration: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Portal
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <span style={{ color: 'var(--border-default)' }}>/</span>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
