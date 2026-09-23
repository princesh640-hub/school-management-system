'use client';

import React from 'react';

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 'var(--radius-xs)',
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={36} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={24} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={16} />
      <Skeleton width="60%" height={32} />
      <Skeleton width="30%" height={14} />
    </div>
  );
}
