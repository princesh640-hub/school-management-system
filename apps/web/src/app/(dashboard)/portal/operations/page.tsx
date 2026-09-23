'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';

const OPERATIONS_TABS = [
  { id: 'library', label: 'Library & Media Center', badge: 'Active' },
  { id: 'transport', label: 'Transport & Fleet', badge: 'Active' },
  { id: 'hostel', label: 'Hostel & Housing', badge: 'Active' },
  { id: 'inventory', label: 'Inventory & Assets', badge: 'Active' },
];

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState('library');
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'Finance & Operations', href: '#' },
              { label: 'Campus Operations Hub' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              Campus Operations & Logistics
            </h1>
            <Badge variant="info" text="Phase 4 Module Architecture" />
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Central administrative portal for Library, Transport, Dormitories, and Institutional Inventory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => alert('Phase 4 Specifications: MinIO asset storage, GPS telemetry WebSockets, and RFID checkout.')}>
            Operational Spec
          </Button>
          <Button variant="primary" onClick={() => alert('Operations provisioning workflow will activate in Phase 4.')}>
            + Provision Service
          </Button>
        </div>
      </div>

      {showAlert && (
        <Alert
          variant="info"
          title="Phase 4 Logistics Foundation Notice"
          onClose={() => setShowAlert(false)}
        >
          These specialized operational modules are planned for Phase 4 feature expansion.
          The interactive interfaces below demonstrate the finalized UI/UX architecture, tab structures,
          and domain data models ready for backend micro-table synchronization.
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Card bodyStyle={{ padding: '0.75rem 1rem 0' }}>
        <Tabs
          tabs={OPERATIONS_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </Card>

      {/* Tab: Library */}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Cataloged Titles
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                14,250
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success-600)' }}>
                Across 8 academic disciplines
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Active Loans
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-600)', margin: '0.25rem 0' }}>
                342
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Checked out to students & staff
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Overdue Volumes
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger-600)', margin: '0.25rem 0' }}>
                18
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>
                Fine notices automatically queued
              </div>
            </Card>
          </div>

          <Card
            title="Library Catalog & Circulation Registry"
            subtitle="Search ISBN, Dewey Decimal number, author, or barcode"
            headerAction={
              <a href="/portal/library" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Launch Full Library Workspace →
                </Button>
              </a>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { title: 'Principles of Modern Physics (Vol II)', author: 'Halliday & Resnick', isbn: '978-0470547946', dewey: '530.1 HAL', stock: 14, loaned: 4, available: 10 },
                { title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '978-1285741550', dewey: '515.1 STE', stock: 22, loaned: 18, available: 4 },
                { title: 'Organic Chemistry: Structure & Function', author: 'K. Peter C. Vollhardt', isbn: '978-1464120275', dewey: '547.0 VOL', stock: 8, loaned: 2, available: 6 },
              ].map((book, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-bg)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '1rem' }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                      Author: <strong>{book.author}</strong> | ISBN: <span style={{ fontFamily: 'monospace' }}>{book.isbn}</span> | Classification: <span style={{ fontFamily: 'monospace' }}>{book.dewey}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'end' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success-700)' }}>
                        {book.available} Available
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                        Total Copies: {book.stock}
                      </div>
                    </div>
                    <Badge variant="success" text="In Circulation" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Transport */}
      {activeTab === 'transport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Transport & Fleet Management"
            subtitle="School bus fleet, routes, drivers, student assignments, schedules, maintenance and incident management"
            headerAction={
              <a href="/portal/transport" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Launch Transport Workspace →
                </Button>
              </a>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Vehicles', desc: 'Buses, vans & fleet', icon: '🚌' },
                  { label: 'Drivers', desc: 'Licensed personnel', icon: '👨‍✈️' },
                  { label: 'Routes', desc: 'With GPS-ready stops', icon: '🗺️' },
                  { label: 'Students', desc: 'Assigned commuters', icon: '🎒' },
                  { label: 'Schedules', desc: 'Daily trip management', icon: '📅' },
                  { label: 'Maintenance', desc: 'Service & fuel tracking', icon: '🔧' },
                ].map((f, i) => (
                  <a key={i} href="/portal/transport" style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '1.25rem',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '0.9375rem' }}>{f.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>{f.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
              <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-200)' }}>
                <div style={{ fontWeight: 600, color: 'var(--success-800)', marginBottom: '0.25rem' }}>✅ Phase 4J Transport Management — Active</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--success-700)' }}>
                  Full fleet management, route planning, student assignments, boarding tracking, maintenance scheduling, fuel records and incident management are now operational.
                  GPS-ready fields are available. No fake live-tracking simulation is displayed.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Hostel */}
      {activeTab === 'hostel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Hostel & Housing Management"
            subtitle="Campus residential wings, room inventory, bed allocation, night roll call, curfews, visitors, and facility maintenance"
            headerAction={
              <a href="/portal/hostel" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Launch Hostel Workspace →
                </Button>
              </a>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Hostels & Wings', desc: 'Buildings & dormitories', icon: '🏢' },
                  { label: 'Rooms & Beds', desc: 'Capacity & bed matrix', icon: '🛏️' },
                  { label: 'Allocations', desc: 'Resident check-in/out', icon: '📋' },
                  { label: 'Night Roll Call', desc: 'Evening attendance roster', icon: '🌙' },
                  { label: 'Outings & Curfew', desc: 'Leave requests & tracking', icon: '🚶' },
                  { label: 'Maintenance', desc: 'Facility repairs & upkeep', icon: '🔧' },
                ].map((f, i) => (
                  <a key={i} href="/portal/hostel" style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '1.25rem',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '0.9375rem' }}>{f.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>{f.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
              <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-200)' }}>
                <div style={{ fontWeight: 600, color: 'var(--success-800)', marginBottom: '0.25rem' }}>✅ Phase 4K Hostel Management — Active</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--success-700)' }}>
                  Multi-campus hostel facility hierarchies, room/bed capacity management, student allocations, night roll-call attendance, curfew outing approvals, visitor registries, and maintenance operations are fully functional.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Inventory */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Asset Valuation
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                $485,200
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Audited institutional equipment
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Depreciation Cycle
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-600)', margin: '0.25rem 0' }}>
                Straight Line
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Annual fiscal audit aligned
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Low Stock Alerts
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-600)', margin: '0.25rem 0' }}>
                4 Items
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning-600)' }}>
                Requisitions pending approval
              </div>
            </Card>
          </div>

          <Card
            title="School Inventory & Institutional Procurement"
            subtitle="Central inventory controls, warehouse balances, transfers, purchasing, and goods receipts"
            headerAction={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href="/portal/inventory" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm">
                    Launch Inventory Workspace →
                  </Button>
                </a>
                <a href="/portal/procurement" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">
                    Procurement Hub →
                  </Button>
                </a>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Item Catalog', desc: 'SKUs, UOMs & categories', icon: '📦', href: '/portal/inventory' },
                  { label: 'Warehouses', desc: 'Multi-store & shelf bins', icon: '🏬', href: '/portal/inventory' },
                  { label: 'Stock Movements', desc: 'Audit-trailed ledger', icon: '📝', href: '/portal/inventory' },
                  { label: 'Stock Transfers', desc: 'Inter-store dispatch', icon: '⇄', href: '/portal/inventory' },
                  { label: 'Purchasing', desc: 'Requisitions & POs', icon: '🛒', href: '/portal/procurement' },
                  { label: 'Goods Receipts', desc: 'GRN intake & inspection', icon: '🚚', href: '/portal/procurement' },
                ].map((f, i) => (
                  <a key={i} href={f.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '1.25rem',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '0.9375rem' }}>{f.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>{f.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
              <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-200)' }}>
                <div style={{ fontWeight: 600, color: 'var(--success-800)', marginBottom: '0.25rem' }}>✅ Phase 4L Inventory & Procurement — Active</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--success-700)' }}>
                  Full multi-campus store hierarchies, immutable stock movement ledger, inter-store transfers, physical stock takes, automated reorder scanning, purchase requests, vendor purchase orders, goods receipts (GRN), and finance invoice references are operational.
                </div>
              </div>
            </div>
          </Card>
          <Card title="Sample Institutional Equipment Catalog" subtitle="Laboratory equipment, computing hardware, campus furniture, and sports gear">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { item: 'Dell OptiPlex 7090 Desktop Towers', cat: 'IT & Computing', qty: 65, location: 'Computer Lab 1 & 2', value: '$45,500', status: 'IN_SERVICE' },
                { item: 'Olympus CX23 Binocular Microscopes', cat: 'Biology Laboratory', qty: 30, location: 'Bio-Lab Wing B', value: '$22,800', status: 'IN_SERVICE' },
                { item: 'Interactive Smartboards (75-inch 4K)', cat: 'Classroom AV', qty: 24, location: 'Academic Block Halls', value: '$48,000', status: 'IN_SERVICE' },
              ].map((asset, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-bg)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '1rem' }}>
                      {asset.item}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                      Category: <strong>{asset.cat}</strong> | Location: <strong>{asset.location}</strong> | Qty: {asset.qty} Units
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'end' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-900)' }}>
                        {asset.value}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                        Book Valuation
                      </div>
                    </div>
                    <Badge variant="success" text={asset.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
