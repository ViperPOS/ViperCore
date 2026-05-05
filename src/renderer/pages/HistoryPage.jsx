import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PromptDialog } from '@/components/ui/dialogs';
import DateField from '@/components/DateField';
import ipcService from '@/services/ipcService';
import { HistoryTable } from '@/components/DataTable';
import { formatDateForDisplay, parseDateInput } from '@/lib/date';

function toDateInputValue(date = new Date()) {
  return formatDateForDisplay(date);
}

export default function HistoryPage() {
  const today = toDateInputValue(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState([]);
  const [deleteBillno, setDeleteBillno] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchHistory = async () => {
    const startIso = parseDateInput(startDate);
    const endIso = parseDateInput(endDate);

    if (!startIso || !endIso) {
      setError('Use DD-MM-YYYY for both dates.');
      return;
    }
    if (startIso > endIso) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await ipcService.requestReply('get-order-history', 'order-history-response', {
        startDate: startIso,
        endDate: endIso,
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

  const deleteOrder = async (reason) => {
    if (!deleteBillno) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.requestReply('delete-order', 'delete-order-response', {
        billno: deleteBillno,
        reason: reason || 'No reason provided',
      });
      if (!result?.success) {
        setError(result?.message || 'Failed to delete order.');
        return;
      }
      setMessage(`Order #${deleteBillno} deleted successfully.`);
      setDeleteBillno(null);
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete order:', err);
      setError('Failed to delete order.');
    } finally {
      setBusy(false);
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
      <section className="surface-card rounded-2xl p-4 md:p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-on-light">Order History</h2>
          <p className="text-sm text-muted">Review past orders by date range and remove records when needed.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <DateField label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full justify-center h-14" onClick={fetchHistory} disabled={loading}>{loading ? 'Loading...' : 'Show History'}</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="surface-card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-muted uppercase tracking-[0.15em]">Orders</p>
          <p className="text-2xl font-black text-on-light">{totals.count}</p>
        </div>
        <div className="surface-card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-muted uppercase tracking-[0.15em]">Total Amount</p>
          <p className="text-2xl font-black text-on-light">Rs. {totals.price.toFixed(2)}</p>
        </div>
        <div className="surface-card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-muted uppercase tracking-[0.15em]">Total Tax</p>
          <p className="text-2xl font-black text-on-light">Rs. {totals.tax.toFixed(2)}</p>
        </div>
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <section className="surface-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted text-center py-8">Loading order history...</p>
        ) : (
          <HistoryTable orders={orders} exportFilename="order-history" onDelete={setDeleteBillno} />
        )}
      </section>

      <PromptDialog
        open={deleteBillno !== null}
        title={`Delete Order #${deleteBillno}`}
        message="This will move the order to deleted orders. This action cannot be undone."
        label="Reason for deletion"
        confirmText="Delete Order"
        onConfirm={deleteOrder}
        onCancel={() => setDeleteBillno(null)}
        busy={busy}
      />
    </div>
  );
}
