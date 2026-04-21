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
      className="px-3 py-2 text-left text-xs uppercase tracking-[0.15em] cursor-pointer select-none hover:opacity-80"
      style={{ color: 'var(--text-muted)' }}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
}

function ItemForm({ categories, initial, onPreviewChange, onSubmit, onCancel, busy, label }) {
  const [fname, setFname] = useState(initial?.fname ?? '');
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.catid ?? '');
  const [cost, setCost] = useState(initial?.cost ?? '');
  const [sgst, setSgst] = useState(initial?.sgst ?? '0');
  const [cgst, setCgst] = useState(initial?.cgst ?? '0');
  const [veg, setVeg] = useState(initial?.veg ?? 1);

  useEffect(() => {
    setFname(initial?.fname ?? '');
    setCategory(initial?.category ?? categories[0]?.catid ?? '');
    setCost(initial?.cost ?? '');
    setSgst(initial?.sgst ?? '0');
    setCgst(initial?.cgst ?? '0');
    setVeg(initial?.veg ?? 1);
  }, [initial, categories]);

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
        <input value={fname} onChange={(e) => {
          const value = e.target.value;
          setFname(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname: value, category, cost, sgst, cgst, veg });
          }
        }} required style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
        <select value={category} onChange={(e) => {
          const value = e.target.value;
          setCategory(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname, category: value, cost, sgst, cgst, veg });
          }
        }} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm">
          {categories.map((c) => <option key={c.catid} value={c.catid}>{c.catname}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Cost</label>
        <input type="number" min="0" step="0.01" value={cost} onChange={(e) => {
          const value = e.target.value;
          setCost(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname, category, cost: value, sgst, cgst, veg });
          }
        }} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>SGST</label>
        <input type="number" min="0" step="0.01" value={sgst} onChange={(e) => {
          const value = e.target.value;
          setSgst(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname, category, cost, sgst: value, cgst, veg });
          }
        }} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>CGST</label>
        <input type="number" min="0" step="0.01" value={cgst} onChange={(e) => {
          const value = e.target.value;
          setCgst(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname, category, cost, sgst, cgst: value, veg });
          }
        }} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
        <select value={veg} onChange={(e) => {
          const value = Number(e.target.value);
          setVeg(value);
          if (typeof onPreviewChange === 'function') {
            onPreviewChange({ fname, category, cost, sgst, cgst, veg: value });
          }
        }} style={inputStyle} className="h-10 w-full rounded-lg px-3 text-sm">
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
  const [preview, setPreview] = useState({
    fname: initial?.fname ?? '',
    category: initial?.category ?? categories[0]?.catid ?? '',
    cost: initial?.cost ?? '',
    sgst: initial?.sgst ?? '0',
    cgst: initial?.cgst ?? '0',
    veg: initial?.veg ?? 1,
  });

  useEffect(() => {
    setPreview({
      fname: initial?.fname ?? '',
      category: initial?.category ?? categories[0]?.catid ?? '',
      cost: initial?.cost ?? '',
      sgst: initial?.sgst ?? '0',
      cgst: initial?.cgst ?? '0',
      veg: initial?.veg ?? 1,
    });
  }, [initial, categories]);

  const handlePreviewChange = (nextValues) => {
    setPreview((prev) => ({ ...prev, ...nextValues }));
  };

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
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none p-1 rounded hover:bg-hover transition-colors"
            style={{ color: '#dc2626' }}
            disabled={busy}
          >
            &#x2715;
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_320px] gap-4">
          <div className="rounded-2xl border border-on-light bg-input/40 p-4">
            <ItemForm
              categories={categories}
              initial={initial}
              onPreviewChange={handlePreviewChange}
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
                <p className="text-lg font-black text-on-light">{preview?.fname || 'Item Name'}</p>
                <p className="text-sm text-muted">Category: {categories.find((c) => Number(c.catid) === Number(preview?.category))?.catname ?? 'Choose a category'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Price</span>
                  <span className="font-semibold text-on-light">Rs. {Number(preview?.cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">SGST</span>
                  <span className="font-semibold text-on-light">{Number(preview?.sgst || 0).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">CGST</span>
                  <span className="font-semibold text-on-light">{Number(preview?.cgst || 0).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Total Tax</span>
                  <span className="font-semibold text-on-light">{(Number(preview?.sgst || 0) + Number(preview?.cgst || 0)).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Type</span>
                  <span className="inline-flex w-20 justify-center rounded-full px-2 py-1 text-xs font-semibold text-on-dark" style={{ backgroundColor: Number(preview?.veg) ? 'var(--color-a)' : 'var(--color-b)' }}>
                    {Number(preview?.veg) ? 'VEG' : 'NON-VEG'}
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

function MenuRow({ item, onEdit, onDelete, onToggleActive, busy }) {
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
          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: item.veg ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)',
            color: item.veg ? '#16a34a' : '#dc2626',
          }}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.veg ? '#16a34a' : '#dc2626' }}
          />
          {item.veg ? 'VEG' : 'NON-VEG'}
        </span>
      </td>
      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        SGST: {Number(item.sgst ?? 0).toFixed(2)} | CGST: {Number(item.cgst ?? 0).toFixed(2)}
      </td>
      <td className="px-3 py-2">
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: Number(item.active) ? 'rgba(34, 197, 94, 0.16)' : 'rgba(107, 114, 128, 0.16)',
            color: Number(item.active) ? '#16a34a' : 'var(--text-muted)',
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: Number(item.active) ? '#16a34a' : 'var(--text-muted)' }}
          />
          {Number(item.active) ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => onEdit(item)} disabled={busy}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => onToggleActive(item)} disabled={busy}>
            {Number(item.active) ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(item)} disabled={busy}
            style={{ color: 'var(--status-error)' }}>Delete</Button>
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vegFilter, setVegFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  useEffect(() => {
    const handleCategoriesUpdated = () => {
      loadCategories();
      loadMenuItems();
    };

    const wrapped = ipcService.on('categories-updated', handleCategoriesUpdated);
    return () => {
      if (wrapped) {
        ipcService.removeListener('categories-updated', handleCategoriesUpdated);
      }
    };
  }, [loadCategories, loadMenuItems]);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((item) => {
      if (text) {
        const matchesText = String(item?.fid ?? '').includes(text) ||
          (item?.fname ?? '').toLowerCase().includes(text) ||
          (item?.category_name ?? '').toLowerCase().includes(text);
        if (!matchesText) return false;
      }
      if (categoryFilter && String(item.category) !== categoryFilter) return false;
      if (vegFilter === 'veg' && !item.veg) return false;
      if (vegFilter === 'nonveg' && item.veg) return false;
      if (statusFilter === 'active' && !Number(item.active)) return false;
      if (statusFilter === 'inactive' && Number(item.active)) return false;
      return true;
    });
  }, [items, query, categoryFilter, vegFilter, statusFilter]);

  const { sorted: sortedItems, sortConfig, requestSort } = useSortableData(filteredItems);

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

  const toggleItemActive = async (item) => {
    setBusy(true);
    setError('');
    try {
      const newActive = Number(item.active) ? 0 : 1;
      const result = await ipcService.invoke('update-food-item', {
        fid: item.fid,
        fname: item.fname,
        category: item.category,
        cost: item.cost,
        sgst: item.sgst,
        cgst: item.cgst,
        veg: item.veg,
        active: newActive,
      });
      if (!mountedRef.current) return;
      if (result?.success) {
        await loadMenuItems();
      } else {
        setError(result?.error || 'Failed to update item status.');
      }
    } catch (err) { if (mountedRef.current) setError('Could not update item status.'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const selectStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1.5px solid var(--border-on-light)',
    color: 'var(--text-on-light)',
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
            <Button onClick={() => { setShowAdd(true); setEditItem(null); }} disabled={busy}>Add Item</Button>
            <Button
              variant="secondary"
              onClick={loadMenuItems}
              disabled={loading || busy}
              aria-label="Refresh menu items"
              title="Refresh menu items"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div>
            <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by id, name, category"
              style={cardStyle}
              className="h-10 w-56 rounded-lg px-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle} className="h-10 rounded-lg px-3 text-sm outline-none">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.catid} value={c.catid}>{c.catname}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
            <select value={vegFilter} onChange={(e) => setVegFilter(e.target.value)} style={selectStyle} className="h-10 rounded-lg px-3 text-sm outline-none">
              <option value="">All Types</option>
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle} className="h-10 rounded-lg px-3 text-sm outline-none">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
                <SortHeader label="ID" sortKey="fid" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Item" sortKey="fname" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Price" sortKey="cost" sortConfig={sortConfig} onSort={requestSort} />
                <SortHeader label="Type" sortKey="veg" sortConfig={sortConfig} onSort={requestSort} />
                <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>Tax</th>
                <SortHeader label="Status" sortKey="active" sortConfig={sortConfig} onSort={requestSort} />
                <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading menu items...</td></tr>
              ) : null}
              {!loading && sortedItems.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : null}
              {!loading && sortedItems.map((item) => (
                <MenuRow key={item.fid ?? item._idx} item={item} onEdit={(it) => { setEditItem(it); setShowAdd(false); }} onDelete={deleteItem} onToggleActive={toggleItemActive} busy={busy} />
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