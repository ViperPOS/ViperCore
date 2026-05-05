import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import DateField from '@/components/DateField';
import ipcService from '@/services/ipcService';
import { SalesOverviewTable, CategorySalesTable, TopItemsTable, TopCategoriesTable } from '@/components/DataTable';
import { exportToExcel } from '@/lib/exportExcel';
import { useSortableData } from '@/hooks/useSortableData';
import { formatDateForDisplay, parseDateInput } from '@/lib/date';

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

function localDateString(date = new Date()) {
  return formatDateForDisplay(date);
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
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function ReportCard({ label, value }) {
  return (
    <div className="surface-card rounded-2xl p-4 md:p-5 space-y-1">
      <p className="text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="text-2xl font-black text-on-light leading-none">{value}</p>
    </div>
  );
}

export default function ReportsPage({ initialReport }) {
  const today = localDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState(initialReport || 'dayEndSummary');
  const mountedRef = useRef(true);

  const [salesOverview, setSalesOverview] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [discountedOrders, setDiscountedOrders] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [employeeAnalysis, setEmployeeAnalysis] = useState([]);
  const [bestInCategory, setBestInCategory] = useState([]);
  const [taxOnItems, setTaxOnItems] = useState([]);

  const [dayEnd, setDayEnd] = useState({
    revenue: 0, sales: 0, tax: 0, discounted: 0, deleted: 0, yesterdayRevenue: 0,
    mostSoldItems: [], mostSoldCategories: [], highestRevenueItems: [], highestRevenueCategory: [],
  });

  const { sorted: sortedDiscountedOrders, sortConfig: sortConfigDiscounted, requestSort: requestSortDiscounted } = useSortableData(discountedOrders);
  const { sorted: sortedItemSummary, sortConfig: sortConfigItem, requestSort: requestSortItem } = useSortableData(itemSummary);
  const { sorted: sortedEmployeeAnalysis, sortConfig: sortConfigEmployee, requestSort: requestSortEmployee } = useSortableData(employeeAnalysis);
  const { sorted: sortedBestInCategory, sortConfig: sortConfigBest, requestSort: requestSortBest } = useSortableData(bestInCategory);
  const { sorted: sortedTaxOnItems, sortConfig: sortConfigTax, requestSort: requestSortTax } = useSortableData(taxOnItems);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setActiveReport(initialReport || 'dayEndSummary');
  }, [initialReport]);

  const loadDayEnd = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        ipcService.invoke('get-todays-revenue'),
        ipcService.invoke('get-todays-sales'),
        ipcService.invoke('get-todays-tax'),
        ipcService.invoke('get-todays-discounted-orders'),
        ipcService.invoke('get-todays-deleted-orders'),
        ipcService.invoke('get-yesterdays-revenue'),
        ipcService.invoke('get-most-sold-items'),
        ipcService.invoke('get-most-sold-categories'),
        ipcService.invoke('get-highest-revenue-items'),
        ipcService.invoke('get-highest-revenue-category'),
      ]);

      if (!mountedRef.current) return;

      const v = (i) => results[i].status === 'fulfilled' ? results[i].value : null;
      const errors = results.filter((r) => r.status === 'rejected');
      if (errors.length > 0) {
        setError(`${errors.length} metric(s) failed to load.`);
      }

      setDayEnd({
        revenue: v(0) ?? 0,
        sales: v(1) ?? 0,
        tax: v(2) ?? 0,
        discounted: v(3) ?? 0,
        deleted: v(4) ?? 0,
        yesterdayRevenue: v(5) ?? 0,
        mostSoldItems: Array.isArray(v(6)) ? v(6) : [],
        mostSoldCategories: Array.isArray(v(7)) ? v(7) : [],
        highestRevenueItems: Array.isArray(v(8)) ? v(8) : [],
        highestRevenueCategory: Array.isArray(v(9)) ? v(9) : [],
      });
    } catch (err) {
      if (mountedRef.current) setError('Could not load day-end summary.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const loadDateRangeReports = useCallback(async () => {
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
      const results = await Promise.allSettled([
        ipcService.invoke('get-sales-overview-data', startIso, endIso),
        ipcService.invoke('get-category-wise-sales-data', startIso, endIso),
        ipcService.requestReply('get-discounted-orders', 'discounted-orders-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-top-selling-items', 'top-selling-items-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-top-selling-categories', 'top-selling-categories-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-item-summary', 'item-summary-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-employee-analysis', 'employee-analysis-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-best-in-category', 'best-in-category-response', { startDate: startIso, endDate: endIso }),
        ipcService.requestReply('get-tax-on-items', 'tax-on-items-response', { startDate: startIso, endDate: endIso }),
      ]);

      if (!mountedRef.current) return;

      const errors = results.filter((r) => r.status === 'rejected');
      if (errors.length > 0) {
        console.error('Some reports failed:', errors.map((e) => e.reason));
        setError(`Failed to load ${errors.length} report(s). Showing partial data.`);
      }

      const v = (i) => results[i].status === 'fulfilled' ? results[i].value : null;

      const salesData = v(0);
      const catData = v(1);
      const discountedData = v(2);
      const topItemsData = v(3);
      const topCatsData = v(4);
      const itemSummaryData = v(5);
      const employeeData = v(6);
      const bestData = v(7);
      const taxData = v(8);

      setSalesOverview(Array.isArray(salesData) ? salesData : []);
      setCategorySales(Array.isArray(catData) ? catData : []);
      setDiscountedOrders(Array.isArray(discountedData?.orders) ? discountedData.orders : []);
      setTopItems(Array.isArray(topItemsData?.items) ? topItemsData.items : []);
      setTopCategories(Array.isArray(topCatsData?.categories) ? topCatsData.categories : []);
      setItemSummary(Array.isArray(itemSummaryData?.items) ? itemSummaryData.items : []);
      setEmployeeAnalysis(Array.isArray(employeeData?.employees) ? employeeData.employees : []);
      setBestInCategory(Array.isArray(bestData?.categories) ? bestData.categories : []);
      setTaxOnItems(Array.isArray(taxData?.items) ? taxData.items : []);
    } catch (fetchError) {
      if (mountedRef.current) {
        console.error('Failed loading reports:', fetchError);
        setError('Could not load reports for the selected date range.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeReport === 'dayEndSummary') {
      loadDayEnd();
    } else {
      loadDateRangeReports();
    }
  }, [activeReport, loadDayEnd, loadDateRangeReports]);

  const loadReports = () => {
    if (activeReport === 'dayEndSummary') {
      loadDayEnd();
    } else {
      loadDateRangeReports();
    }
  };

  const exportCurrentReport = async () => {
    setExporting(true);
    try {
      const configs = {
        salesOverview: {
          filename: 'sales-overview',
          columns: [
            { header: 'Date', accessor: (r) => formatDate(r.date) },
            { header: 'Orders', accessor: (r) => r.totalSales ?? 0 },
            { header: 'Revenue', accessor: (r) => r.totalRevenue ?? 0 },
          ],
          rows: salesOverview,
        },
        categorySales: {
          filename: 'category-sales',
          columns: [
            { header: 'Category', accessor: (r) => r.categoryName ?? '-' },
            { header: 'Units Sold', accessor: (r) => r.totalQuantity ?? 0 },
            { header: 'Revenue', accessor: (r) => r.totalRevenue ?? 0 },
          ],
          rows: categorySales,
        },
        discountedOrders: {
          filename: 'discounted-orders',
          columns: [
            { header: 'Bill', accessor: (r) => r.billno ?? '-' },
            { header: 'Date', accessor: (r) => formatDate(r.date) },
            { header: 'Table', accessor: (r) => r.table_label || '-' },
            { header: 'Initial', accessor: (r) => r.Initial_price ?? 0 },
            { header: 'Discount %', accessor: (r) => Number(r.discount_percentage || 0).toFixed(2) },
            { header: 'Discount Amt', accessor: (r) => r.discount_amount ?? 0 },
            { header: 'Final', accessor: (r) => r.Final_Price ?? 0 },
          ],
          rows: discountedOrders,
        },
        topSellingItems: {
          filename: 'top-selling-items',
          columns: [
            { header: 'Date', accessor: (r) => formatDate(r.date) },
            { header: 'Top Item(s)', accessor: (r) => (r.top_items ?? []).join(', ') },
          ],
          rows: topItems,
        },
        topSellingCategory: {
          filename: 'top-selling-categories',
          columns: [
            { header: 'Date', accessor: (r) => formatDate(r.date) },
            { header: 'Category', accessor: (r) => (r.top_categories ?? []).join(', ') },
            { header: 'Units', accessor: (r) => r.totalUnits ?? 0 },
          ],
          rows: topCategories,
        },
        itemSummary: {
          filename: 'item-summary',
          columns: [
            { header: 'Category', accessor: (r) => r.categoryName ?? '-' },
            { header: 'Item', accessor: (r) => r.item ?? '-' },
            { header: 'Qty', accessor: (r) => r.quantity ?? 0 },
            { header: 'Revenue', accessor: (r) => r.revenue ?? 0 },
          ],
          rows: itemSummary,
        },
        employeeAnalysis: {
          filename: 'employee-analysis',
          columns: [
            { header: 'Name', accessor: (r) => r.name ?? '-' },
            { header: 'Orders', accessor: (r) => r.order_count ?? 0 },
            { header: 'Units Sold', accessor: (r) => r.total_units ?? 0 },
            { header: 'Revenue', accessor: (r) => r.total_revenue ?? 0 },
          ],
          rows: employeeAnalysis,
        },
        bestInCategory: {
          filename: 'best-in-category',
          columns: [
            { header: 'Category', accessor: (r) => r.catname ?? '-' },
            { header: 'Top Item(s)', accessor: (r) => (r.top_items ?? []).join(', ') },
          ],
          rows: bestInCategory,
        },
        taxOnItems: {
          filename: 'tax-on-items',
          columns: [
            { header: 'Item', accessor: (r) => r.fname ?? '-' },
            { header: 'Qty', accessor: (r) => r.total_quantity ?? 0 },
            { header: 'SGST', accessor: (r) => r.total_sgst ?? 0 },
            { header: 'CGST', accessor: (r) => r.total_cgst ?? 0 },
            { header: 'Tax', accessor: (r) => r.total_tax ?? 0 },
          ],
          rows: taxOnItems,
        },
      };
      const cfg = configs[activeReport];
      if (cfg) {
        await exportToExcel({ filename: cfg.filename, columns: cfg.columns, rows: cfg.rows });
      }
    } finally {
      setExporting(false);
    }
  };

  const totals = useMemo(() => {
    return salesOverview.reduce(
      (acc, row) => {
        acc.days += 1;
        acc.orders += Number(row.totalSales || 0);
        acc.revenue += Number(row.totalRevenue || 0);
        return acc;
      },
      { days: 0, orders: 0, revenue: 0 }
    );
  }, [salesOverview]);

  const discountedTotals = useMemo(() => {
    return discountedOrders.reduce(
      (acc, row) => {
        acc.orders += 1;
        acc.totalDiscount += Number(row.discount_amount || 0);
        acc.gross += Number(row.Initial_price || 0);
        acc.net += Number(row.Final_Price || 0);
        return acc;
      },
      { orders: 0, totalDiscount: 0, gross: 0, net: 0 }
    );
  }, [discountedOrders]);

  const showDateRange = activeReport !== 'dayEndSummary';

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-2xl p-4 md:p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-on-light">Reports</h2>
          <p className="text-sm text-muted">Generate summaries, date-range reports, and exports using the same app theme.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="flex flex-wrap items-end gap-3">
          {showDateRange && (
            <>
              <DateField label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-w-[220px]" />
              <DateField label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-w-[220px]" />
            </>
          )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full justify-center"
              onClick={loadReports}
              disabled={loading}
              aria-label={activeReport === 'dayEndSummary' ? 'Refresh day-end summary' : 'Run reports'}
              title={activeReport === 'dayEndSummary' ? 'Refresh day-end summary' : 'Run reports'}
            >
              {loading ? 'Loading...' : activeReport === 'dayEndSummary' ? (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Refresh</span>
                </>
              ) : 'Run Reports'}
            </Button>
            {showDateRange && (
              <Button className="w-full justify-center" variant="secondary" onClick={exportCurrentReport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            )}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      {activeReport === 'dayEndSummary' && (
        <div className="space-y-4">
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <ReportCard label="Today Revenue" value={formatCurrency(dayEnd.revenue)} />
            <ReportCard label="Today Sales" value={dayEnd.sales} />
            <ReportCard label="Today Tax" value={formatCurrency(dayEnd.tax)} />
            <ReportCard label="Yesterday Revenue" value={formatCurrency(dayEnd.yesterdayRevenue)} />
            <ReportCard label="Discounted Orders" value={dayEnd.discounted} />
            <ReportCard label="Deleted Orders" value={dayEnd.deleted} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-card rounded-2xl p-4 md:p-5 space-y-2">
              <p className="text-sm font-semibold text-on-light">Most Sold Items</p>
              {dayEnd.mostSoldItems.length === 0 ? (
                <p className="text-sm text-muted">No data</p>
              ) : dayEnd.mostSoldItems.map((item, i) => (
                <p key={i} className="text-sm text-on-light">{i + 1}. {item}</p>
              ))}
            </div>
            <div className="surface-card rounded-2xl p-4 md:p-5 space-y-2">
              <p className="text-sm font-semibold text-on-light">Most Sold Categories</p>
              {dayEnd.mostSoldCategories.length === 0 ? (
                <p className="text-sm text-muted">No data</p>
              ) : dayEnd.mostSoldCategories.map((cat, i) => (
                <p key={i} className="text-sm text-on-light">{i + 1}. {cat}</p>
              ))}
            </div>
            <div className="surface-card rounded-2xl p-4 md:p-5 space-y-2">
              <p className="text-sm font-semibold text-on-light">Highest Revenue Items</p>
              {dayEnd.highestRevenueItems.length === 0 ? (
                <p className="text-sm text-muted">No data</p>
              ) : dayEnd.highestRevenueItems.map((item, i) => (
                <p key={i} className="text-sm text-on-light">{i + 1}. {item}</p>
              ))}
            </div>
            <div className="surface-card rounded-2xl p-4 md:p-5 space-y-2">
              <p className="text-sm font-semibold text-on-light">Highest Revenue Category</p>
              {dayEnd.highestRevenueCategory.length === 0 ? (
                <p className="text-sm text-muted">No data</p>
              ) : dayEnd.highestRevenueCategory.map((cat, i) => (
                <p key={i} className="text-sm text-on-light">{i + 1}. {cat}</p>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeReport === 'salesOverview' && (
      <SalesOverviewTable data={salesOverview} />
      )}

      {activeReport === 'categorySales' && (
      <CategorySalesTable data={categorySales} />
      )}

      {activeReport === 'discountedOrders' && (
      <div className="space-y-4">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ReportCard label="Discounted Orders" value={discountedTotals.orders} />
          <ReportCard label="Gross Amount" value={formatCurrency(discountedTotals.gross)} />
          <ReportCard label="Total Discount" value={formatCurrency(discountedTotals.totalDiscount)} />
          <ReportCard label="Net Amount" value={formatCurrency(discountedTotals.net)} />
        </section>

        <section className="surface-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-on-light flex items-center justify-between"><h3 className="font-bold text-on-light">Discounted Orders</h3><Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: 'discounted-orders', columns: [{ header: 'Bill', accessor: (r) => r.billno ?? '-' }, { header: 'Date', accessor: (r) => formatDate(r.date) }, { header: 'Table', accessor: (r) => r.table_label || '-' }, { header: 'Initial', accessor: (r) => r.Initial_price ?? 0 }, { header: 'Discount %', accessor: (r) => Number(r.discount_percentage || 0).toFixed(2) }, { header: 'Discount Amt', accessor: (r) => r.discount_amount ?? 0 }, { header: 'Final', accessor: (r) => r.Final_Price ?? 0 }], rows: sortedDiscountedOrders })}>Export</Button></div>
          <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
            <table className="w-full min-w-[960px]">
              <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
                <tr>
                  <SortHeader label="Bill" sortKey="billno" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Date" sortKey="date" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Table" sortKey="table_label" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Initial" sortKey="Initial_price" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Discount %" sortKey="discount_percentage" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Discount Amt" sortKey="discount_amount" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                  <SortHeader label="Final" sortKey="Final_Price" sortConfig={sortConfigDiscounted} onSort={requestSortDiscounted} />
                </tr>
              </thead>
              <tbody>
                {sortedDiscountedOrders.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-sm text-muted">No discounted orders for this range.</td></tr>
                ) : sortedDiscountedOrders.map((row, i) => (
                  <tr key={row.billno ?? `disc-${i}`} className="border-b border-subtle">
                    <td className="px-3 py-2 text-sm text-on-light">{row.billno ?? '-'}</td>
                    <td className="px-3 py-2 text-sm text-on-light">{formatDate(row.date)}</td>
                    <td className="px-3 py-2 text-sm text-on-light">{row.table_label || '-'}</td>
                    <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.Initial_price)}</td>
                    <td className="px-3 py-2 text-sm text-on-light">{Number(row.discount_percentage || 0).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.discount_amount)}</td>
                    <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.Final_Price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}

      {activeReport === 'topSellingItems' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light"><h3 className="font-bold text-on-light">Top Selling Items by Day</h3></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <TopItemsTable data={topItems} />
        </div>
      </section>
      )}

      {activeReport === 'topSellingCategory' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light"><h3 className="font-bold text-on-light">Top Categories by Day</h3></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <TopCategoriesTable data={topCategories} />
        </div>
      </section>
      )}

      {activeReport === 'itemSummary' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light flex items-center justify-between"><h3 className="font-bold text-on-light">Item Summary</h3><Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: 'item-summary', columns: [{ header: 'Category', accessor: (r) => r.categoryName ?? '-' }, { header: 'Item', accessor: (r) => r.item ?? '-' }, { header: 'Qty', accessor: (r) => r.quantity ?? 0 }, { header: 'Revenue', accessor: (r) => r.revenue ?? 0 }], rows: sortedItemSummary })}>Export</Button></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[580px]">
            <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
              <tr>
                <SortHeader label="Category" sortKey="categoryName" sortConfig={sortConfigItem} onSort={requestSortItem} />
                <SortHeader label="Item" sortKey="item" sortConfig={sortConfigItem} onSort={requestSortItem} />
                <SortHeader label="Qty" sortKey="quantity" sortConfig={sortConfigItem} onSort={requestSortItem} />
                <SortHeader label="Revenue" sortKey="revenue" sortConfig={sortConfigItem} onSort={requestSortItem} />
              </tr>
            </thead>
            <tbody>
              {sortedItemSummary.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-sm text-muted">No item summary data.</td></tr>
              ) : sortedItemSummary.map((row, i) => (
                <tr key={`${row.item ?? 'x'}-${i}`} className="border-b border-subtle">
                  <td className="px-3 py-2 text-sm text-muted">{row.categoryName ?? '-'}</td>
                  <td className="px-3 py-2 text-sm font-medium text-on-light">{row.item ?? '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{row.quantity ?? 0}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeReport === 'employeeAnalysis' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light flex items-center justify-between"><h3 className="font-bold text-on-light">Employee Analysis</h3><Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: 'employee-analysis', columns: [{ header: 'Name', accessor: (r) => r.name ?? '-' }, { header: 'Orders', accessor: (r) => r.order_count ?? 0 }, { header: 'Units Sold', accessor: (r) => r.total_units ?? 0 }, { header: 'Revenue', accessor: (r) => r.total_revenue ?? 0 }], rows: sortedEmployeeAnalysis })}>Export</Button></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[580px]">
            <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
              <tr>
                <SortHeader label="Name" sortKey="name" sortConfig={sortConfigEmployee} onSort={requestSortEmployee} />
                <SortHeader label="Orders" sortKey="order_count" sortConfig={sortConfigEmployee} onSort={requestSortEmployee} />
                <SortHeader label="Units Sold" sortKey="total_units" sortConfig={sortConfigEmployee} onSort={requestSortEmployee} />
                <SortHeader label="Revenue" sortKey="total_revenue" sortConfig={sortConfigEmployee} onSort={requestSortEmployee} />
              </tr>
            </thead>
            <tbody>
              {sortedEmployeeAnalysis.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-sm text-muted">No employee data.</td></tr>
              ) : sortedEmployeeAnalysis.map((row, i) => (
                <tr key={row.userid ?? `emp-${i}`} className="border-b border-subtle">
                  <td className="px-3 py-2 text-sm font-medium text-on-light">{row.name ?? '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{row.order_count ?? 0}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{row.total_units ?? 0}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeReport === 'bestInCategory' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light flex items-center justify-between"><h3 className="font-bold text-on-light">Best In Category</h3><Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: 'best-in-category', columns: [{ header: 'Category', accessor: (r) => r.catname ?? '-' }, { header: 'Top Item(s)', accessor: (r) => (r.top_items ?? []).join(', ') }], rows: sortedBestInCategory })}>Export</Button></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[460px]">
            <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
              <tr>
                <SortHeader label="Category" sortKey="catname" sortConfig={sortConfigBest} onSort={requestSortBest} />
                <th className="px-3 py-2 text-left text-xs uppercase text-muted">Top Item(s)</th>
              </tr>
            </thead>
            <tbody>
              {sortedBestInCategory.length === 0 ? (
                <tr><td colSpan={2} className="px-3 py-6 text-sm text-muted">No data.</td></tr>
              ) : sortedBestInCategory.map((row, i) => (
                <tr key={row.catid ?? `bic-${i}`} className="border-b border-subtle">
                  <td className="px-3 py-2 text-sm font-medium text-on-light">{row.catname ?? '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{(row.top_items ?? []).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeReport === 'taxOnItems' && (
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-on-light flex items-center justify-between"><h3 className="font-bold text-on-light">Tax On Items</h3><Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: 'tax-on-items', columns: [{ header: 'Item', accessor: (r) => r.fname ?? '-' }, { header: 'Qty', accessor: (r) => r.total_quantity ?? 0 }, { header: 'SGST', accessor: (r) => r.total_sgst ?? 0 }, { header: 'CGST', accessor: (r) => r.total_cgst ?? 0 }, { header: 'Tax', accessor: (r) => r.total_tax ?? 0 }], rows: sortedTaxOnItems })}>Export</Button></div>
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full min-w-[620px]">
            <thead className="sticky top-0 z-10 bg-input border-b border-on-light">
              <tr>
                <SortHeader label="Item" sortKey="fname" sortConfig={sortConfigTax} onSort={requestSortTax} />
                <SortHeader label="Qty" sortKey="total_quantity" sortConfig={sortConfigTax} onSort={requestSortTax} />
                <SortHeader label="SGST" sortKey="total_sgst" sortConfig={sortConfigTax} onSort={requestSortTax} />
                <SortHeader label="CGST" sortKey="total_cgst" sortConfig={sortConfigTax} onSort={requestSortTax} />
                <SortHeader label="Tax" sortKey="total_tax" sortConfig={sortConfigTax} onSort={requestSortTax} />
              </tr>
            </thead>
            <tbody>
              {sortedTaxOnItems.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-sm text-muted">No tax data.</td></tr>
              ) : sortedTaxOnItems.map((row, i) => (
                <tr key={`${row.fname ?? 'x'}-${i}`} className="border-b border-subtle">
                  <td className="px-3 py-2 text-sm font-medium text-on-light">{row.fname ?? '-'}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{row.total_quantity ?? 0}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.total_sgst)}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.total_cgst)}</td>
                  <td className="px-3 py-2 text-sm text-on-light">{formatCurrency(row.total_tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}