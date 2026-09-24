'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error caught:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '36px 32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎓</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          Beacon Horizon Academy Portal
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
          An unexpected error occurred. Please try reloading or head to the login screen.
        </p>

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
            }}
          >
            🔄 Reload
          </button>
          <Link
            href="/login"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-block',
            }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
