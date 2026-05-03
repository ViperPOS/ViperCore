import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

export default function PrinterConfig() {
  const [vendorId, setVendorId] = useState('');
  const [productId, setProductId] = useState('');
  const [vendorIdDec, setVendorIdDec] = useState('');
  const [productIdDec, setProductIdDec] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [printers, setPrinters] = useState([]);
  const [status, setStatus] = useState({ connected: false, busy: false, hasLastReceipt: false });
  const [testedSignature, setTestedSignature] = useState('');
  const [usePrinter, setUsePrinter] = useState(true);
  const mountedRef = useRef(true);

  const signature = `${String(vendorId || '').trim()}|${String(productId || '').trim()}`;

  const loadStatus = async () => {
    try {
      const result = await ipcService.invoke('printer:status');
      if (!mountedRef.current) return;
      setStatus(result || { connected: false, busy: false, hasLastReceipt: false });
    } catch (err) {
      console.error('Failed to load printer status:', err);
    }
  };

  const scanPrinters = async () => {
    setScanning(true);
    try {
      const result = await ipcService.invoke('printer:list');
      if (!mountedRef.current) return;
      if (!result?.success) {
        setError(result?.error || 'Could not list USB printers.');
        return;
      }
      setPrinters(Array.isArray(result.printers) ? result.printers : []);
    } catch (err) {
      console.error('Failed to scan printers:', err);
      if (mountedRef.current) setError('Could not list USB printers.');
    } finally {
      if (mountedRef.current) setScanning(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [config, settings] = await Promise.all([
          ipcService.invoke('get-printer-config'),
          ipcService.invoke('load-ui-settings'),
        ]);
        if (!mountedRef.current) return;
        setUsePrinter(settings?.usePrinter !== false);
        setVendorId(config.vendorId ?? '');
        setProductId(config.productId ?? '');
        setVendorIdDec(config.vendorIdDec != null ? String(config.vendorIdDec) : '');
        setProductIdDec(config.productIdDec != null ? String(config.productIdDec) : '');
        if (settings?.usePrinter !== false) {
          await Promise.all([scanPrinters(), loadStatus()]);
        }
      } catch (err) {
        console.error('Failed to load printer config:', err);
        if (mountedRef.current) setError('Could not load printer configuration.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  const updateFromHex = (field, value) => {
    setTestedSignature('');
    if (field === 'vendor') {
      setVendorId(value);
      const dec = parseInt(value, 16);
      setVendorIdDec(isNaN(dec) ? '' : String(dec));
    } else {
      setProductId(value);
      const dec = parseInt(value, 16);
      setProductIdDec(isNaN(dec) ? '' : String(dec));
    }
  };

  const updateFromDec = (field, value) => {
    setTestedSignature('');
    if (field === 'vendor') {
      setVendorIdDec(value);
      const num = parseInt(value, 10);
      setVendorId(isNaN(num) ? '' : `0x${num.toString(16).padStart(4, '0').toUpperCase()}`);
    } else {
      setProductIdDec(value);
      const num = parseInt(value, 10);
      setProductId(isNaN(num) ? '' : `0x${num.toString(16).padStart(4, '0').toUpperCase()}`);
    }
  };

  const save = async () => {
    if (!usePrinter) {
      setError('Printer feature is disabled. Enable Use Printer in Settings > Feature Toggles.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    if (!vendorId || !productId) {
      setSaving(false);
      setError('Vendor ID and Product ID are required.');
      return;
    }
    try {
      const result = await ipcService.invoke('save-printer-config', { vendorId, productId });
      if (!mountedRef.current) return;
      if (!result?.success) {
        setError(result?.error || 'Failed to save printer config.');
        return;
      }
      const warning = result?.warning ? ` ${result.warning}` : '';
      setMessage(`Printer configuration saved.${warning}`);
      await loadStatus();
    } catch (err) {
      console.error('Failed to save printer config:', err);
      if (mountedRef.current) setError('Could not save printer configuration.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const testPrint = async () => {
    if (!usePrinter) {
      setError('Printer feature is disabled. Enable Use Printer in Settings > Feature Toggles.');
      return;
    }
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.invoke('printer:test', { vendorId, productId });
      if (!mountedRef.current) return;
      if (!result?.success) {
        setError(result?.error || 'Test print failed.');
        return;
      }
      setTestedSignature(signature);
      setMessage('Test print successful. Printer is ready.');
      await loadStatus();
    } catch (err) {
      console.error('Failed test print:', err);
      if (mountedRef.current) setError('Could not complete test print.');
    } finally {
      if (mountedRef.current) setTesting(false);
    }
  };

  const selectPrinter = (printer) => {
    setTestedSignature('');
    const nextVendor = printer?.vendorId || '';
    const nextProduct = printer?.productId || '';
    setVendorId(nextVendor);
    setProductId(nextProduct);
    setVendorIdDec(printer?.vendorIdDec != null ? String(printer.vendorIdDec) : '');
    setProductIdDec(printer?.productIdDec != null ? String(printer.productIdDec) : '');
  };

  if (loading) {
    return <section className="surface-card rounded-2xl p-6 text-sm text-muted">Loading printer config...</section>;
  }

  return (
    <section className="surface-card rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-xl font-black text-on-light">Printer Configuration</h2>
        <p className="text-sm text-muted mt-1">Select a USB printer, test it, then save the configuration.</p>
        {!usePrinter ? (
          <p className="text-xs mt-2" style={{ color: 'var(--status-error)' }}>
            Printer feature is disabled in Settings - Feature Toggles.
          </p>
        ) : null}
        <p className="text-xs mt-2" style={{ color: status.connected ? 'var(--status-success)' : 'var(--text-muted)' }}>
          Status: {!usePrinter ? 'Disabled' : status.busy ? 'Printing...' : status.connected ? 'Ready' : 'Not initialized'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase text-muted">Detected USB Printers</p>
          <Button size="sm" variant="secondary" onClick={scanPrinters} disabled={!usePrinter || scanning || saving || testing}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Button>
        </div>
        <div className="max-h-36 overflow-auto rounded-lg border border-on-light p-2 space-y-2">
          {printers.length === 0 ? <p className="text-xs text-muted">No printers detected.</p> : null}
          {printers.map((printer) => (
            <button
              type="button"
              key={printer.id}
              onClick={() => selectPrinter(printer)}
              className="w-full text-left rounded-md border border-on-light px-2 py-1.5 hover:bg-hover"
            >
              <p className="text-sm text-on-light font-medium">{printer.vendorId} / {printer.productId}</p>
              <p className="text-xs text-muted">Decimal: {printer.vendorIdDec} / {printer.productIdDec}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs uppercase text-muted mb-1">Vendor ID (hex)</label>
          <input
            value={vendorId}
            onChange={(e) => updateFromHex('vendor', e.target.value)}
            placeholder="0x0525"
            className="surface-input h-10 w-full rounded-lg px-3 font-mono"
            disabled={!usePrinter}
          />
          {vendorIdDec && (
            <p className="text-xs text-muted mt-1">Decimal: {vendorIdDec}</p>
          )}
        </div>
        <div>
          <label className="block text-xs uppercase text-muted mb-1">Product ID (hex)</label>
          <input
            value={productId}
            onChange={(e) => updateFromHex('product', e.target.value)}
            placeholder="0xA700"
            className="surface-input h-10 w-full rounded-lg px-3 font-mono"
            disabled={!usePrinter}
          />
          {productIdDec && (
            <p className="text-xs text-muted mt-1">Decimal: {productIdDec}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Vendor ID (dec)</label>
            <input
              value={vendorIdDec}
              onChange={(e) => updateFromDec('vendor', e.target.value)}
              placeholder="1317"
              className="surface-input h-10 w-full rounded-lg px-3"
              disabled={!usePrinter}
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Product ID (dec)</label>
            <input
              value={productIdDec}
              onChange={(e) => updateFromDec('product', e.target.value)}
              placeholder="42752"
              className="surface-input h-10 w-full rounded-lg px-3"
              disabled={!usePrinter}
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving || !usePrinter}>{saving ? 'Saving...' : 'Save Printer Settings'}</Button>
        <Button onClick={testPrint} disabled={testing || !usePrinter} variant="secondary">{testing ? 'Testing...' : 'Print Test Page'}</Button>
      </div>
    </section>
  );
}
