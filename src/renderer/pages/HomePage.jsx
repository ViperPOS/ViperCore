import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

function ItemCard({ item }) {
  return (
    <div
      className="rounded-xl p-4 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-on-light)',
        border: '1.5px solid var(--border-on-light)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-tight">{item.fname ?? 'Unknown'}</h3>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: item.veg ? 'var(--color-a)' : 'var(--color-b)',
            color: 'var(--text-on-dark)',
            border: '1.5px solid',
            borderColor: item.veg ? 'var(--color-a)' : 'var(--color-b)',
          }}
        >
          {item.veg ? 'VEG' : 'NON-VEG'}
        </span>
      </div>
      <p className="mt-3 text-lg font-black" style={{ color: 'var(--text-on-light)' }}>
        Rs. {Number(item.cost ?? 0).toFixed(2)}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError('');
    try {
      const data = await ipcService.invoke('get-categories');
      const safe = Array.isArray(data) ? data : [];
      setCategories(safe);
      setSelectedCategory((prev) => {
        if (prev && safe.some((category) => category.catname === prev)) {
          return prev;
        }
        return safe[0]?.catname ?? '';
      });
    } catch (fetchError) {
      console.error('Failed to load categories:', fetchError);
      setError('Could not load categories.');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncCategories = async () => {
      await loadCategories();
    };

    syncCategories();

    const handleCategoriesUpdated = () => {
      if (mounted) {
        syncCategories();
      }
    };

    const wrapped = ipcService.on('categories-updated', handleCategoriesUpdated);
    return () => {
      mounted = false;
      if (wrapped) {
        ipcService.removeListener('categories-updated', handleCategoriesUpdated);
      }
    };
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    let mounted = true;
    const loadItems = async () => {
      setLoadingItems(true);
      setError('');
      try {
        const data = await ipcService.invoke('get-food-items', selectedCategory);
        if (!mounted) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error('Failed to load food items:', fetchError);
        if (mounted) setError('Could not load items for this category.');
      } finally {
        if (mounted) setLoadingItems(false);
      }
    };
    loadItems();
    return () => { mounted = false; };
  }, [selectedCategory]);

  const totalItems = useMemo(() => items.length, [items]);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section
        className="rounded-2xl p-6 shadow-xl"
        style={{
          background: `linear-gradient(135deg, var(--color-a) 0%, var(--color-b) 45%, var(--bg-app) 100%)`,
          color: 'var(--text-on-dark)',
        }}
      >
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-on-dark)', opacity: 0.8 }}>
          Live Menu Snapshot
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black" style={{ color: 'var(--text-on-dark)' }}>Home</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-on-dark)', opacity: 0.6 }}>
              Powered by React + IPC
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-b)', opacity: 0.6 }}>
              Visible Items
            </p>
            <p className="text-4xl font-black" style={{ color: 'var(--text-on-dark)' }}>
              {totalItems}
            </p>
          </div>
        </div>
      </section>

      {/* Category filter bar */}
      <section
        className="rounded-2xl p-4 md:p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-on-light)' }}
      >
        <div className="overflow-x-auto pb-1">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            {loadingCategories && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading categories...</p>}
            {!loadingCategories && categories.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No categories found.</p>}
            {categories.map((category) => {
              const active = selectedCategory === category.catname;
              return (
                <Button
                  key={category.catid ?? category.catname}
                  variant={active ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.catname ?? '')}
                >
                  {category.catname ?? 'Unknown'}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {error && <p className="text-sm" style={{ color: 'var(--status-error)' }}>{error}</p>}

      {/* Item grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loadingItems && <p className="text-sm col-span-full" style={{ color: 'var(--text-muted)' }}>Loading items...</p>}
        {!loadingItems && items.length === 0 && (
          <p className="text-sm col-span-full" style={{ color: 'var(--text-muted)' }}>No items available for this category.</p>
        )}
        {items.map((item) => (
          <ItemCard key={item.fid ?? item._idx ?? Math.random()} item={item} />
        ))}
      </section>
    </div>
  );
}