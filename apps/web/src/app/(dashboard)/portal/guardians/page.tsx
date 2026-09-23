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

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGuardians = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/guardians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGuardians(await res.json());
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const handleRegisterGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/guardians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, email, phone, relationship }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Guardian registered successfully!' });
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        fetchGuardians();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to register guardian' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = guardians.filter((g) => {
    const name = `${g.user?.firstName || ''} ${g.user?.lastName || ''}`.toLowerCase();
    const emailStr = (g.user?.email || '').toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || emailStr.includes(query);
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Guardians & Parents' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Guardians & Parents Directory
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Registered student guardians, emergency contacts, and linked student wards
          </p>
        </div>

        <Button variant="primary" leftIcon="➕" onClick={() => { setShowModal(true); setFormMsg(null); }}>
          Register Guardian
        </Button>
      </div>

      <div style={{ marginBottom: 24, maxWidth: 360 }}>
        <Input
          placeholder="Search guardians by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {filtered.length > 0 ? (
          filtered.map((g) => (
            <Card key={g.id} padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--status-info-bg)',
                    color: 'var(--status-info)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {g.user?.firstName?.[0] || 'G'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {g.user?.firstName} {g.user?.lastName}
                  </div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>{g.user?.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {g.relationship || 'Primary Guardian'} • {g.user?.phone || 'No phone'}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 10, fontSize: '0.8125rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Linked Student Wards:</div>
                {g.students?.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {g.students.map((w: any) => (
                      <Badge key={w.studentId} variant="info" size="sm">
                        🎒 {w.student?.user?.firstName} {w.student?.user?.lastName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>No wards currently linked</span>
                )}
              </div>
            </Card>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isLoading ? 'Loading guardians...' : 'No guardians found.'}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register Guardian"
        maxWidth={460}
      >
        {formMsg && (
          <Alert variant={formMsg.type} style={{ marginBottom: 16 }}>
            {formMsg.text}
          </Alert>
        )}

        <form onSubmit={handleRegisterGuardian} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Thomas"
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@school.edu"
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1-555-0188"
          />

          <Input
            label="Relationship to Student"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Mother, Father, Guardian"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Register Guardian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
