'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Senior Faculty');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeachers = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, email, phone, designation }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Faculty member registered successfully!' });
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        fetchTeachers();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to register faculty' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = teachers.filter((t) => {
    const fullName = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
    const emailStr = (t.user?.email || '').toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || emailStr.includes(query);
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Faculty & Teachers' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Faculty & Instructors Directory
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Academic instructors, class teacher responsibilities, and course allocations
          </p>
        </div>

        <Button variant="primary" leftIcon="➕" onClick={() => { setShowModal(true); setFormMsg(null); }}>
          Register Faculty
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 24, maxWidth: 360 }}>
        <Input
          placeholder="Search faculty by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Faculty Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {filtered.length > 0 ? (
          filtered.map((t) => (
            <Card key={t.id} padding="md">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    flexShrink: 0,
                  }}
                >
                  {t.user?.firstName?.[0] || 'T'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {t.user?.firstName} {t.user?.lastName}
                  </div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>{t.user?.email}</div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t.designation || 'Academic Instructor'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-default)', fontSize: '0.8125rem' }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Class Teacher: </span>
                  {t.sections?.length > 0 ? (
                    <Badge variant="success" size="sm">
                      {t.sections.map((s: any) => `${s.class?.name} - ${s.name}`).join(', ')}
                    </Badge>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>None assigned</span>
                  )}
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Subjects Taught: </span>
                  {t.subjectTeachers?.length > 0 ? (
                    <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {t.subjectTeachers.map((st: any) => (
                        <Badge key={st.id} variant="info" size="sm">
                          {st.subject?.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>Standard Faculty</span>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isLoading ? 'Loading faculty directory...' : 'No instructors found.'}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register Faculty Member"
        maxWidth={480}
      >
        {formMsg && (
          <Alert variant={formMsg.type} style={{ marginBottom: 16 }}>
            {formMsg.text}
          </Alert>
        )}

        <form onSubmit={handleRegisterTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Katherine"
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Johnson"
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu"
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1-555-0199"
          />

          <Input
            label="Designation / Position"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Register Faculty
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
