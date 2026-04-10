import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [stock, setStock] = useState('0');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-inventory-list', 'inventory-list-response', undefined);
      if (!mountedRef.current) return;
      setItems(Array.isArray(result?.inventory) ? result.inventory : []);
    } catch (fetchError) {
      console.error('Failed to fetch inventory:', fetchError);
      if (mountedRef.current) {
        setError('Could not load inventory list.');
        setItems([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchInventory();

    const onExternalUpdate = () => {
      fetchInventory();
    };

    ipcService.on('inventory-item-updated', onExternalUpdate);
    return () => {
      mountedRef.current = false;
      ipcService.removeListener('inventory-item-updated', onExternalUpdate);
    };
  }, [fetchInventory]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        String(item.inv_no).includes(term) ||
        item.inv_item?.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const addItem = async () => {
    const invItem = name.trim();
    const currentStock = Number(stock);
    if (!invItem) {
      setError('Item name is required.');
      return;
    }
    if (!Number.isFinite(currentStock) || currentStock < 0) {
      setError('Stock must be 0 or greater.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await ipcService.requestReply('add-inventory-item', 'inventory-item-added', {
        inv_item: invItem,
        current_stock: currentStock,
      });
      setName('');
      setStock('0');
      await fetchInventory();
    } catch (addError) {
      console.error('Failed to add inventory item:', addError);
      setError('Could not add inventory item.');
    } finally {
      setBusy(false);
    }
  };

  const updateStock = async (item, nextStock) => {
    const stockValue = Number(nextStock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setError('Stock must be 0 or greater.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await ipcService.requestReply('update-inventory-item', 'inventory-item-updated', {
        inv_no: item.inv_no,
        inv_item: item.inv_item,
        current_stock: stockValue,
      });
      await fetchInventory();
    } catch (updateError) {
      console.error('Failed to update inventory item:', updateError);
      setError('Could not update stock.');
    } finally {
      setBusy(false);
    }
  };

  const restockItem = async (item) => {
    const qtyInput = window.prompt(`Restock quantity for ${item.inv_item}:`, '1');
    if (qtyInput === null) return;
    const quantity = Number(qtyInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Restock quantity must be greater than 0.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await ipcService.requestReply('restock-inventory-item', 'inventory-item-restocked', {
        inv_no: item.inv_no,
        quantity,
      });
      await fetchInventory();
    } catch (restockError) {
      console.error('Failed to restock item:', restockError);
      setError('Could not restock item.');
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item) => {
    const ok = window.confirm(`Delete inventory item: ${item.inv_item}?`);
    if (!ok) return;

    setBusy(true);
    setError('');
    try {
      await ipcService.requestReply('delete-inventory-item', 'inventory-item-deleted', { inv_no: item.inv_no });
      await fetchInventory();
    } catch (deleteError) {
      console.error('Failed to delete item:', deleteError);
      setError('Could not delete inventory item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Inventory</h2>
            <p className="text-sm text-slate-600">Create, restock, update and delete inventory from React.</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory"
            className="h-10 w-64 max-w-full rounded-lg border border-slate-300 px-3"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">Item Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3" />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">Stock</label>
            <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 w-28" />
          </div>
          <Button onClick={addItem} disabled={busy}>Add Item</Button>
          <Button variant="secondary" onClick={fetchInventory} disabled={loading || busy}>Refresh</Button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500">ID</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500">Item</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500">Stock</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-8 text-sm text-slate-500">Loading inventory...</td></tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-sm text-slate-500">No inventory items found.</td></tr>
              ) : null}
              {!loading && filteredItems.map((item) => (
                <tr key={item.inv_no ?? index} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-sm">{item.inv_no ?? '-'}</td>
                  <td className="px-3 py-2 text-sm font-medium">{item.inv_item ?? 'Unknown'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      defaultValue={item.current_stock}
                      className="h-9 w-24 rounded border border-slate-300 px-2"
                      onBlur={(e) => {
                        if (String(e.target.defaultValue) !== String(e.target.value)) {
                          updateStock(item, e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => restockItem(item)} disabled={busy}>Restock</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteItem(item)} disabled={busy}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
