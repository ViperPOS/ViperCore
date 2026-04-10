import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN');
}

export default function OperationsPage() {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [todayOrders, setTodayOrders] = useState([]);
  const [discountedOrders, setDiscountedOrders] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingDiscounted, setLoadingDiscounted] = useState(false);
  const [error, setError] = useState('');

  const fetchTodayOrders = async () => {
    setLoadingToday(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-todays-orders', 'todays-orders-response', undefined);
      setTodayOrders(Array.isArray(result?.orders) ? result.orders : []);
    } catch (fetchError) {
      console.error('Failed to fetch today orders:', fetchError);
      setError('Could not fetch today orders.');
      setTodayOrders([]);
    } finally {
      setLoadingToday(false);
    }
  };

  const fetchDiscountedOrders = async () => {
    setLoadingDiscounted(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-discounted-orders', 'discounted-orders-response', {
        startDate,
        endDate,
      });
      setDiscountedOrders(Array.isArray(result?.orders) ? result.orders : []);
    } catch (fetchError) {
      console.error('Failed to fetch discounted orders:', fetchError);
      setError('Could not fetch discounted orders.');
      setDiscountedOrders([]);
    } finally {
      setLoadingDiscounted(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={fetchTodayOrders} disabled={loadingToday}>{loadingToday ? 'Loading Today...' : "Load Today's Orders"}</Button>

          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3" />
          <Button variant="secondary" onClick={fetchDiscountedOrders} disabled={loadingDiscounted}>{loadingDiscounted ? 'Loading Discounted...' : 'Load Discounted Orders'}</Button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h3 className="font-bold">Today's Orders</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Bill</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Cashier</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Amount</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Items</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-sm text-slate-500">No today-order data loaded.</td></tr>
                ) : todayOrders.map((order) => (
                  <tr key={order.billno} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-sm">{order.billno}</td>
                    <td className="px-3 py-2 text-sm">{formatDate(order.date)}</td>
                    <td className="px-3 py-2 text-sm">{order.cashier_name || '-'}</td>
                    <td className="px-3 py-2 text-sm">{formatCurrency(order.price)}</td>
                    <td className="px-3 py-2 text-sm">{order.food_items || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h3 className="font-bold">Discounted Orders</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Bill</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Initial</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Discount %</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Discount Amt</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Final</th>
                </tr>
              </thead>
              <tbody>
                {discountedOrders.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-sm text-slate-500">No discounted-order data loaded.</td></tr>
                ) : discountedOrders.map((order) => (
                  <tr key={order.billno} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-sm">{order.billno}</td>
                    <td className="px-3 py-2 text-sm">{formatDate(order.date)}</td>
                    <td className="px-3 py-2 text-sm">{formatCurrency(order.Initial_price)}</td>
                    <td className="px-3 py-2 text-sm">{Number(order.discount_percentage || 0).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-sm">{formatCurrency(order.discount_amount)}</td>
                    <td className="px-3 py-2 text-sm">{formatCurrency(order.Final_Price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
