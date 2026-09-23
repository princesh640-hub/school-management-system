'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavLinkItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/portal/dashboard', icon: '📊' },
      { label: 'Reports & Analytics', href: '/portal/reports', icon: '📈' },
    ],
  },
  {
    title: 'Academics & Faculty',
    items: [
      { label: 'Admissions Hub', href: '/portal/admissions', icon: '📋' },
      { label: 'Academic Structure', href: '/portal/academics', icon: '🏫' },
      { label: 'Student Directory', href: '/portal/students', icon: '🎒' },
      { label: 'Student Portal', href: '/portal/student', icon: '🧑‍🎓' },
      { label: 'Faculty Directory', href: '/portal/teachers', icon: '👩‍🏫' },
      { label: 'Teacher Portal', href: '/portal/teacher', icon: '👨‍🏫' },
      { label: 'Daily Attendance', href: '/portal/attendance', icon: '📅' },
      { label: 'Exams & Results', href: '/portal/examinations', icon: '📝' },
      { label: 'Class Timetable', href: '/portal/timetable', icon: '⏱️', badge: 'Future' },
    ],
  },
  {
    title: 'Administration & HR',
    items: [
      { label: 'Staff & HR', href: '/portal/hr', icon: '👥' },
      { label: 'Staff Attendance', href: '/portal/hr/attendance', icon: '⏱️' },
      { label: 'Leave Management', href: '/portal/hr/leave', icon: '🏖️' },
      { label: 'Guardians & Parents', href: '/portal/guardians', icon: '👨‍👩‍👧' },
      { label: 'Parent Portal', href: '/portal/parent', icon: '👨‍👩‍👦' },
      { label: 'Document Center', href: '/portal/documents', icon: '📁' },
      { label: 'Certificates & Printing', href: '/portal/certificates', icon: '🎓' },
    ],
  },
  {
    title: 'Finance & Operations',
    items: [
      { label: 'Fees & Invoicing', href: '/portal/fees', icon: '💳' },
      { label: 'Campus Operations', href: '/portal/operations', icon: '🏢', badge: 'Future' },
    ],
  },
  {
    title: 'System & Security',
    items: [
      { label: 'Communication Hub', href: '/portal/communication', icon: '📢' },
      { label: 'Notifications', href: '/portal/notifications', icon: '🔔' },
      { label: 'Integrations & External', href: '/portal/integrations', icon: '🔌' },
      { label: 'Settings & Audit', href: '/portal/settings', icon: '⚙️' },
    ],
  },
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="sidebar-backdrop"
        onClick={onClose}
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 40,
        }}
      />

      <aside
        style={{
          width: 260,
          backgroundColor: 'var(--brand-secondary)',
          color: 'var(--text-inverse)',
          display: 'flex',
          flexDirection: 'column',
          borderInlineEnd: '1px solid var(--brand-secondary-muted)',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 45,
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 22px',
            borderBottom: '1px solid var(--brand-secondary-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.75rem' }}>🎓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.03em' }}>
                BEACON HORIZON
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Enterprise Platform</div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="mobile-close-btn"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Navigation Groups */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflowY: 'auto',
          }}
        >
          {navGroups.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  paddingInline: 12,
                  marginBottom: 6,
                }}
              >
                {group.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose && onClose()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none',
                        fontSize: '0.925rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#ffffff' : '#cbd5e1',
                        backgroundColor: isActive ? 'var(--brand-secondary-muted)' : 'transparent',
                        borderInlineStart: `3px solid ${isActive ? 'var(--brand-accent)' : 'transparent'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.15rem', width: 22, textAlign: 'center' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            color: '#e2e8f0',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Institutional Footer */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--brand-secondary-muted)',
            fontSize: '0.8rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.875rem' }}>Downtown Campus</div>
            <div>AY 2026–2027 Active</div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', backgroundColor: '#15803d', color: '#ffffff', borderRadius: 4 }}>
            LIVE
          </span>
        </div>
      </aside>
    </>
  );
}
