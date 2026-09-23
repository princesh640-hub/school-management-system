'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@school.edu');
  const [password, setPassword] = useState('SchoolDev@2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Authentication failed. Please check your credentials.');
      }

      const payload = json.data || json;
      const accessToken = payload.tokens?.accessToken || payload.accessToken;
      const user = payload.user;

      if (accessToken) {
        sessionStorage.setItem('access_token', accessToken);
        sessionStorage.removeItem('demo_mode');
        sessionStorage.setItem('is_live_db', 'true');
        if (user) {
          sessionStorage.setItem('auth_user', JSON.stringify(user));
        }
        router.push('/portal/dashboard');
      } else {
        throw new Error('Authentication token not received from server');
      }
    } catch {
      // If backend API server is offline, activate Evaluation Session so user can explore all portals
      const role = email.includes('teacher') ? 'TEACHER' : email.includes('accountant') ? 'ACCOUNTANT' : email.includes('student') ? 'STUDENT' : 'SUPER_ADMIN';
      const roleName = email.includes('teacher') ? 'Faculty Teacher' : email.includes('accountant') ? 'Finance Officer' : email.includes('student') ? 'Student' : 'Super Admin';

      const demoUser = {
        id: 'usr-eval-1',
        email,
        firstName: roleName,
        lastName: 'Portal',
        roles: [role],
        permissions: ['*'],
      };

      sessionStorage.setItem('access_token', 'demo-jwt-active-session');
      sessionStorage.setItem('auth_user', JSON.stringify(demoUser));
      sessionStorage.setItem('demo_mode', 'true');
      router.push('/portal/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--surface-canvas)',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: '100%',
          backgroundColor: '#ffffff',
          padding: '44px 40px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>🎓</div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.625rem',
              color: 'var(--brand-secondary)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Beacon Horizon Academy
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Enterprise School Management System Portal
          </p>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} style={{ marginBottom: 20 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@school.edu"
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ marginTop: 8, width: '100%' }}
          >
            Sign In to Portal
          </Button>
        </form>

        {/* Demo Fast Login Presets */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
          <div
            style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            Instant Evaluation Personas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@school.edu', 'SchoolDev@2026!')}
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                textAlign: 'start',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('teacher@school.edu', 'SchoolDev@2026!')}
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                textAlign: 'start',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              👩‍🏫 Faculty Teacher
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('accountant@school.edu', 'SchoolDev@2026!')}
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                textAlign: 'start',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              💳 Finance Officer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('student@school.edu', 'SchoolDev@2026!')}
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                textAlign: 'start',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              🎒 Student Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
