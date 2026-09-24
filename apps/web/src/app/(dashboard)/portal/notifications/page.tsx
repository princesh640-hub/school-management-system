'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/feedback/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Broadcast form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []));
        setNotifications(list);
        setUnreadCount(data.unreadCount || data.data?.unreadCount || 0);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Ignore
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          message,
          targetRole: targetRole || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBroadcastMsg({
          type: 'success',
          text: `Broadcast sent to ${data.recipientsCount || 0} users successfully!`,
        });
        setTitle('');
        setMessage('');
        fetchNotifications();
        setTimeout(() => setShowBroadcastModal(false), 1500);
      } else {
        setBroadcastMsg({ type: 'danger', text: data.message || 'Failed to send broadcast' });
      }
    } catch (err: any) {
      setBroadcastMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const filtered = safeNotifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Notifications' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Institutional Notifications Hub
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            System updates, academic circulars, fee reminders, and campus broadcasts
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark All Read ({unreadCount})
            </Button>
          )}
          <Button variant="primary" size="sm" leftIcon="📢" onClick={() => { setShowBroadcastModal(true); setBroadcastMsg(null); }}>
            Broadcast Notice
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Tabs
          tabs={[
            { id: 'all', label: 'All Notifications', count: notifications.length },
            { id: 'unread', label: 'Unread Only', count: unreadCount },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length > 0 ? (
          filtered.map((n) => (
            <Card
              key={n.id}
              padding="sm"
              style={{
                backgroundColor: n.isRead ? '#ffffff' : 'var(--brand-primary-light)',
                borderColor: n.isRead ? 'var(--border-default)' : 'var(--brand-accent)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge variant={n.type === 'ALERT' ? 'danger' : 'info'} size="sm">
                      {n.type}
                    </Badge>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand-primary)' }} />
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: 6 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                {!n.isRead && (
                  <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(n.id)}>
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="🔔"
            title="Inbox is clear"
            description={isLoading ? 'Fetching notifications...' : 'No notifications matching your current filter.'}
          />
        )}
      </div>

      {/* Broadcast Modal */}
      <Modal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        title="Broadcast Institutional Notice"
        maxWidth={480}
      >
        {broadcastMsg && (
          <Alert variant={broadcastMsg.type} style={{ marginBottom: 16 }}>
            {broadcastMsg.text}
          </Alert>
        )}

        <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Target Audience"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            options={[
              { value: '', label: 'All Users (Staff, Students, Parents)' },
              { value: 'TEACHER', label: 'Faculty & Teachers Only' },
              { value: 'STUDENT', label: 'Enrolled Students Only' },
              { value: 'PARENT', label: 'Parents & Guardians Only' },
            ]}
          />

          <Input
            label="Notice Subject / Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Schedule Update or Campus Holiday"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Notice Message Content *
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed announcement text..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowBroadcastModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isBroadcasting}>
              Transmit Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
