import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

function toDateInputValue(date) {
  return date.toISOString().split('T')[0];
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN');
}

export default function HistoryPage() {
  const today = toDateInputValue(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);

  const fetchHistory = async () => {
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-order-history', 'order-history-response', {
        startDate,
        endDate,
      });
      setOrders(Array.isArray(result?.orders) ? result.orders : []);
    } catch (fetchError) {
      console.error('Failed to fetch history:', fetchError);
      setError('Could not fetch order history.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.count += 1;
        acc.price += Number(order.price || 0);
        acc.tax += Number(order.tax || 0);
        return acc;
      },
      { count: 0, price: 0, tax: 0 }
    );
  }, [orders]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3"
            />
          </div>
          <Button onClick={fetchHistory} disabled={loading}>{loading ? 'Loading...' : 'Show History'}</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase tracking-[0.15em]">Orders</p>
          <p className="text-2xl font-black text-slate-900">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase tracking-[0.15em]">Total Amount</p>
          <p className="text-2xl font-black text-[#0f766e]">Rs. {totals.price.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase tracking-[0.15em]">Total Tax</p>
          <p className="text-2xl font-black text-[#0369a1]">Rs. {totals.tax.toFixed(2)}</p>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Bill No</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Date</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Cashier</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">KOT</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Price</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">SGST</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">CGST</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Tax</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Items</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-sm text-slate-500">Loading order history...</td>
                </tr>
              ) : null}
              {!loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-sm text-slate-500">No orders found for selected dates.</td>
                </tr>
              ) : null}
              {!loading && orders.map((order, i) => (
                <tr key={order.billno ?? `order-${i}`} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2 text-sm">{order.billno ?? '-'}</td>
                  <td className="px-3 py-2 text-sm">{formatDate(order.date)}</td>
                  <td className="px-3 py-2 text-sm">{order.cashier_name || '-'}</td>
                  <td className="px-3 py-2 text-sm">{order.kot || '-'}</td>
                  <td className="px-3 py-2 text-sm">{Number(order.price || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{Number(order.sgst || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{Number(order.cgst || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{Number(order.tax || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm max-w-[420px] whitespace-normal">{order.food_items || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
