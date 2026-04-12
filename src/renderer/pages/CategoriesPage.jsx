import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

export default function CategoriesPage({ user }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catname, setCatname] = useState('');
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

  const resetForm = () => {
    setEditingCategory(null);
    setCatname('');
  };

  const saveCategory = async () => {
    if (!catname.trim()) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = editingCategory
        ? await ipcService.invoke('update-category', {
            catid: editingCategory.catid,
            catname,
            active: Boolean(editingCategory.active),
          })
        : await ipcService.invoke('create-category', { catname });

      if (!result?.success) {
        setError(result?.message || 'Failed to save category.');
        return;
      }

      setMessage(editingCategory ? 'Category updated.' : 'Category added.');
      resetForm();
      await loadCategories();
    } catch (saveError) {
      console.error('Failed to save category:', saveError);
      setError('Could not save category.');
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

      setMessage(Number(category.active) ? 'Category archived.' : 'Category reactivated.');
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
      <section className="surface-card rounded-2xl p-5 max-w-lg">
        <h2 className="text-xl font-black text-on-light">Category Management</h2>
        <p className="text-sm text-muted mt-2">Only admins can manage categories.</p>
      </section>
    );
  }

  return (
    <section className="surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-black text-on-light">Category Management</h2>
        <p className="text-sm text-muted mt-1">Add, rename, or archive categories used in the menu and billing screens.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3">
        <input
          value={catname}
          onChange={(e) => setCatname(e.target.value)}
          className="surface-input h-10 rounded-lg px-3"
          placeholder="Category name"
        />
        <div className="flex gap-2">
          <Button onClick={saveCategory} disabled={saving || !catname.trim()}>
            {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
          </Button>
          {editingCategory ? (
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>Cancel</Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-on-light">
        {loading ? (
          <p className="px-4 py-3 text-sm text-muted">Loading categories...</p>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead className="bg-input border-b border-on-light">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted">Name</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted">Status</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.catid} className="border-b border-subtle">
                  <td className="px-3 py-2 text-sm text-on-light">{category.catname}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{Number(category.active) ? 'Active' : 'Archived'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingCategory(category);
                          setCatname(category.catname ?? '');
                        }}
                        disabled={saving}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleCategory(category)} disabled={saving}>
                        {Number(category.active) ? 'Archive' : 'Reactivate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
    </section>
  );
}