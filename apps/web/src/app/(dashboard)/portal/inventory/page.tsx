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
import { DataTable, Column } from '@/components/data-table/DataTable';
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const INVENTORY_TABS = [
  { id: 'overview', label: '📦 Inventory Overview' },
  { id: 'catalog', label: 'Catalog & Items' },
  { id: 'stores', label: 'Warehouses & Stores' },
  { id: 'balances', label: 'Stock Balances' },
  { id: 'movements', label: 'Movement Ledger' },
  { id: 'transfers', label: 'Stock Transfers' },
  { id: 'stocktakes', label: 'Physical Stock Take' },
  { id: 'alerts', label: 'Reorder Alerts' },
];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // State
  const [dashboardKpis, setDashboardKpis] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stockTakes, setStockTakes] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [valuationSummary, setValuationSummary] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemUomId, setItemUomId] = useState('');
  const [itemCost, setItemCost] = useState('0');
  const [itemReorder, setItemReorder] = useState('10');
  const [itemReorderQty, setItemReorderQty] = useState('20');
  const [itemDesc, setItemDesc] = useState('');

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueStoreId, setIssueStoreId] = useState('');
  const [issueItemId, setIssueItemId] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueRecipient, setIssueRecipient] = useState('');
  const [issueRef, setIssueRef] = useState('');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromStore, setTransferFromStore] = useState('');
  const [transferToStore, setTransferToStore] = useState('');
  const [transferItemId, setTransferItemId] = useState('');
  const [transferQty, setTransferQty] = useState('1');

  const [showStockTakeModal, setShowStockTakeModal] = useState(false);
  const [stkStoreId, setStkStoreId] = useState('');
  const [stkNotes, setStkNotes] = useState('');

  // Initial load
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
        itemsRes,
        catsRes,
        uomsRes,
        storesRes,
        balancesRes,
        movementsRes,
        transfersRes,
        stkRes,
        alertsRes,
        valRes,
      ] = await Promise.all([
        fetch(`${API_URL}/inventory/reports/kpis`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/items`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/categories`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/uoms`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/stores`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/balances`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/movements`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/transfers`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/stock-takes`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/reports/low-stock`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
        fetch(`${API_URL}/inventory/reports/valuation`, { credentials: 'omit', headers: getHeaders() }).catch(() => null),
      ]);

      const parseArr = (json: any) => Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.items) ? json.items : []));

      if (kpisRes && kpisRes.ok) setDashboardKpis(await kpisRes.json());
      if (itemsRes && itemsRes.ok) setItems(parseArr(await itemsRes.json()));
      if (catsRes && catsRes.ok) setCategories(parseArr(await catsRes.json()));
      if (uomsRes && uomsRes.ok) setUoms(parseArr(await uomsRes.json()));
      if (storesRes && storesRes.ok) setStores(parseArr(await storesRes.json()));
      if (balancesRes && balancesRes.ok) setBalances(parseArr(await balancesRes.json()));
      if (movementsRes && movementsRes.ok) setMovements(parseArr(await movementsRes.json()));
      if (transfersRes && transfersRes.ok) setTransfers(parseArr(await transfersRes.json()));
      if (stkRes && stkRes.ok) setStockTakes(parseArr(await stkRes.json()));
      if (alertsRes && alertsRes.ok) setLowStockAlerts(parseArr(await alertsRes.json()));
      if (valRes && valRes.ok) setValuationSummary(await valRes.json());
    } catch (err: any) {
      console.error('Failed to load inventory data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inventory/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: itemName,
          itemCode: itemCode || undefined,
          categoryId: itemCatId,
          uomId: itemUomId,
          unitCost: parseFloat(itemCost) || 0,
          reorderLevel: parseFloat(itemReorder) || 0,
          reorderQuantity: parseFloat(itemReorderQty) || 0,
          description: itemDesc,
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Item created successfully' });
        setShowItemModal(false);
        setItemName('');
        setItemCode('');
        setItemDesc('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create item' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inventory/stores`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: storeName,
          code: storeCode,
          address: storeAddress,
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Store created successfully' });
        setShowStoreModal(false);
        setStoreName('');
        setStoreCode('');
        setStoreAddress('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create store' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inventory/movements/issue`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          storeId: issueStoreId,
          itemId: issueItemId,
          quantity: parseFloat(issueQty) || 0,
          recipient: issueRecipient,
          reference: issueRef,
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Stock issued successfully' });
        setShowIssueModal(false);
        setIssueRecipient('');
        setIssueRef('');
        setIssueQty('1');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to issue stock' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inventory/transfers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fromStoreId: transferFromStore,
          toStoreId: transferToStore,
          lines: [{ itemId: transferItemId, quantity: parseFloat(transferQty) || 0 }],
        }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Transfer request created successfully' });
        setShowTransferModal(false);
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to create transfer' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCompleteTransfer = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/inventory/transfers/${id}/complete`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Transfer completed and stock updated' });
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to complete transfer' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleCreateStockTake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inventory/stock-takes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ storeId: stkStoreId, notes: stkNotes }),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Stock take session initialized' });
        setShowStockTakeModal(false);
        setStkNotes('');
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to start stock take' });
      }
    } catch (err: any) {
      setGlobalMsg({ type: 'danger', text: err.message || 'Network error' });
    }
  };

  const handleReconcileStockTake = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/inventory/stock-takes/${id}/reconcile`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setGlobalMsg({ type: 'success', text: 'Stock take reconciled with adjustments applied' });
        loadData();
      } else {
        const err = await res.json();
        setGlobalMsg({ type: 'danger', text: err.message || 'Failed to reconcile stock take' });
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
              { label: 'Inventory Management' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              School Inventory & Warehouse Management
            </h1>
            <Badge variant="success" text="Phase 4L Active" />
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Multi-store tracking, immutable movement ledger, stock transfers, reorder scanning, and physical audits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => setShowIssueModal(true)}>
            - Issue Stock
          </Button>
          <Button variant="outline" onClick={() => setShowTransferModal(true)}>
            ⇄ Transfer Stock
          </Button>
          <Button variant="primary" onClick={() => setShowItemModal(true)}>
            + New Item
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
        <Tabs tabs={INVENTORY_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Catalog Items
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                {dashboardKpis?.totalItems ?? items.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success-600)' }}>
                {dashboardKpis?.activeItems ?? items.length} Active in catalog
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Inventory Valuation
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-600)', margin: '0.25rem 0' }}>
                ${(dashboardKpis?.totalValuation ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Across {dashboardKpis?.totalStores ?? stores.length} stores
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Low Stock Items
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger-600)', margin: '0.25rem 0' }}>
                {dashboardKpis?.lowStockItemsCount ?? lowStockAlerts.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>
                Below configured reorder level
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Active Transfers
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-600)', margin: '0.25rem 0' }}>
                {dashboardKpis?.activeTransfersCount ?? (Array.isArray(transfers) ? transfers : []).filter((t) => t.status === 'PENDING' || t.status === 'IN_TRANSIT').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                Inter-store transfers pending
              </div>
            </Card>
          </div>

          {/* Quick Launch Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <Card
              title="Procurement Subsystem"
              subtitle="Purchase requisitions, supplier orders, GRN receiving, and invoice references"
            >
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', margin: '0.5rem 0 1rem' }}>
                Manage school procurement from initial purchase requests to goods receipts and finance coordination.
              </p>
              <a href="/portal/procurement" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Open Procurement Workspace →
                </Button>
              </a>
            </Card>
            <Card
              title="Stock Take Audit Session"
              subtitle="Periodic physical counts and ledger reconciliations"
            >
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', margin: '0.5rem 0 1rem' }}>
                Conduct scheduled physical verification to identify loss, damage, or surplus variances.
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowStockTakeModal(true)}>
                Start Stock Take Session
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* 2. CATALOG TAB */}
      {activeTab === 'catalog' && (
        <Card
          title="Item Catalog & Master Data"
          subtitle="All items, categorizations, standard UOMs, and reorder policies"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowItemModal(true)}>
              + Add Item
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
                    <th style={{ padding: '0.75rem' }}>Item Code</th>
                    <th style={{ padding: '0.75rem' }}>Name</th>
                    <th style={{ padding: '0.75rem' }}>Category</th>
                    <th style={{ padding: '0.75rem' }}>UOM</th>
                    <th style={{ padding: '0.75rem' }}>Unit Cost</th>
                    <th style={{ padding: '0.75rem' }}>Reorder Level</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{item.itemCode}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '0.75rem' }}>{item.category?.name || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{item.uom?.symbol || item.uom?.name || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>${Number(item.unitCost).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>{item.reorderLevel}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'} text={item.status} />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                        No inventory items cataloged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. STORES TAB */}
      {activeTab === 'stores' && (
        <Card
          title="Campus Stores & Warehouses"
          subtitle="Storage facilities, sub-stores, and physical shelf/bin locations"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowStoreModal(true)}>
              + Add Store
            </Button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {stores.map((s) => (
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
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', fontFamily: 'monospace' }}>{s.code}</div>
                  </div>
                  <Badge variant={s.status === 'ACTIVE' ? 'success' : 'neutral'} text={s.status} />
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
                  {s.address ? `📍 ${s.address}` : 'No address specified'}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                  Locations: {s.locations?.length || 0} racks/bins | Items Tracked: {s._count?.balances || 0}
                </div>
              </div>
            ))}
            {stores.length === 0 && (
              <div style={{ padding: '2rem', color: 'var(--neutral-500)' }}>
                No stores configured. Add a primary school store to begin tracking inventory.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 4. BALANCES TAB */}
      {activeTab === 'balances' && (
        <Card
          title="Current Stock Balances"
          subtitle="Real-time stock on hand, reserved quantities, and available quantities by store"
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Store</th>
                  <th style={{ padding: '0.75rem' }}>Item Code</th>
                  <th style={{ padding: '0.75rem' }}>Item Name</th>
                  <th style={{ padding: '0.75rem' }}>On Hand</th>
                  <th style={{ padding: '0.75rem' }}>Reserved</th>
                  <th style={{ padding: '0.75rem' }}>Available</th>
                  <th style={{ padding: '0.75rem' }}>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => {
                  const onHand = Number(b.quantityOnHand);
                  const reorder = Number(b.item?.reorderLevel || 0);
                  const isLow = onHand <= reorder;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{b.store?.name}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{b.item?.itemCode}</td>
                      <td style={{ padding: '0.75rem' }}>{b.item?.name}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{onHand}</td>
                      <td style={{ padding: '0.75rem' }}>{Number(b.quantityReserved)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--primary-700)' }}>
                        {Number(b.quantityAvailable)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Badge
                          variant={onHand === 0 ? 'danger' : isLow ? 'warning' : 'success'}
                          text={onHand === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'Adequate'}
                        />
                      </td>
                    </tr>
                  );
                })}
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No inventory balances recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. MOVEMENTS TAB */}
      {activeTab === 'movements' && (
        <Card
          title="Stock Movement Ledger"
          subtitle="Audit-trailed immutable records of all receipts, issues, transfers, and adjustments"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowIssueModal(true)}>
              - Issue Stock
            </Button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Movement #</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Store</th>
                  <th style={{ padding: '0.75rem' }}>Item</th>
                  <th style={{ padding: '0.75rem' }}>Quantity</th>
                  <th style={{ padding: '0.75rem' }}>Reference / Recipient</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{m.movementNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(m.movementDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge
                        variant={
                          m.movementType.includes('IN') || m.movementType === 'RECEIPT' || m.movementType === 'OPENING'
                            ? 'success'
                            : 'neutral'
                        }
                        text={m.movementType}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>{m.store?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{m.item?.name}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{Number(m.quantity)}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--neutral-600)' }}>
                      {m.reference || m.recipient || '-'}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. TRANSFERS TAB */}
      {activeTab === 'transfers' && (
        <Card
          title="Inter-Store Stock Transfers"
          subtitle="Manage stock transfers between campuses and store rooms"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowTransferModal(true)}>
              + Request Transfer
            </Button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Transfer #</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>From Store</th>
                  <th style={{ padding: '0.75rem' }}>To Store</th>
                  <th style={{ padding: '0.75rem' }}>Items</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{t.transferNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(t.transferDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{t.fromStore?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{t.toStore?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{t.lines?.length || 0} line(s)</td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge
                        variant={t.status === 'COMPLETED' ? 'success' : t.status === 'CANCELLED' ? 'danger' : 'warning'}
                        text={t.status}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {(t.status === 'PENDING' || t.status === 'IN_TRANSIT') && (
                        <Button variant="primary" size="sm" onClick={() => handleCompleteTransfer(t.id)}>
                          Receive & Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No stock transfers initiated.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 7. STOCK TAKE TAB */}
      {activeTab === 'stocktakes' && (
        <Card
          title="Physical Stock Take Audits"
          subtitle="Physical verification sessions, counted quantities, and variance reconciliation"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => setShowStockTakeModal(true)}>
              + Start Audit Session
            </Button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Audit #</th>
                  <th style={{ padding: '0.75rem' }}>Store</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Items Audited</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stockTakes.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{st.stockTakeNumber}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{st.store?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(st.countDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge variant={st.status === 'COMPLETED' ? 'success' : 'warning'} text={st.status} />
                    </td>
                    <td style={{ padding: '0.75rem' }}>{st.lines?.length || 0} item(s)</td>
                    <td style={{ padding: '0.75rem' }}>
                      {st.status === 'IN_PROGRESS' && (
                        <Button variant="primary" size="sm" onClick={() => handleReconcileStockTake(st.id)}>
                          Reconcile & Apply Variances
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {stockTakes.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                      No physical audits conducted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. ALERTS TAB */}
      {activeTab === 'alerts' && (
        <Card
          title="Low Stock & Reorder Scanner"
          subtitle="Items currently at or below their configured minimum reorder threshold"
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Item Code</th>
                  <th style={{ padding: '0.75rem' }}>Item Name</th>
                  <th style={{ padding: '0.75rem' }}>Current Stock</th>
                  <th style={{ padding: '0.75rem' }}>Reorder Level</th>
                  <th style={{ padding: '0.75rem' }}>Deficit</th>
                  <th style={{ padding: '0.75rem' }}>Recommended Order Qty</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockAlerts.map((alert, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{alert.itemCode}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{alert.name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--danger-600)', fontWeight: 700 }}>
                      {alert.currentStock} {alert.uomSymbol || ''}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{alert.reorderLevel}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--danger-600)' }}>-{alert.deficit}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{alert.reorderQuantity || 20}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <a href="/portal/procurement" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" size="sm">
                          Create Requisition
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
                {lowStockAlerts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--success-700)' }}>
                      ✅ All inventory items are adequately stocked above their reorder thresholds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODALS */}
      {/* 1. Item Modal */}
      {showItemModal && (
        <Modal title="Create Inventory Item" onClose={() => setShowItemModal(false)}>
          <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item Name *</label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. A4 Copy Paper 80gsm" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item Code (Leave blank to auto-generate)</label>
              <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="ITEM-2026-00001" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Category *</label>
              <Select
                value={itemCatId}
                onChange={(e) => setItemCatId(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select category..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Unit of Measure (UOM) *</label>
              <Select
                value={itemUomId}
                onChange={(e) => setItemUomId(e.target.value)}
                options={uoms.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol || u.code})` }))}
                placeholder="Select UOM..."
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Unit Cost ($)</label>
                <Input type="number" step="0.01" value={itemCost} onChange={(e) => setItemCost(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Reorder Level</label>
                <Input type="number" value={itemReorder} onChange={(e) => setItemReorder(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Reorder Qty</label>
                <Input type="number" value={itemReorderQty} onChange={(e) => setItemReorderQty(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Item</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Store Modal */}
      {showStoreModal && (
        <Modal title="Create Store / Warehouse" onClose={() => setShowStoreModal(false)}>
          <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Store Name *</label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Main Campus Central Store" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Store Code *</label>
              <Input value={storeCode} onChange={(e) => setStoreCode(e.target.value)} placeholder="e.g. STR-MAIN-01" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Location / Address</label>
              <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Building C, Ground Floor" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowStoreModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Create Store</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Issue Modal */}
      {showIssueModal && (
        <Modal title="Issue Stock from Store" onClose={() => setShowIssueModal(false)}>
          <form onSubmit={handleIssueStock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Store *</label>
              <Select
                value={issueStoreId}
                onChange={(e) => setIssueStoreId(e.target.value)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select store..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item *</label>
              <Select
                value={issueItemId}
                onChange={(e) => setIssueItemId(e.target.value)}
                options={items.map((i) => ({ value: i.id, label: `${i.itemCode} - ${i.name}` }))}
                placeholder="Select item..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Quantity to Issue *</label>
              <Input type="number" min="1" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Recipient / Department *</label>
              <Input value={issueRecipient} onChange={(e) => setIssueRecipient(e.target.value)} placeholder="e.g. Science Department" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Reference / Reason</label>
              <Input value={issueRef} onChange={(e) => setIssueRef(e.target.value)} placeholder="e.g. Lab Experiment 4" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Issue Stock</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Transfer Modal */}
      {showTransferModal && (
        <Modal title="Create Inter-Store Transfer" onClose={() => setShowTransferModal(false)}>
          <form onSubmit={handleCreateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>From Store *</label>
              <Select
                value={transferFromStore}
                onChange={(e) => setTransferFromStore(e.target.value)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select source store..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>To Store *</label>
              <Select
                value={transferToStore}
                onChange={(e) => setTransferToStore(e.target.value)}
                options={(Array.isArray(stores) ? stores : []).filter((s) => s.id !== transferFromStore).map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select destination store..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Item *</label>
              <Select
                value={transferItemId}
                onChange={(e) => setTransferItemId(e.target.value)}
                options={items.map((i) => ({ value: i.id, label: `${i.itemCode} - ${i.name}` }))}
                placeholder="Select item..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Quantity *</label>
              <Input type="number" min="1" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Create Transfer</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Stock Take Modal */}
      {showStockTakeModal && (
        <Modal title="Start Physical Stock Take" onClose={() => setShowStockTakeModal(false)}>
          <form onSubmit={handleCreateStockTake} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Store to Audit *</label>
              <Select
                value={stkStoreId}
                onChange={(e) => setStkStoreId(e.target.value)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select store..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Audit Notes</label>
              <Input value={stkNotes} onChange={(e) => setStkNotes(e.target.value)} placeholder="e.g. End of Term 1 Physical Count" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="outline" type="button" onClick={() => setShowStockTakeModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Start Session</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
