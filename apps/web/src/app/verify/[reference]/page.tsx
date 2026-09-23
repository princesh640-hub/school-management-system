'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';

interface VerificationResult {
  isValid: boolean;
  certificateNumber: string;
  certificateType: string;
  recipientName: string;
  issuedDate: string;
  expiryDate?: string | null;
  status: string;
  issuingInstitution: string;
  campusName?: string;
  isRevoked: boolean;
  revocationReason?: string | null;
  revokedAt?: string | null;
  verifiedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function CertificateVerificationPage() {
  const params = useParams();
  const reference = params?.reference as string;

  const [data, setData] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;

    const verify = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/certificates/verify/${encodeURIComponent(reference)}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          const err = await res.json();
          setError(err.message || 'Unable to verify certificate. The reference code is invalid or does not exist.');
        }
      } catch {
        setError('Network error connecting to official verification registry.');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [reference]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Verification Portal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '28px',
              marginBottom: '12px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            🎓
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Official Certificate Verification Portal
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Tamper-proof cryptographic validation registry
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              <p style={{ margin: 0, fontWeight: 500 }}>Validating digital signature & credentials...</p>
            </div>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <Card>
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626', margin: '0 0 8px 0' }}>
                Verification Failed
              </h2>
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '20px' }}>
                {error}
              </p>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#991b1b',
                  fontFamily: 'monospace',
                }}
              >
                Reference: {reference}
              </div>
            </div>
          </Card>
        )}

        {/* Success / Result State */}
        {!isLoading && data && (
          <Card>
            <div style={{ padding: '32px' }}>
              {/* Authenticity Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: data.isValid ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${data.isValid ? '#bbf7d0' : '#fecaca'}`,
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '28px' }}>{data.isValid ? '✅' : '⚠️'}</div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: data.isValid ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {data.isValid ? 'Authentic & Valid Certificate' : 'Certificate Invalid / Revoked'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Issued by {data.issuingInstitution}
                  </div>
                </div>
              </div>

              {/* Certificate Details Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Certificate Number:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    {data.certificateNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Certificate Type:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.certificateType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Recipient Name:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.recipientName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Issue Date:</span>
                  <span style={{ color: '#0f172a' }}>{data.issuedDate.split('T')[0]}</span>
                </div>
                {data.expiryDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Expiry Date:</span>
                    <span style={{ color: '#0f172a' }}>{data.expiryDate.split('T')[0]}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Official Status:</span>
                  <Badge variant={data.status === 'ISSUED' ? 'success' : 'danger'}>
                    {data.status}
                  </Badge>
                </div>
                {data.isRevoked && (
                  <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', marginTop: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#b91c1c', display: 'block', marginBottom: '4px' }}>
                      Revocation Details:
                    </span>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d' }}>
                      {data.revocationReason || 'Revoked by institutional authority.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Privacy Notice */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                Verified against cryptographic public register on {new Date(data.verifiedAt).toLocaleString()}.
                Personal, academic performance, and financial data are strictly protected and never displayed publicly.
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
