'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostics
    console.error('Portal tab client-side exception caught:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '36px 32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          Unable to Load Section Data
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
          A temporary issue occurred while loading this view. The live database may still be syncing or records are being initialized.
        </p>

        {error.message && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: '#475569',
              fontFamily: 'monospace',
              textAlign: 'left',
              marginBottom: 24,
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
          >
            🔄 Try Again
          </button>
          <Link
            href="/portal/dashboard"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-block',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
