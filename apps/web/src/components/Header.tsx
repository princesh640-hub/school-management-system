'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { Badge } from './ui/Badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUnread = async () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/notifications?unreadOnly=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
          setNotifications(data.items?.slice(0, 5) || []);
        }
      } catch {
        // Silently skip if network error
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="mobile-p-inline-sm"
      style={{
        height: 64,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 24,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      {/* Left side: Hamburger on mobile + Campus / AY context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            ☰
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Downtown Main Campus
          </div>
          <span className="hide-on-mobile">
            <Badge variant="info" size="sm">
              AY 2026-2027
            </Badge>
          </span>
        </div>
      </div>

      {/* Right side: Search, Notifications & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Global Search Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            backgroundColor: 'var(--surface-canvas)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onClick={() => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (input) input.focus();
          }}
        >
          <span>🔍</span>
          <span className="hide-on-mobile">Search...</span>
          <kbd
            className="hide-on-mobile"
            style={{
              padding: '1px 6px',
              fontSize: '0.75rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-default)',
              borderRadius: 3,
              color: 'var(--text-muted)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationsMenu((prev) => !prev)}
            aria-label="Notifications"
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: 6,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: 'var(--status-danger)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationsMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 320,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px 0',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '4px 16px 10px',
                  borderBottom: '1px solid var(--border-default)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unreadCount} unread</span>
              </div>

              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-default)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.3 }}>
                        {n.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No unread notifications
                  </div>
                )}
              </div>

              <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
                <Link
                  href="/portal/notifications"
                  onClick={() => setShowNotificationsMenu(false)}
                  style={{ fontSize: '0.785rem', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div className="hide-on-mobile" style={{ textAlign: 'start' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {user?.roles?.[0] || 'Administrator'}
              </div>
            </div>
            <span className="hide-on-mobile" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>▼</span>
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 230,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px 0',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.email}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Role: {user?.roles?.[0]}</div>
              </div>

              <Link
                href="/portal/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                ⚙️ Settings & Security
              </Link>

              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--status-danger)',
                  border: 'none',
                  background: 'none',
                  textAlign: 'start',
                  cursor: 'pointer',
                  borderTop: '1px solid var(--border-default)',
                  marginTop: 4,
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
