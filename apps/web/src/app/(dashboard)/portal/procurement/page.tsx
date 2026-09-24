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
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const PROCUREMENT_TABS = [
  { id: 'overview', label: '📊 Procurement Overview' },
  { id: 'requests', label: 'Purchase Requisitions' },
  { id: 'orders', label: 'Purchase Orders' },
  { id: 'receipts', label: 'Goods Receipts (GRN)' },
  { id: 'suppliers', label: 'Supplier Registry' },
  { id: 'invoices', label: 'Invoice References' },
];

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // State
  const [kpis, setKpis] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supCode, setSupCode] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supTaxId, setSupTaxId] = useState('');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [prPurpose, setPrPurpose] = useState('');
  const [prDepartment, setPrDepartment] = useState('');
  const [prPriority, setPrPriority] = useState('MEDIUM');
  const [prItemId, setPrItemId] = useState('');
  const [prItemDesc, setPrItemDesc] = useState('');
  const [prQty, setPrQty] = useState('1');
  const [prUnitPrice, setPrUnitPrice] = useState('');

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poStoreId, setPoStoreId] = useState('');
  const [poItemId, setPoItemId] = useState('');
  const [poItemDesc, setPoItemDesc] = useState('');
  const [poQty, setPoQty] = useState('1');
  const [poPrice, setPoPrice] = useState('0');
  const [poTerms, setPoTerms] = useState('Net 30');

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [grnOrderId, setGrnOrderId] = useState('');
  const [grnStoreId, setGrnStoreId] = useState('');
  const [grnDeliveryNote, setGrnDeliveryNote] = useState('');
  const [grnItemId, setGrnItemId] = useState('');
  const [grnItemDesc, setGrnItemDesc] = useState('');
  const [grnOrderedQty, setGrnOrderedQty] = useState('1');
  const [grnReceivedQty, setGrnReceivedQty] = useState('1');
  const [grnRejectedQty, setGrnRejectedQty] = useState('0');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invNum, setInvNum] = useState('');
  const [invSupplierId, setInvSupplierId] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        kpisRes,
        supRes,
        reqRes,
        ordRes,
        recRes,
        invRes,
        storesRes,
        itemsRes,
      ] = await Promise.all([
        fetch(`${API_URL}/procurement/reports/kpis`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/procurement/suppliers`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/procurement/requests`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/procurement/orders`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/procurement/receipts`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/procurement/invoices`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/stores`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/items`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
      ]);

      const parseArr = (json: any) => Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.items) ? json.items : []));

      if (kpisRes && kpisRes.ok) setKpis(await kpisRes.json());
      if (supRes && supRes.ok) setSuppliers(parseArr(await supRes.json()));
      if (reqRes && reqRes.ok) setRequests(parseArr(await reqRes.json()));
      if (ordRes && ordRes.ok) setOrders(parseArr(await ordRes.json()));
      if (recRes && recRes.ok) setReceipts(parseArr(await recRes.json()));
      if (invRes && invRes.ok) setInvoices(parseArr(await invRes.json()));
      if (storesRes && storesRes.ok) setStores(parseArr(await storesRes.json()));
      if (itemsRes && itemsRes.ok) setItems(parseArr(await itemsRes.json()));
    } catch (err) {
      console.error('Failed to load procurement data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/procurement/suppliers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: supName,
          supplierCode: supCode || undefined,
          contactPerson: supContact,
          phone: supPhone,
          email: supEmail,
          taxId: supTaxId,
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Supplier registered successfully' });
        setShowSupplierModal(false);
        setSupName('');
        setSupCode('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create supplier' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/procurement/requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          purpose: prPurpose,
          department: prDepartment,
          priority: prPriority,
          lines: [
            {
              itemId: prItemId || undefined,
              itemDescription: prItemDesc || 'General item',
              quantity: parseFloat(prQty) || 1,
              estimatedUnitPrice: parseFloat(prUnitPrice) || undefined,
            },
          ],
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Purchase requisition submitted successfully' });
        setShowRequestModal(false);
        setPrPurpose('');
        setPrItemDesc('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create request' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/procurement/requests/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ approvalNotes: 'Requisition approved for procurement' }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Requisition approved' });
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Approval failed' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/procurement/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          supplierId: poSupplierId,
          storeId: poStoreId || undefined,
          terms: poTerms,
          lines: [
            {
              itemId: poItemId || undefined,
              itemDescription: poItemDesc || 'Procured goods',
              orderedQuantity: parseFloat(poQty) || 1,
              unitPrice: parseFloat(poPrice) || 0,
            },
          ],
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Purchase order created in DRAFT' });
        setShowOrderModal(false);
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create order' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/procurement/orders/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Order approved' });
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Approval failed' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleIssueOrder = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/procurement/orders/${id}/issue`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Order issued to supplier' });
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to issue order' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const received = parseFloat(grnReceivedQty) || 0;
      const rejected = parseFloat(grnRejectedQty) || 0;
      const accepted = Math.max(0, received - rejected);

      const res = await fetch(`${API_URL}/procurement/receipts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          purchaseOrderId: grnOrderId,
          storeId: grnStoreId,
          deliveryNoteNumber: grnDeliveryNote,
          lines: [
            {
              itemId: grnItemId || undefined,
              itemDescription: grnItemDesc || 'Received item',
              orderedQuantity: parseFloat(grnOrderedQty) || received,
              receivedQuantity: received,
              rejectedQuantity: rejected,
              acceptedQuantity: accepted,
            },
          ],
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Goods receipt recorded and inventory balances updated' });
        setShowReceiptModal(false);
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to record receipt' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/procurement/invoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          invoiceNumber: invNum,
          invoiceDate: invDate,
          supplierId: invSupplierId,
          amount: parseFloat(invAmount) || 0,
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Supplier invoice reference recorded' });
        setShowInvoiceModal(false);
        setInvNum('');
        setInvAmount('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to record invoice' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'Operations', href: '/portal/operations' },
              { label: 'Procurement' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              Procurement & Purchasing Hub
            </h1>
            <Badge variant="success" text="Phase 4L Active" />
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Purchase requests, purchase orders, goods receipts (GRN), supplier management, and finance references.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => setShowSupplierModal(true)}>
            + Add Supplier
          </Button>
          <Button variant="outline" onClick={() => setShowOrderModal(true)}>
            + Create Order
          </Button>
          <Button variant="primary" onClick={() => setShowRequestModal(true)}>
            + New Requisition
          </Button>
        </div>
      </div>

      {globalMsg && (
        <Alert
          variant={globalMsg.type === 'success' ? 'success' : 'danger'}
          title={globalMsg.type === 'success' ? 'Success' : 'Error'}
          onClose={() => setGlobalMsg(null)}
        >
          {globalMsg.text}
        </Alert>
      )}

      {/* Tabs */}
      <Card bodyStyle={{ padding: '0.75rem 1rem 0' }}>
        <Tabs tabs={PROCUREMENT_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Pending Requests
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-600)', margin: '0.25rem 0' }}>
                {kpis?.pendingRequestsCount ?? (Array.isArray(requests) ? requests : []).filter((r) => r.status === 'SUBMITTED').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Requisitions awaiting approval
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Active Purchase Orders
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                {kpis?.activeOrdersCount ?? (Array.isArray(orders) ? orders : []).filter((o) => ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED'].includes(o.status)).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                In production or delivery
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                PO Commitment Value
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success-700)', margin: '0.25rem 0' }}>
                ${(kpis?.totalOrdersValue ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Approved & issued purchase orders
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Active Suppliers
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                {kpis?.activeSuppliers ?? suppliers.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Registered institutional vendors
              </div>
            </Card>
          </div>

          <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
            <div style={{ fontWeight: 600, color: 'var(--neutral-800)', marginBottom: '0.25rem' }}>
              🔒 Finance Subsystem Boundary Notice
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
              Procurement maintains supplier invoice references (`SINV-YYYY-XXXXX`) linked to Purchase Orders and Goods Receipts.
              Phase 4G Finance remains authoritative for payments, accounts payable disbursements, and general ledger postings.
              Receiving goods or logging an invoice reference does not mark an invoice paid.
            </div>
          </div>
        </div>
      )}

      {/* 2. REQUESTS TAB */}
      {activeTab === 'requests' && (
        <Card
          title="Purchase Requisitions"
          subtitle="Departmental purchase requests and administrative approvals"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowRequestModal(true)}>
              + New Requisition
            </Button>
          }
        >
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Request #</th>
                    <th style={{ padding: '0.75rem' }}>Date</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Purpose</th>
                    <th style={{ padding: '0.75rem' }}>Priority</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{r.requestNumber}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>{r.department || '-'}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{r.purpose}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <Badge
                          variant={r.priority === 'URGENT' ? 'danger' : r.priority === 'HIGH' ? 'warning' : 'neutral'}
                          text={r.priority}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Badge
                          variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}
                          text={r.status}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {r.status === 'SUBMITTED' && (
                          <Button variant="primary" size="sm" onClick={() => handleApproveRequest(r.id)}>
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                        No purchase requisitions submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. ORDERS TAB */}
      {activeTab === 'orders' && (
        <Card
          title="Purchase Orders (PO)"
          subtitle="Contractual purchase orders sent to approved suppliers"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowOrderModal(true)}>
              + Create Purchase Order
            </Button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>PO #</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Supplier</th>
                  <th style={{ padding: '0.75rem' }}>Total Amount</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{po.poNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{po.supplier?.name}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>${Number(po.totalAmount).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge
                        variant={
                          po.status === 'RECEIVED'
                            ? 'success'
                            : po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED'
                            ? 'primary'
                            : po.status === 'APPROVED'
                            ? 'info'
                            : 'neutral'
                        }
                        text={po.status}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {po.status === 'DRAFT' && (
                          <Button variant="outline" size="sm" onClick={() => handleApproveOrder(po.id)}>
                            Approve
                          </Button>
                        )}
                        {po.status === 'APPROVED' && (
                          <Button variant="primary" size="sm" onClick={() => handleIssueOrder(po.id)}>
                            Issue to Supplier
                          </Button>
                        )}
                        {(po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setGrnOrderId(po.id);
                              if (po.storeId) setGrnStoreId(po.storeId);
                              if (po.lines && po.lines[0]) {
                                setGrnItemId(po.lines[0].itemId || '');
                                setGrnItemDesc(po.lines[0].itemDescription);
                                setGrnOrderedQty(String(po.lines[0].orderedQuantity));
                              }
                              setShowReceiptModal(true);
                            }}
                          >
                            Receive Goods
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. RECEIPTS TAB */}
      {activeTab === 'receipts' && (
        <Card
          title="Goods Receipt Notes (GRN)"
          subtitle="Warehouse intake logs, physical inspection verification, and automatic stock ledger updates"
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>GRN #</th>
                  <th style={{ padding: '0.75rem' }}>Received Date</th>
                  <th style={{ padding: '0.75rem' }}>PO Number</th>
                  <th style={{ padding: '0.75rem' }}>Supplier</th>
                  <th style={{ padding: '0.75rem' }}>Store</th>
                  <th style={{ padding: '0.75rem' }}>Delivery Note</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((grn) => (
                  <tr key={grn.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{grn.receiptNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(grn.receivedDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{grn.purchaseOrder?.poNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{grn.supplier?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{grn.store?.name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--neutral-600)' }}>{grn.deliveryNoteNumber || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge variant="success" text={grn.status} />
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No goods receipts logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <Card
          title="Supplier Registry"
          subtitle="Vetted vendors, contractors, contact details, and tax identification"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowSupplierModal(true)}>
              + Add Supplier
            </Button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {suppliers.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-bg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--neutral-900)' }}>{s.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', fontFamily: 'monospace' }}>{s.supplierCode}</div>
                  </div>
                  <Badge variant={s.status === 'ACTIVE' ? 'success' : 'neutral'} text={s.status} />
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
                  👤 Contact: {s.contactPerson || 'None listed'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                  📞 {s.phone || '-'} | ✉️ {s.email || '-'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.5rem' }}>
                  Tax ID: {s.taxId || 'Not registered'}
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <div style={{ padding: '2rem', color: 'var(--neutral-500)' }}>
                No suppliers registered. Add school suppliers to begin purchasing.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 6. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <Card
          title="Supplier Invoice References"
          subtitle="Vendor billing references paired with Purchase Orders for Finance verification"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowInvoiceModal(true)}>
              + Record Invoice Reference
            </Button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Reference #</th>
                  <th style={{ padding: '0.75rem' }}>Invoice #</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Supplier</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{inv.referenceNumber}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.supplier?.name}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      ${Number(inv.amount).toFixed(2)} {inv.currency}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge variant="info" text={inv.status} />
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No supplier invoices referenced yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODALS */}
      {/* 1. Supplier Modal */}
      {showSupplierModal && (
        <Modal title="Register Supplier" onClose={() => setShowSupplierModal(false)}>
          <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Company / Vendor Name *</label>
              <Input value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="e.g. Apex Educational Supplies Ltd" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Supplier Code (Optional)</label>
              <Input value={supCode} onChange={(e) => setSupCode(e.target.value)} placeholder="SUP-2026-00001" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Contact Person</label>
              <Input value={supContact} onChange={(e) => setSupContact(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Phone</label>
                <Input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="+1 555-0199" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email</label>
                <Input type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="orders@apex.com" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Tax / VAT ID</label>
              <Input value={supTaxId} onChange={(e) => setSupTaxId(e.target.value)} placeholder="TAX-9988123" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Supplier</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Request Modal */}
      {showRequestModal && (
        <Modal title="Create Purchase Requisition" onClose={() => setShowRequestModal(false)}>
          <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Requisition Purpose *</label>
              <Input value={prPurpose} onChange={(e) => setPrPurpose(e.target.value)} placeholder="e.g. Science Lab Consumables for Term 2" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Department *</label>
              <Input value={prDepartment} onChange={(e) => setPrDepartment(e.target.value)} placeholder="e.g. Department of Chemistry" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Priority</label>
              <Select
                value={prPriority}
                onChange={(e) => setPrPriority(e.target.value)}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Select Catalog Item (Optional)</label>
              <Select
                value={prItemId}
                onChange={(e) => {
                  setPrItemId(e.target.value);
                  const selected = items.find((i) => i.id === e.target.value);
                  if (selected) {
                    setPrItemDesc(selected.name);
                    setPrUnitPrice(String(selected.unitCost));
                  }
                }}
                options={items.map((i) => ({ value: i.id, label: `${i.itemCode} - ${i.name}` }))}
                placeholder="Select an item..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item Description *</label>
              <Input value={prItemDesc} onChange={(e) => setPrItemDesc(e.target.value)} placeholder="e.g. Borosilicate Test Tubes (Box of 50)" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Quantity *</label>
                <Input type="number" min="1" value={prQty} onChange={(e) => setPrQty(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Est. Unit Price ($)</label>
                <Input type="number" step="0.01" value={prUnitPrice} onChange={(e) => setPrUnitPrice(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowRequestModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Submit Requisition</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Order Modal */}
      {showOrderModal && (
        <Modal title="Create Purchase Order" onClose={() => setShowOrderModal(false)}>
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Supplier *</label>
              <Select
                value={poSupplierId}
                onChange={(e) => setPoSupplierId(e.target.value)}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select supplier..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Destination Store</label>
              <Select
                value={poStoreId}
                onChange={(e) => setPoStoreId(e.target.value)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select store..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Select Catalog Item</label>
              <Select
                value={poItemId}
                onChange={(e) => {
                  setPoItemId(e.target.value);
                  const selected = items.find((i) => i.id === e.target.value);
                  if (selected) {
                    setPoItemDesc(selected.name);
                    setPoPrice(String(selected.unitCost));
                  }
                }}
                options={items.map((i) => ({ value: i.id, label: `${i.itemCode} - ${i.name}` }))}
                placeholder="Select an item..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item Description *</label>
              <Input value={poItemDesc} onChange={(e) => setPoItemDesc(e.target.value)} placeholder="e.g. Science Equipment Pack" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Quantity *</label>
                <Input type="number" min="1" value={poQty} onChange={(e) => setPoQty(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Unit Price ($) *</label>
                <Input type="number" step="0.01" value={poPrice} onChange={(e) => setPoPrice(e.target.value)} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Payment Terms</label>
              <Input value={poTerms} onChange={(e) => setPoTerms(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Create PO</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Goods Receipt Modal */}
      {showReceiptModal && (
        <Modal title="Record Goods Receipt (GRN)" onClose={() => setShowReceiptModal(false)}>
          <form onSubmit={handleCreateReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Delivery Note #</label>
              <Input value={grnDeliveryNote} onChange={(e) => setGrnDeliveryNote(e.target.value)} placeholder="e.g. DN-90218" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Destination Store *</label>
              <Select
                value={grnStoreId}
                onChange={(e) => setGrnStoreId(e.target.value)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select store..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item Description</label>
              <Input value={grnItemDesc} readOnly disabled />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ordered</label>
                <Input value={grnOrderedQty} readOnly disabled />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Received Qty *</label>
                <Input type="number" min="0" value={grnReceivedQty} onChange={(e) => setGrnReceivedQty(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Rejected Qty</label>
                <Input type="number" min="0" value={grnRejectedQty} onChange={(e) => setGrnRejectedQty(e.target.value)} />
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--success-50)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--success-800)' }}>
              ℹ️ Accepted Quantity: <strong>{Math.max(0, (parseFloat(grnReceivedQty) || 0) - (parseFloat(grnRejectedQty) || 0))}</strong> will automatically be credited to store stock balances.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowReceiptModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Complete Receipt</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Invoice Modal */}
      {showInvoiceModal && (
        <Modal title="Record Supplier Invoice Reference" onClose={() => setShowInvoiceModal(false)}>
          <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Supplier *</label>
              <Select
                value={invSupplierId}
                onChange={(e) => setInvSupplierId(e.target.value)}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select supplier..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Vendor Invoice # *</label>
              <Input value={invNum} onChange={(e) => setInvNum(e.target.value)} placeholder="e.g. INV-2026-4401" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Invoice Date *</label>
                <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Amount ($) *</label>
                <Input type="number" step="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Record Reference</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
