import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { RefreshCw } from 'lucide-react';
import ipcService from '@/services/ipcService';
import { useSortableData } from '@/hooks/useSortableData';

function SortHeader({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey;
  const arrow = active ? (sortConfig.direction === 'asc' ? ' [A]' : ' [D]') : '';
  return (
    <th
      className="px-3 py-2 text-left text-xs uppercase text-muted cursor-pointer select-none hover:opacity-80"
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ cname: '', phone: '', address: '' });
  const mountedRef = useRef(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-customers', 'customers-response', undefined);
      if (!mountedRef.current) return;
      setCustomers(result?.success && Array.isArray(result.customers) ? result.customers : []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      if (mountedRef.current) {
        setError('Could not load customers.');
        setCustomers([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchCustomers();
    return () => { mountedRef.current = false; };
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.cname ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.address ?? '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const { sorted: sortedCustomers, sortConfig, requestSort } = useSortableData(filtered);

  const clearForm = () => {
    setEditing(null);
    setForm({ cname: '', phone: '', address: '' });
  };

  const startEdit = (customer) => {
    setEditing(customer.cid);
    setForm({ cname: customer.cname ?? '', phone: customer.phone ?? '', address: customer.address ?? '' });
  };

  const addCustomer = async () => {
    const cname = form.cname.trim();
    if (!cname) { setError('Customer name is required.'); return; }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.requestReply('add-customer', 'customer-added-response', {
        cname,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      if (!mountedRef.current) return;
      if (result?.success) {
        setMessage('Customer added.');
        clearForm();
        await fetchCustomers();
      } else {
        setError('Failed to add customer.');
      }
    } catch (err) {
      if (mountedRef.current) setError('Could not add customer.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const updateCustomer = async () => {
    const cname = form.cname.trim();
    if (!cname || !editing) { setError('Customer name is required.'); return; }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.requestReply('update-customer', 'update-customer-response', {
        cid: editing,
        cname,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      if (!mountedRef.current) return;
      if (result?.success) {
        setMessage('Customer updated.');
        clearForm();
        await fetchCustomers();
      } else {
        setError(result?.error || 'Failed to update customer.');
      }
    } catch (err) {
      if (mountedRef.current) setError('Could not update customer.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const deleteCustomer = async (customer) => {
    setDeleteTarget(customer);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.requestReply('delete-customer', 'customer-delete-response', {
        customerId: deleteTarget.cid,
      });
      if (!mountedRef.current) return;
      if (result?.success) {
        setDeleteTarget(null);
        setMessage('Customer deleted.');
        await fetchCustomers();
      } else {
        setError('Failed to delete customer.');
      }
    } catch (err) {
      if (mountedRef.current) setError('Could not delete customer.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-on-light">Customers</h2>
            <p className="text-sm text-muted">Manage customer records.</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, address"
            className="surface-input h-10 w-64 rounded-lg px-3"
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Name</label>
            <input value={form.cname} onChange={(e) => setForm((f) => ({ ...f, cname: e.target.value }))} className="surface-input h-10 rounded-lg px-3 w-48" />
          </div>
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="surface-input h-10 rounded-lg px-3 w-40" />
          </div>
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Address</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="surface-input h-10 rounded-lg px-3 w-56" />
          </div>
          {editing ? (
            <>
              <Button onClick={updateCustomer} disabled={busy}>Update</Button>
              <Button variant="secondary" onClick={clearForm}>Cancel</Button>
            </>
          ) : (
            <>
              <Button onClick={addCustomer} disabled={busy}>Add Customer</Button>
              <Button
                variant="secondary"
                onClick={fetchCustomers}
                disabled={loading || busy}
                aria-label="Refresh customers"
                title="Refresh customers"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="sr-only">Refresh</span>
              </Button>
            </>
          )}
        </div>
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[620px]">
            <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
              <tr>
                <SortHeader label="ID" sortKey="cid" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Name" sortKey="cname" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Address" sortKey="address" sortConfig={sortConfig} onSort={requestSort} />
                <th className="px-3 py-2 text-left text-xs uppercase text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-8 text-sm text-muted">Loading customers...</td></tr>
              ) : null}
              {!loading && sortedCustomers.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-sm text-muted">No customers found.</td></tr>
              ) : null}
              {!loading && sortedCustomers.map((customer, i) => (
                <tr key={customer.cid ?? `c-${i}`} className={`border-b border-subtle ${editing === customer.cid ? '' : ''}`}>
                  <td className="px-3 py-2 text-sm text-on-light">{customer.cid ?? '-'}</td>
                  <td className="px-3 py-2 text-sm font-medium text-on-light">{customer.cname ?? '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{customer.phone || '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{customer.address || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(customer)} disabled={busy}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCustomer(customer)} disabled={busy}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Customer"
        message={deleteTarget ? `Delete customer "${deleteTarget.cname}"? This cannot be undone.` : ''}
        confirmText="Delete"
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setDeleteTarget(null)}
        busy={busy}
      />
    </div>
  );
}