import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialogs';
import ipcService from '@/services/ipcService';

function ItemForm({ categories, initial, onSubmit, onCancel, busy, label }) {
  const [fname, setFname] = useState(initial?.fname ?? '');
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.catid ?? '');
  const [cost, setCost] = useState(initial?.cost ?? '');
  const [sgst, setSgst] = useState(initial?.sgst ?? '0');
  const [cgst, setCgst] = useState(initial?.cgst ?? '0');
  const [veg, setVeg] = useState(initial?.veg ?? 1);
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ fname: fname.trim(), category: Number(category), cost: Number(cost || 0), sgst: Number(sgst || 0), cgst: Number(cgst || 0), veg: Number(veg) });
  };
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-on-light)',
    border: '1.5px solid var(--border-on-light)',
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <div className="sm:col-span-2">
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Name *</label>
        <input value={fname} onChange={(e) => setFname(e.target.value)} required style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm">
          {categories.map((c) => <option key={c.catid} value={c.catid}>{c.catname}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Cost</label>
        <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>SGST</label>
        <input type="number" min="0" step="0.01" value={sgst} onChange={(e) => setSgst(e.target.value)} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>CGST</label>
        <input type="number" min="0" step="0.01" value={cgst} onChange={(e) => setCgst(e.target.value)} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
        <select value={veg} onChange={(e) => setVeg(Number(e.target.value))} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm">
          <option value={1}>VEG</option>
          <option value={0}>NON-VEG</option>
        </select>
      </div>
      <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={busy || !fname.trim()}>{busy ? 'Saving...' : label}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>}
      </div>
    </form>
  );
}

function ItemModal({ title, categories, initial, onSubmit, onClose, busy, label }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="surface-card w-full max-w-5xl rounded-3xl p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Menu Item Editor</p>
            <h3 className="text-2xl font-black text-on-light mt-1">{title}</h3>
            <p className="text-sm text-muted mt-1">Edit the item details, tax values, and type from one focused dialog.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Close</Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_320px] gap-4">
          <div className="rounded-2xl border border-on-light bg-input/40 p-4">
            <ItemForm
              categories={categories}
              initial={initial}
              onSubmit={onSubmit}
              onCancel={onClose}
              busy={busy}
              label={label}
            />
          </div>

          <aside className="rounded-2xl border border-on-light bg-input/60 p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Quick Preview</p>
              <div className="mt-3 rounded-xl border border-on-light bg-[var(--bg-card)] p-4 space-y-2">
                <p className="text-lg font-black text-on-light">{initial?.fname || 'Item Name'}</p>
                <p className="text-sm text-muted">Category: {categories.find((c) => Number(c.catid) === Number(initial?.category))?.catname ?? 'Choose a category'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Price</span>
                  <span className="font-semibold text-on-light">Rs. {Number(initial?.cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Type</span>
                  <span className="inline-flex w-20 justify-center rounded-full px-2 py-1 text-xs font-semibold text-on-dark" style={{ backgroundColor: Number(initial?.veg) ? 'var(--color-a)' : 'var(--color-b)' }}>
                    {Number(initial?.veg) ? 'VEG' : 'NON-VEG'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-on-light p-3 text-xs leading-5 text-muted space-y-1">
              <p className="font-semibold text-on-light">Editing tips</p>
              <p>• Keep the name short and searchable.</p>
              <p>• Use the correct tax values for receipt accuracy.</p>
              <p>• The item type badge will preview the final visual style.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MenuRow({ item, onEdit, onDelete, busy }) {
  return (
    <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{item.fid ?? '-'}</td>
      <td className="px-3 py-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-on-light)' }}>{item.fname ?? 'Unknown'}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.category_name ?? '-'}</p>
      </td>
      <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-on-light)' }}>Rs. {Number(item.cost ?? 0).toFixed(2)}</td>
      <td className="px-3 py-2">
        <span
          className="inline-flex w-20 justify-center text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: item.veg ? 'var(--color-a)' : 'var(--color-b)',
            color: 'var(--text-on-dark)',
            border: '1.5px solid',
            borderColor: item.veg ? 'var(--color-a)' : 'var(--color-b)',
          }}
        >
          {item.veg ? 'VEG' : 'NON-VEG'}
        </span>
      </td>
      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        SGST: {Number(item.sgst ?? 0).toFixed(2)} | CGST: {Number(item.cgst ?? 0).toFixed(2)}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => onEdit(item)} disabled={busy}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(item)} disabled={busy}>Delete</Button>
        </div>
      </td>
    </tr>
  );
}

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const mountedRef = useRef(true);

  const loadMenuItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ipcService.invoke('get-menu-items');
      if (!mountedRef.current) return;
      setItems(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Failed to load menu items:', fetchError);
      if (mountedRef.current) setError('Could not load menu items.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await ipcService.invoke('get-categories-for-additem');
      if (!mountedRef.current) return;
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load categories:', err); }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadMenuItems();
    loadCategories();
    return () => { mountedRef.current = false; };
  }, [loadMenuItems, loadCategories]);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) =>
      String(item?.fid ?? '').includes(text) ||
      (item?.fname ?? '').toLowerCase().includes(text) ||
      (item?.category_name ?? '').toLowerCase().includes(text)
    );
  }, [items, query]);

  const addItem = async (formData) => {
    setBusy(true);
    setError('');
    try {
      const result = await ipcService.invoke('add-food-item', { ...formData, tax: 0, active: 1, is_on: 1 });
      if (!mountedRef.current) return;
      if (result?.success) { setShowAdd(false); await loadMenuItems(); }
      else setError('Failed to add item.');
    } catch (err) { if (mountedRef.current) setError('Could not add menu item.'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const updateItem = async (formData) => {
    if (!editItem?.fid) return;
    setBusy(true);
    setError('');
    try {
      const result = await ipcService.invoke('update-food-item', { fid: editItem.fid, ...formData });
      if (!mountedRef.current) return;
      if (result?.success) { setEditItem(null); await loadMenuItems(); }
      else setError(result?.error || 'Failed to update item.');
    } catch (err) { if (mountedRef.current) setError('Could not update menu item.'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const deleteItem = async (item) => {
    setDeleteTarget(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      const result = await ipcService.invoke('delete-menu-item', deleteTarget.fid);
      if (!mountedRef.current) return;
      if (result) {
        setDeleteTarget(null);
        await loadMenuItems();
      }
      else setError('Failed to delete item.');
    } catch (err) { if (mountedRef.current) setError('Could not delete menu item.'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-on-light)', color: 'var(--text-on-light)' };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl p-4 md:p-5" style={cardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black" style={{ color: 'var(--text-on-light)' }}>Menu</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{items.length} items</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by id, name, category"
              style={cardStyle}
              className="h-10 w-64 max-w-full rounded-lg px-3 text-sm outline-none"
            />
            <Button onClick={() => { setShowAdd(true); setEditItem(null); }} disabled={busy}>Add Item</Button>
            <Button variant="secondary" onClick={loadMenuItems} disabled={loading || busy}>Refresh</Button>
          </div>
        </div>
      </section>

      {error && <p className="text-sm" style={{ color: 'var(--status-error)' }}>{error}</p>}

      {showAdd && categories.length > 0 && (
        <ItemModal
          title="Add Menu Item"
          categories={categories}
          onSubmit={addItem}
          onClose={() => setShowAdd(false)}
          busy={busy}
          label="Add Item"
        />
      )}

      {editItem && categories.length > 0 && (
        <ItemModal
          title={`Edit Menu Item #${editItem.fid ?? ''}`}
          categories={categories}
          initial={{
            fname: editItem.fname,
            category: categories.find((c) => c.catname === editItem.category_name)?.catid ?? editItem.category,
            cost: editItem.cost, sgst: editItem.sgst, cgst: editItem.cgst,
            veg: editItem.veg ? 1 : 0,
          }}
          onSubmit={updateItem}
          onClose={() => setEditItem(null)}
          busy={busy}
          label="Update Item"
        />
      )}

      <section className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[860px]">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1.5px solid var(--border-on-light)' }}>
              <tr>
                {['ID','Item','Price','Type','Tax','Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading menu items...</td></tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : null}
              {!loading && filteredItems.map((item) => (
                <MenuRow key={item.fid ?? item._idx} item={item} onEdit={(it) => { setEditItem(it); setShowAdd(false); }} onDelete={deleteItem} busy={busy} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Menu Item"
        message={deleteTarget ? `Delete "${deleteTarget.fname}" (ID: ${deleteTarget.fid})? This cannot be undone.` : ''}
        confirmText="Delete"
        onConfirm={confirmDeleteItem}
        onCancel={() => setDeleteTarget(null)}
        busy={busy}
      />
    </div>
  );
}