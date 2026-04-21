import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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

function CategoryModal({ title, initial, onSubmit, onClose, busy, label }) {
  const [catname, setCatname] = useState(initial?.catname ?? '');

  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-on-light)',
    border: '1.5px solid var(--border-on-light)',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ catname: catname.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="surface-card w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Category Editor</p>
            <h3 className="text-2xl font-black text-on-light mt-1">{title}</h3>
            <p className="text-sm text-muted mt-1">{initial ? 'Update the category name.' : 'Add a new category to organize your menu items.'}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Category Name *</label>
            <input
              value={catname}
              onChange={(e) => setCatname(e.target.value)}
              required
              style={inputStyle}
              className="h-10 w-full rounded-lg px-3 text-sm"
              placeholder="e.g. Starters, Beverages, Desserts"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={busy || !catname.trim()}>{busy ? 'Saving...' : label}</Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage({ user }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ipcService.invoke('get-categories-for-additem');
      if (!mountedRef.current) return;
      setCategories(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error('Failed to load categories:', loadError);
      if (mountedRef.current) setError('Could not load categories.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!user?.isAdmin) {
      setLoading(false);
      return () => { mountedRef.current = false; };
    }

    loadCategories();

    const onCategoriesUpdated = () => {
      loadCategories();
    };

    const wrapped = ipcService.on('categories-updated', onCategoriesUpdated);
    return () => {
      mountedRef.current = false;
      if (wrapped) {
        ipcService.removeListener('categories-updated', onCategoriesUpdated);
      }
    };
  }, [loadCategories, user?.isAdmin]);

  const addCategory = async (formData) => {
    if (!formData.catname) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.invoke('create-category', { catname: formData.catname });

      if (!result?.success) {
        setError(result?.message || 'Failed to add category.');
        return;
      }

      setMessage('Category added.');
      setShowAdd(false);
      await loadCategories();
    } catch (saveError) {
      console.error('Failed to add category:', saveError);
      setError('Could not add category.');
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async (formData) => {
    if (!editCategory || !formData.catname) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.invoke('update-category', {
        catid: editCategory.catid,
        catname: formData.catname,
        active: Boolean(editCategory.active),
      });

      if (!result?.success) {
        setError(result?.message || 'Failed to update category.');
        return;
      }

      setMessage('Category updated.');
      setEditCategory(null);
      await loadCategories();
    } catch (saveError) {
      console.error('Failed to update category:', saveError);
      setError('Could not update category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.invoke('toggle-category-active', {
        catid: category.catid,
        active: !Number(category.active),
      });

      if (!result?.success) {
        setError(result?.message || 'Failed to update category status.');
        return;
      }

      setMessage(Number(category.active) ? 'Category deactivated.' : 'Category activated.');
      await loadCategories();
    } catch (toggleError) {
      console.error('Failed to toggle category status:', toggleError);
      setError('Could not update category status.');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <section className="surface-card rounded-2xl p-5">
        <h2 className="text-xl font-black text-on-light">Category Management</h2>
        <p className="text-sm text-muted mt-2">Only admins can manage categories.</p>
      </section>
    );
  }

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) => {
      if (q && !(c.catname ?? '').toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && !Number(c.active)) return false;
      if (statusFilter === 'inactive' && Number(c.active)) return false;
      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  const { sorted: sortedCategories, sortConfig, requestSort } = useSortableData(filteredCategories);

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-on-light">Category Management</h2>
            <p className="text-sm text-muted mt-1">{categories.length} categories</p>
          </div>
          <Button onClick={() => { setShowAdd(true); setEditCategory(null); }} disabled={saving}>Add Category</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="surface-input h-10 rounded-lg px-3 w-64"
            placeholder="Search categories..."
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="surface-input h-10 rounded-lg px-3">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      {showAdd && (
        <CategoryModal
          title="Add Category"
          onSubmit={addCategory}
          onClose={() => setShowAdd(false)}
          busy={saving}
          label="Add Category"
        />
      )}

      {editCategory && (
        <CategoryModal
          title={`Edit Category #${editCategory.catid ?? ''}`}
          initial={{ catname: editCategory.catname }}
          onSubmit={updateCategory}
          onClose={() => setEditCategory(null)}
          busy={saving}
          label="Update Category"
        />
      )}

      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-auto">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted">Loading categories...</p>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead className="bg-input border-b border-on-light sticky top-0 z-10">
                <tr>
                  <SortHeader label="Name" sortKey="catname" sortConfig={sortConfig} onSort={requestSort} />
                  <SortHeader label="Status" sortKey="active" sortConfig={sortConfig} onSort={requestSort} />
                  <th className="text-left px-3 py-2 text-xs uppercase text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-sm text-muted">No categories found.</td></tr>
                ) : sortedCategories.map((category) => (
                  <tr key={category.catid} className="border-b border-subtle">
                    <td className="px-3 py-2 text-sm font-medium text-on-light">{category.catname}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: Number(category.active) ? 'rgba(34, 197, 94, 0.16)' : 'rgba(107, 114, 128, 0.16)',
                          color: Number(category.active) ? '#16a34a' : 'var(--text-muted)',
                        }}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: Number(category.active) ? '#16a34a' : 'var(--text-muted)' }}
                        />
                        {Number(category.active) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-on-light">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setEditCategory(category); setShowAdd(false); }}
                          disabled={saving}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleCategory(category)} disabled={saving}>
                          {Number(category.active) ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
