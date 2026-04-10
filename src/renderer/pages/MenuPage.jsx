import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

function MenuRow({ item, onToggleOn, onToggleActive, busy }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 text-sm text-slate-700">{item.fid}</td>
      <td className="px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">{item.fname}</p>
        <p className="text-xs text-slate-500">{item.category_name}</p>
      </td>
      <td className="px-3 py-2 text-sm font-medium text-slate-800">Rs. {Number(item.cost).toFixed(2)}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-2 py-1 rounded-full ${item.veg ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {item.veg ? 'VEG' : 'NON-VEG'}
        </span>
      </td>
      <td className="px-3 py-2">
        <Button size="sm" variant={item.is_on ? 'default' : 'secondary'} onClick={() => onToggleOn(item.fid)} disabled={busy}>
          {item.is_on ? 'ON' : 'OFF'}
        </Button>
      </td>
      <td className="px-3 py-2">
        <Button size="sm" variant={item.active ? 'default' : 'secondary'} onClick={() => onToggleActive(item.fid)} disabled={busy}>
          {item.active ? 'ACTIVE' : 'INACTIVE'}
        </Button>
      </td>
    </tr>
  );
}

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadMenuItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ipcService.invoke('get-menu-items');
      setItems(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Failed to load menu items:', fetchError);
      setError('Could not load menu items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) => {
      return (
        String(item.fid).includes(text) ||
        item.fname?.toLowerCase().includes(text) ||
        item.category_name?.toLowerCase().includes(text)
      );
    });
  }, [items, query]);

  const toggleOn = async (fid) => {
    setBusy(true);
    try {
      await ipcService.invoke('toggle-menu-item', fid);
      await loadMenuItems();
    } catch (toggleError) {
      console.error('Failed toggling item on/off:', toggleError);
      setError('Failed to toggle item on/off.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (fid) => {
    setBusy(true);
    try {
      await ipcService.invoke('toggle-menu-item-active', fid);
      await loadMenuItems();
    } catch (toggleError) {
      console.error('Failed toggling item active state:', toggleError);
      setError('Failed to toggle item active state.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Menu</h2>
            <p className="text-sm text-slate-600">Live menu data with toggle controls migrated to React.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by id, name, category"
              className="h-10 w-64 max-w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
            <Button variant="secondary" onClick={loadMenuItems} disabled={loading || busy}>Refresh</Button>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">ID</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">Item</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">Price</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">Type</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">Daily</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-8 text-sm text-slate-500" colSpan={6}>Loading menu items...</td>
                </tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-sm text-slate-500" colSpan={6}>No items found.</td>
                </tr>
              ) : null}
              {!loading && filteredItems.map((item) => (
                <MenuRow key={item.fid} item={item} onToggleOn={toggleOn} onToggleActive={toggleActive} busy={busy} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
