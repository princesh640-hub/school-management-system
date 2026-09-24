'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

interface NavLinkItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  allowedRoles?: string[];
}

interface NavGroup {
  title: string;
  items: NavLinkItem[];
  allowedRoles?: string[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/portal/dashboard',
        icon: '📊',
        allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT'],
      },
      {
        label: 'Reports & Analytics',
        href: '/portal/reports',
        icon: '📈',
        allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'ACCOUNTANT'],
      },
    ],
  },
  {
    title: 'Academics & Faculty',
    items: [
      { label: 'Admissions Hub', href: '/portal/admissions', icon: '📋', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Academic Structure', href: '/portal/academics', icon: '🏫', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Student Directory', href: '/portal/students', icon: '🎒', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Student Portal', href: '/portal/student', icon: '🧑‍🎓', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'] },
      { label: 'Faculty Directory', href: '/portal/teachers', icon: '👩‍🏫', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Teacher Portal', href: '/portal/teacher', icon: '👨‍🏫', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Daily Attendance', href: '/portal/attendance', icon: '📅', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT'] },
      { label: 'Exams & Results', href: '/portal/examinations', icon: '📝', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
      { label: 'Class Timetable', href: '/portal/timetable', icon: '⏱️', badge: 'Active', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
    ],
  },
  {
    title: 'Administration & HR',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER'],
    items: [
      { label: 'Staff & HR', href: '/portal/hr', icon: '👥', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Staff Attendance', href: '/portal/hr/attendance', icon: '⏱️', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Leave Management', href: '/portal/hr/leave', icon: '🏖️', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Guardians & Parents', href: '/portal/guardians', icon: '👨‍👩‍👧', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Parent Portal', href: '/portal/parent', icon: '👨‍👩‍👦', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'PARENT'] },
      { label: 'Document Center', href: '/portal/documents', icon: '📁', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Certificates & Printing', href: '/portal/certificates', icon: '🎓', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    title: 'Finance & Operations',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PARENT'],
    items: [
      { label: 'Fees & Invoicing', href: '/portal/fees', icon: '💳', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PARENT'] },
      { label: 'Campus Operations', href: '/portal/operations', icon: '🏢', badge: 'Future', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
    ],
  },
  {
    title: 'System & Security',
    items: [
      { label: 'Communication Hub', href: '/portal/communication', icon: '📢', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT'] },
      { label: 'Notifications', href: '/portal/notifications', icon: '🔔', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT'] },
      { label: 'Integrations & External', href: '/portal/integrations', icon: '🔌', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Settings & Audit', href: '/portal/settings', icon: '⚙️', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userRoles = useMemo(() => {
    if (!user || !user.roles || user.roles.length === 0) {
      return ['SUPER_ADMIN'];
    }
    return user.roles;
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
  }, [userRoles]);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => {
        // Check group level role restriction
        if (group.allowedRoles && !isSuperAdmin) {
          const hasGroupAccess = group.allowedRoles.some((r) => userRoles.includes(r));
          if (!hasGroupAccess) return null;
        }

        // Filter individual items
        const visibleItems = group.items.filter((item) => {
          if (isSuperAdmin || !item.allowedRoles) return true;
          return item.allowedRoles.some((r) => userRoles.includes(r));
        });

        if (visibleItems.length === 0) return null;
        return { ...group, items: visibleItems };
      })
      .filter((g): g is NavGroup => g !== null);
  }, [userRoles, isSuperAdmin]);

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
          {visibleGroups.map((group) => (
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
