import React from 'react';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: 1.6 }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 20, marginBottom: 30 }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem' }}>
          Enterprise School Management System
        </h1>
        <p style={{ color: '#64748b', marginTop: 8 }}>
          Phase 1 — Technology, Architecture & Infrastructure Foundation Active
        </p>
      </header>

      <section style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, color: '#1e293b' }}>Architecture & Stack Status</h2>
        <ul style={{ paddingLeft: 20, color: '#334155' }}>
          <li><strong>Web Application:</strong> Next.js 16 (App Router, React 19, TypeScript)</li>
          <li><strong>Backend API:</strong> NestJS + Fastify Adapter (REST API at <code>/api/v1</code>)</li>
          <li><strong>Database:</strong> PostgreSQL 18 with Prisma ORM</li>
          <li><strong>Cache & Queues:</strong> Redis + BullMQ asynchronous worker pipeline</li>
          <li><strong>Object Storage:</strong> MinIO / S3-compatible service abstraction</li>
          <li><strong>Client Foundations:</strong> Next.js Web, Flutter Mobile, Flutter Desktop</li>
          <li><strong>Reverse Proxy:</strong> Nginx with SSL & Rate Limiting</li>
        </ul>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#0f172a' }}>OpenAPI / Swagger</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Interactive documentation available at <code>/docs</code>
          </p>
        </div>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#0f172a' }}>System Health</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Health endpoint active at <code>/api/v1/health</code>
          </p>
        </div>
      </section>
    </main>
  );
}
