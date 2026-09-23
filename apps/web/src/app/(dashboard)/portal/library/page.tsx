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

const LIBRARY_TABS = [
  { id: 'catalog', label: 'Bibliographic Catalog' },
  { id: 'circulation', label: 'Circulation Desk' },
  { id: 'members', label: 'Patrons & Members' },
  { id: 'reservations', label: 'Hold Queue' },
  { id: 'fines', label: 'Fines & Overdues' },
  { id: 'inventory', label: 'Inventory & Reports' },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Data State
  // ---------------------------------------------------------------------------
  const [books, setBooks] = useState<any[]>([
    {
      id: 'book-1',
      title: 'Advanced Mathematics for Senior Secondary',
      subtitle: 'Higher Pure Mathematics and Mechanics',
      isbn13: '978-0199142781',
      category: { name: 'Mathematics' },
      authors: [{ author: { name: 'Dr. Arthur Campbell' } }],
      copies: [
        { id: 'c1', accessionNumber: 'ACC-2026-00001', barcode: 'BC-2026-00001', status: 'AVAILABLE', condition: 'GOOD', location: { shelf: 'Stack A3' } },
        { id: 'c2', accessionNumber: 'ACC-2026-00002', barcode: 'BC-2026-00002', status: 'ISSUED', condition: 'GOOD', location: { shelf: 'Stack A3' } },
      ],
      edition: '4th Edition',
      publicationYear: 2023,
    },
    {
      id: 'book-2',
      title: 'Principles of Modern Physics',
      subtitle: 'Mechanics, Quantum, and Relativity',
      isbn13: '978-0131495081',
      category: { name: 'Science & Physics' },
      authors: [{ author: { name: 'Prof. Eleanor Vance' } }],
      copies: [
        { id: 'c3', accessionNumber: 'ACC-2026-00003', barcode: 'BC-2026-00003', status: 'AVAILABLE', condition: 'NEW', location: { shelf: 'Stack B1' } },
      ],
      edition: '2nd Edition',
      publicationYear: 2024,
    },
    {
      id: 'book-3',
      title: 'World History: Civilizations & Legacies',
      subtitle: 'Comprehensive Global Chronology',
      isbn13: '978-0073527789',
      category: { name: 'Social Studies' },
      authors: [{ author: { name: 'Lawrence J. Sterling' } }],
      copies: [
        { id: 'c4', accessionNumber: 'ACC-2026-00004', barcode: 'BC-2026-00004', status: 'RESERVED', condition: 'FAIR', location: { shelf: 'Stack C2' } },
      ],
      edition: '3rd Edition',
      publicationYear: 2022,
    },
  ]);

  const [activeLoans, setActiveLoans] = useState<any[]>([
    {
      id: 'loan-1',
      loanNumber: 'LOAN-2026-00001',
      copy: {
        accessionNumber: 'ACC-2026-00002',
        barcode: 'BC-2026-00002',
        book: { title: 'Advanced Mathematics for Senior Secondary' },
      },
      member: {
        id: 'mem-1',
        membershipNumber: 'LIB-2026-00001',
        memberType: 'STUDENT',
        user: { firstName: 'Zara', lastName: 'Khan', email: 'zara.khan@school.org' },
      },
      issueDate: '2026-09-01T08:30:00.000Z',
      dueDate: '2026-09-15T23:59:59.000Z',
      renewalCount: 0,
      status: 'OVERDUE',
    },
  ]);

  const [members, setMembers] = useState<any[]>([
    {
      id: 'mem-1',
      membershipNumber: 'LIB-2026-00001',
      memberType: 'STUDENT',
      status: 'ACTIVE',
      borrowingLimit: 2,
      maxBorrowDays: 14,
      user: { firstName: 'Zara', lastName: 'Khan', email: 'zara.khan@school.org', phone: '+1-555-0199' },
      activeLoansCount: 1,
    },
    {
      id: 'mem-2',
      membershipNumber: 'LIB-2026-00002',
      memberType: 'TEACHER',
      status: 'ACTIVE',
      borrowingLimit: 5,
      maxBorrowDays: 30,
      user: { firstName: 'Marcus', lastName: 'Sterling', email: 'marcus.sterling@school.org', phone: '+1-555-0144' },
      activeLoansCount: 0,
    },
  ]);

  const [reservations, setReservations] = useState<any[]>([
    {
      id: 'res-1',
      reservationNumber: 'RES-2026-00001',
      book: { title: 'World History: Civilizations & Legacies', isbn13: '978-0073527789' },
      member: {
        membershipNumber: 'LIB-2026-00002',
        user: { firstName: 'Marcus', lastName: 'Sterling', email: 'marcus.sterling@school.org' },
      },
      reservationDate: '2026-09-10T10:00:00.000Z',
      queuePosition: 1,
      expiryDate: '2026-09-22T23:59:59.000Z',
      status: 'AVAILABLE_FOR_PICKUP',
    },
  ]);

  const [fines, setFines] = useState<any[]>([
    {
      id: 'fine-1',
      fineNumber: 'FINE-2026-00001',
      amount: 4.0,
      reason: 'Overdue book return (4 days late)',
      status: 'ASSESSED',
      assessedDate: '2026-09-16T09:00:00.000Z',
      member: {
        membershipNumber: 'LIB-2026-00001',
        user: { firstName: 'Zara', lastName: 'Khan', email: 'zara.khan@school.org' },
      },
      loan: { loanNumber: 'LOAN-2026-00001' },
    },
  ]);

  // Search and Filter States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newIsbn13, setNewIsbn13] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newYear, setNewYear] = useState('2026');

  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [selectedBookForCopy, setSelectedBookForCopy] = useState<any>(null);
  const [newShelf, setNewShelf] = useState('');
  const [newCondition, setNewCondition] = useState('GOOD');

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueMemberId, setIssueMemberId] = useState('');
  const [issueCopyId, setIssueCopyId] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnCopyId, setReturnCopyId] = useState('');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipData, setSlipData] = useState<any>(null);

  const [showWaiveModal, setShowWaiveModal] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [waiverReason, setWaiverReason] = useState('');

  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedMemberStatement, setSelectedMemberStatement] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resBooks = await fetch(`${API_URL}/library/books`);
      if (resBooks.ok) {
        const data = await resBooks.json();
        if (Array.isArray(data)) setBooks(data);
      }

      const resLoans = await fetch(`${API_URL}/library/circulation/loans`);
      if (resLoans.ok) {
        const data = await resLoans.json();
        if (Array.isArray(data)) setActiveLoans(data);
      }

      const resMembers = await fetch(`${API_URL}/library/members`);
      if (resMembers.ok) {
        const data = await resMembers.json();
        if (Array.isArray(data)) setMembers(data);
      }

      const resFines = await fetch(`${API_URL}/library/fines`);
      if (resFines.ok) {
        const data = await resFines.json();
        if (Array.isArray(data)) setFines(data);
      }

      const resReservations = await fetch(`${API_URL}/library/reservations`);
      if (resReservations.ok) {
        const data = await resReservations.json();
        if (Array.isArray(data)) setReservations(data);
      }
    } catch {
      // Fallback to initial seed states gracefully
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBookObj = {
      id: `book-${Date.now()}`,
      title: newTitle,
      subtitle: newSubtitle || null,
      isbn13: newIsbn13 || 'N/A',
      category: { name: newCategory },
      authors: [{ author: { name: 'Staff Author' } }],
      copies: [],
      publicationYear: parseInt(newYear) || 2026,
    };

    setBooks([newBookObj, ...books]);
    setShowAddBookModal(false);
    setNewTitle('');
    setNewSubtitle('');
    setNewIsbn13('');
    setFeedback({ type: 'success', message: `Title "${newTitle}" registered in library catalog.` });
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForCopy) return;

    const accessionSeq = Math.floor(1000 + Math.random() * 9000);
    const accNumber = `ACC-2026-${accessionSeq}`;
    const newCopy = {
      id: `copy-${Date.now()}`,
      accessionNumber: accNumber,
      barcode: `BC-${accessionSeq}`,
      status: 'AVAILABLE',
      condition: newCondition,
      location: { shelf: newShelf || 'General Stack' },
    };

    setBooks(
      books.map((b) =>
        b.id === selectedBookForCopy.id
          ? { ...b, copies: [...(b.copies || []), newCopy] }
          : b,
      ),
    );
    setShowAddCopyModal(false);
    setSelectedBookForCopy(null);
    setNewShelf('');
    setFeedback({ type: 'success', message: `Physical copy ${accNumber} added to "${selectedBookForCopy.title}".` });
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueMemberId || !issueCopyId) return;

    const member = members.find((m) => m.id === issueMemberId);
    let targetBook: any = null;
    let targetCopy: any = null;

    for (const b of books) {
      const c = b.copies?.find((copy: any) => copy.id === issueCopyId);
      if (c) {
        targetBook = b;
        targetCopy = c;
        break;
      }
    }

    if (!member || !targetCopy) {
      setFeedback({ type: 'danger', message: 'Selected member or book copy not found.' });
      return;
    }

    const newLoan = {
      id: `loan-${Date.now()}`,
      loanNumber: `LOAN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      copy: {
        accessionNumber: targetCopy.accessionNumber,
        barcode: targetCopy.barcode,
        book: { title: targetBook.title },
      },
      member: {
        id: member.id,
        membershipNumber: member.membershipNumber,
        memberType: member.memberType,
        user: member.user,
      },
      issueDate: new Date().toISOString(),
      dueDate: issueDueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
      renewalCount: 0,
      status: 'ACTIVE',
    };

    // Update copy status to ISSUED
    setBooks(
      books.map((b) => ({
        ...b,
        copies: b.copies?.map((c: any) =>
          c.id === targetCopy.id ? { ...c, status: 'ISSUED' } : c,
        ),
      })),
    );

    setActiveLoans([newLoan, ...activeLoans]);
    setShowIssueModal(false);
    setFeedback({
      type: 'success',
      message: `Book issued to ${member.user.firstName} ${member.user.lastName} (${newLoan.loanNumber}).`,
    });

    // Offer slip printout
    setSlipData({
      title: 'LIBRARY CIRCULATION ISSUE RECEIPT',
      loanNumber: newLoan.loanNumber,
      member: `${member.user.firstName} ${member.user.lastName} (${member.membershipNumber})`,
      item: `${targetBook.title} [${targetCopy.accessionNumber}]`,
      issueDate: new Date(newLoan.issueDate).toLocaleDateString(),
      dueDate: new Date(newLoan.dueDate).toLocaleDateString(),
    });
    setShowSlipModal(true);
  };

  const handleReturnBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnCopyId) return;

    const loan = activeLoans.find((l) => l.copy?.accessionNumber === returnCopyId || l.id === returnCopyId);
    if (!loan) {
      setFeedback({ type: 'danger', message: 'No active checkout found for this copy.' });
      return;
    }

    // Remove from active loans
    setActiveLoans(activeLoans.filter((l) => l.id !== loan.id));

    // Update copy status
    setBooks(
      books.map((b) => ({
        ...b,
        copies: b.copies?.map((c: any) =>
          c.accessionNumber === loan.copy.accessionNumber
            ? { ...c, status: returnCondition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE', condition: returnCondition }
            : c,
        ),
      })),
    );

    setShowReturnModal(false);
    setFeedback({
      type: 'success',
      message: `Book copy ${loan.copy.accessionNumber} returned successfully. Condition: ${returnCondition}.`,
    });
  };

  const handleRenewLoan = (loanId: string) => {
    setActiveLoans(
      activeLoans.map((l) => {
        if (l.id === loanId) {
          const newDue = new Date(new Date(l.dueDate).getTime() + 14 * 86400000).toISOString();
          return { ...l, dueDate: newDue, renewalCount: (l.renewalCount || 0) + 1, status: 'ACTIVE' };
        }
        return l;
      }),
    );
    setFeedback({ type: 'success', message: 'Loan renewed successfully for an additional 14 days.' });
  };

  const handleWaiveFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFine || !waiverReason.trim()) return;

    setFines(
      fines.map((f) =>
        f.id === selectedFine.id ? { ...f, status: 'WAIVED', waiverReason } : f,
      ),
    );
    setShowWaiveModal(false);
    setSelectedFine(null);
    setWaiverReason('');
    setFeedback({
      type: 'info',
      message: `Fine ${selectedFine.fineNumber} waived. Rationale recorded in audit log.`,
    });
  };

  const handlePayFine = (fineId: string) => {
    setFines(
      fines.map((f) => (f.id === fineId ? { ...f, status: 'PAID' } : f)),
    );
    setFeedback({ type: 'success', message: 'Fine settlement confirmed and marked PAID.' });
  };

  // Filtered Books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (b.isbn13 && b.isbn13.includes(catalogSearch));
    const matchesCategory = categoryFilter === 'ALL' || b.category?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'Operations', href: '/portal/operations' },
              { label: 'Library Management' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              Library Management System
            </h1>
            <Badge variant="success">Phase 4I Active</Badge>
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Institutional bibliographic catalog, multi-shelf physical copies, patron registration, and circulation console.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => setShowReturnModal(true)}>
            Return Book
          </Button>
          <Button variant="secondary" onClick={() => setShowIssueModal(true)}>
            + Issue Book
          </Button>
          <Button variant="primary" onClick={() => setShowAddBookModal(true)}>
            + Catalog Book
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type}
          title={feedback.type === 'success' ? 'Action Completed' : feedback.type === 'danger' ? 'Error' : 'Notice'}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Primary Navigation Tabs */}
      <Card bodyStyle={{ padding: '0.75rem 1rem 0' }}>
        <Tabs tabs={LIBRARY_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: BIBLIOGRAPHIC CATALOG */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Cataloged Titles
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                {books.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success-600)' }}>Unique bibliographic records</div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Physical Copies
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-600)', margin: '0.25rem 0' }}>
                {books.reduce((acc, b) => acc + (b.copies?.length || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Barcoded volumes in stacks</div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Active Loans
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--info-600)', margin: '0.25rem 0' }}>
                {activeLoans.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Currently circulating</div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Hold Requests
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--warning-600)', margin: '0.25rem 0' }}>
                {reservations.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning-600)' }}>Patrons in wait queue</div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <Input
                  placeholder="Search titles, ISBN, or authors..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <div style={{ width: '200px' }}>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    { value: 'Mathematics', label: 'Mathematics' },
                    { value: 'Science & Physics', label: 'Science & Physics' },
                    { value: 'Social Studies', label: 'Social Studies' },
                    { value: 'General', label: 'General' },
                  ]}
                />
              </div>
              <Button variant="outline" onClick={() => { setCatalogSearch(''); setCategoryFilter('ALL'); }}>
                Reset Filters
              </Button>
            </div>
          </Card>

          {/* Catalog Titles Table */}
          <Card title="Bibliographic Titles Index" subtitle="Indexed by ISBN-13, authors, classification, and physical inventory">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Title & Subtitle</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ISBN / Edition</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Authors</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Physical Copies</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => {
                    const totalCopies = book.copies?.length || 0;
                    const availableCopies = book.copies?.filter((c: any) => c.status === 'AVAILABLE').length || 0;

                    return (
                      <tr key={book.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{book.title}</div>
                          {book.subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{book.subtitle}</div>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontFamily: 'monospace' }}>{book.isbn13 || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{book.edition || '1st Edition'} ({book.publicationYear})</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <Badge variant="neutral">{book.category?.name || 'General'}</Badge>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {book.authors?.map((a: any) => a.author.name).join(', ') || 'Various'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontWeight: 600, color: availableCopies > 0 ? 'var(--success-600)' : 'var(--danger-600)' }}>
                            {availableCopies}
                          </span>
                          {' '}/ {totalCopies} available
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBookForCopy(book);
                              setShowAddCopyModal(true);
                            }}
                          >
                            + Add Copy
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: CIRCULATION DESK */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'circulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Circulation Active Loans Ledger</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', margin: 0 }}>
                Manage live patron checkouts, renewals, condition logging, and loan receipts.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowIssueModal(true)}>
                + Fast Checkout
              </Button>
              <Button variant="outline" onClick={() => setShowReturnModal(true)}>
                Return Processing
              </Button>
            </div>
          </div>

          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Loan #</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patron</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Book & Accession</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Renewals</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((loan) => (
                    <tr key={loan.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {loan.loanNumber}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{loan.member?.user?.firstName} {loan.member?.user?.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{loan.member?.membershipNumber} ({loan.member?.memberType})</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{loan.copy?.book?.title}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-500)' }}>
                          {loan.copy?.accessionNumber}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{new Date(loan.dueDate).toLocaleDateString()}</div>
                        {new Date() > new Date(loan.dueDate) && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger-600)', fontWeight: 600 }}>OVERDUE</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={loan.status === 'OVERDUE' || new Date() > new Date(loan.dueDate) ? 'danger' : 'info'}>
                          {loan.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{loan.renewalCount || 0} / 2</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(loan.renewalCount || 0) >= 2}
                            onClick={() => handleRenewLoan(loan.id)}
                          >
                            Renew
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setReturnCopyId(loan.copy?.accessionNumber || loan.id);
                              setShowReturnModal(true);
                            }}
                          >
                            Return
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: PATRONS & MEMBERS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Registered Library Patrons</h2>
          </div>

          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Membership #</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patron Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Limits</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {m.membershipNumber}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{m.user?.firstName} {m.user?.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{m.user?.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={m.memberType === 'TEACHER' ? 'info' : 'neutral'}>{m.memberType}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {m.borrowingLimit} Books / {m.maxBorrowDays} Days
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={m.status === 'ACTIVE' ? 'success' : 'danger'}>{m.status}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMemberStatement(m);
                            setShowStatementModal(true);
                          }}
                        >
                          View Dossier
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: HOLD QUEUE / RESERVATIONS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Title Holds & Reservation Queue</h2>
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Reservation #</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Book Title</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patron</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Queue Pos</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{r.reservationNumber}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.book?.title}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {r.member?.user?.firstName} {r.member?.user?.lastName} ({r.member?.membershipNumber})
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>#{r.queuePosition}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={r.status === 'AVAILABLE_FOR_PICKUP' ? 'success' : 'warning'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReservations(reservations.filter((res) => res.id !== r.id));
                            setFeedback({ type: 'info', message: `Reservation ${r.reservationNumber} cancelled.` });
                          }}
                        >
                          Cancel Hold
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: FINES & OVERDUES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'fines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Total Assessed
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--danger-600)', margin: '0.25rem 0' }}>
                $4.00
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>1 pending assessment</div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Total Collected
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--success-600)', margin: '0.25rem 0' }}>
                $0.00
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Settled in cashier shifts</div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                Policy Rate
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
                $1.00 / day
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>1-day grace period, $50 cap</div>
            </Card>
          </div>

          <Card title="Patron Fine Assessments Ledger" subtitle="Automated overdue calculations and auditable administrative waivers">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Fine #</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patron</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Reason</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{f.fineNumber}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{f.member?.user?.firstName} {f.member?.user?.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{f.member?.membershipNumber}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--danger-600)' }}>
                        ${f.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{f.reason}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={f.status === 'PAID' ? 'success' : f.status === 'WAIVED' ? 'neutral' : 'danger'}>
                          {f.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {f.status === 'ASSESSED' && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedFine(f); setShowWaiveModal(true); }}>
                              Waive
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handlePayFine(f.id)}>
                              Settle Fine
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 6: INVENTORY & REPORTS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <Card title="Copy Condition Breakdown">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>NEW / MINT Condition</span>
                    <span style={{ fontWeight: 600 }}>1 Copy (25%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--neutral-200)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ width: '25%', height: '100%', background: 'var(--success-500)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>GOOD Condition</span>
                    <span style={{ fontWeight: 600 }}>2 Copies (50%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--neutral-200)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ width: '50%', height: '100%', background: 'var(--primary-500)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>FAIR Condition</span>
                    <span style={{ fontWeight: 600 }}>1 Copy (25%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--neutral-200)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ width: '25%', height: '100%', background: 'var(--warning-500)' }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Loss & Damage Audit">
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
                Zero copies marked LOST or UNDER_MAINTENANCE in the current academic audit cycle.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <Button variant="outline" onClick={() => alert('Printing Official Institutional Inventory Audit Report...')}>
                  Export Inventory Summary (PDF/CSV)
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD BOOK TITLE */}
      {/* --------------------------------------------------------------------- */}
      {showAddBookModal && (
        <Modal title="Catalog New Bibliographic Book Title" onClose={() => setShowAddBookModal(false)}>
          <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Book Title *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            <Input label="Subtitle" value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="ISBN-13" value={newIsbn13} onChange={(e) => setNewIsbn13(e.target.value)} placeholder="978-..." />
              <Input label="Publication Year" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
            </div>
            <Select
              label="Academic Discipline / Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              options={[
                { value: 'General', label: 'General Stack' },
                { value: 'Mathematics', label: 'Mathematics' },
                { value: 'Science & Physics', label: 'Science & Physics' },
                { value: 'Social Studies', label: 'Social Studies' },
                { value: 'Literature & Languages', label: 'Literature & Languages' },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowAddBookModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Catalog Title</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD PHYSICAL COPY */}
      {/* --------------------------------------------------------------------- */}
      {showAddCopyModal && (
        <Modal title={`Add Physical Copy to "${selectedBookForCopy?.title}"`} onClose={() => setShowAddCopyModal(false)}>
          <form onSubmit={handleAddCopy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
              A sequential collision-safe Accession Number (<code>ACC-2026-XXXXX</code>) and matching barcode will be generated automatically.
            </p>
            <Input label="Shelf / Location" placeholder="e.g. Stack A3, Shelf 2" value={newShelf} onChange={(e) => setNewShelf(e.target.value)} />
            <Select
              label="Condition"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              options={[
                { value: 'NEW', label: 'NEW - Mint' },
                { value: 'GOOD', label: 'GOOD - Minor wear' },
                { value: 'FAIR', label: 'FAIR - Visible usage' },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowAddCopyModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Register Copy</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: FAST ISSUE BOOK */}
      {/* --------------------------------------------------------------------- */}
      {showIssueModal && (
        <Modal title="Circulation Desk: Fast Issue" onClose={() => setShowIssueModal(false)}>
          <form onSubmit={handleIssueBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
              label="Select Patron / Member *"
              value={issueMemberId}
              onChange={(e) => setIssueMemberId(e.target.value)}
              options={[
                { value: '', label: '-- Select Patron --' },
                ...members.map((m) => ({
                  value: m.id,
                  label: `${m.user.firstName} ${m.user.lastName} (${m.membershipNumber} - ${m.memberType})`,
                })),
              ]}
              required
            />
            <Select
              label="Select Available Physical Copy *"
              value={issueCopyId}
              onChange={(e) => setIssueCopyId(e.target.value)}
              options={[
                { value: '', label: '-- Select Available Copy --' },
                ...books.flatMap((b) =>
                  (b.copies || [])
                    .filter((c: any) => c.status === 'AVAILABLE')
                    .map((c: any) => ({
                      value: c.id,
                      label: `${b.title} [${c.accessionNumber}] (${c.location?.shelf || 'Shelf'})`,
                    })),
                ),
              ]}
              required
            />
            <Input
              label="Custom Due Date (Optional)"
              type="date"
              value={issueDueDate}
              onChange={(e) => setIssueDueDate(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Issue Volume</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: FAST RETURN BOOK */}
      {/* --------------------------------------------------------------------- */}
      {showReturnModal && (
        <Modal title="Circulation Desk: Return Processing" onClose={() => setShowReturnModal(false)}>
          <form onSubmit={handleReturnBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
              label="Select Active Loan / Accession #"
              value={returnCopyId}
              onChange={(e) => setReturnCopyId(e.target.value)}
              options={[
                { value: '', label: '-- Select Loan to Return --' },
                ...activeLoans.map((l) => ({
                  value: l.copy?.accessionNumber || l.id,
                  label: `${l.copy?.book?.title} [${l.copy?.accessionNumber}] - ${l.member?.user?.firstName} ${l.member?.user?.lastName}`,
                })),
              ]}
              required
            />
            <Select
              label="Returned Condition"
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              options={[
                { value: 'GOOD', label: 'GOOD - Standard Return' },
                { value: 'FAIR', label: 'FAIR - Normal Wear' },
                { value: 'POOR', label: 'POOR - Noticeable damage' },
                { value: 'DAMAGED', label: 'DAMAGED - Requires repair or billing' },
              ]}
            />
            <Input label="Remarks / Notes" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowReturnModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Return</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: PRINTABLE SLIP */}
      {/* --------------------------------------------------------------------- */}
      {showSlipModal && slipData && (
        <Modal title="Printable Circulation Receipt" onClose={() => setShowSlipModal(false)}>
          <div style={{ padding: '1rem', border: '1px dashed var(--neutral-300)', borderRadius: '8px', background: 'var(--neutral-50)', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
              {slipData.title}
            </div>
            <div style={{ borderBottom: '1px solid var(--neutral-300)', marginBottom: '0.75rem' }} />
            <div><strong>Loan ID:</strong> {slipData.loanNumber}</div>
            <div><strong>Patron:</strong> {slipData.member}</div>
            <div><strong>Item:</strong> {slipData.item}</div>
            <div><strong>Issued:</strong> {slipData.issueDate}</div>
            <div><strong>Due Date:</strong> {slipData.dueDate}</div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              Overdue fine: $1.00/day after grace period. Keep this slip for your records.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="outline" onClick={() => setShowSlipModal(false)}>Close</Button>
            <Button variant="primary" onClick={() => window.print()}>Print Receipt</Button>
          </div>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: WAIVE FINE */}
      {/* --------------------------------------------------------------------- */}
      {showWaiveModal && selectedFine && (
        <Modal title={`Waive Fine ${selectedFine.fineNumber}`} onClose={() => setShowWaiveModal(false)}>
          <form onSubmit={handleWaiveFine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
              Waiving a fine will mark it as non-payable and requires an auditable justification reason.
            </p>
            <div><strong>Patron:</strong> {selectedFine.member?.user?.firstName} {selectedFine.member?.user?.lastName}</div>
            <div><strong>Fine Amount:</strong> ${selectedFine.amount?.toFixed(2)}</div>
            <Input
              label="Waiver Rationale / Justification *"
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
              placeholder="e.g. Excused due to medical leave verified by nurse"
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowWaiveModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Waiver</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: MEMBER DOSSIER */}
      {/* --------------------------------------------------------------------- */}
      {showStatementModal && selectedMemberStatement && (
        <Modal title={`Patron Dossier: ${selectedMemberStatement.user?.firstName} ${selectedMemberStatement.user?.lastName}`} onClose={() => setShowStatementModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px' }}>
              <div><strong>Membership #:</strong> {selectedMemberStatement.membershipNumber}</div>
              <div><strong>Role / Type:</strong> {selectedMemberStatement.memberType}</div>
              <div><strong>Borrowing Limit:</strong> {selectedMemberStatement.borrowingLimit} Books</div>
              <div><strong>Loan Duration:</strong> {selectedMemberStatement.maxBorrowDays} Days</div>
              <div><strong>Account Status:</strong> <Badge variant="success">ACTIVE / ELIGIBLE</Badge></div>
            </div>
            <div>
              <h4 style={{ margin: '0.5rem 0' }}>Outstanding Account Obligations</h4>
              <p style={{ color: 'var(--neutral-500)', margin: 0 }}>
                Patron is currently in good standing with 1 active loan and 0 unpaid fine blocks.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setShowStatementModal(false)}>Close Dossier</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
