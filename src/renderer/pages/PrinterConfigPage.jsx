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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await ipcService.invoke('get-printer-config');
        if (!mountedRef.current) return;
        setVendorId(config.vendorId ?? '');
        setProductId(config.productId ?? '');
        setVendorIdDec(config.vendorIdDec != null ? String(config.vendorIdDec) : '');
        setProductIdDec(config.productIdDec != null ? String(config.productIdDec) : '');
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
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await ipcService.invoke('save-printer-config', { vendorId, productId });
      if (!mountedRef.current) return;
      if (!result?.success) {
        setError(result?.error || 'Failed to save printer config.');
        return;
      }
      setMessage('Printer configuration saved.');
    } catch (err) {
      console.error('Failed to save printer config:', err);
      if (mountedRef.current) setError('Could not save printer configuration.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) {
    return <section className="surface-card rounded-2xl p-6 text-sm text-muted">Loading printer config...</section>;
  }

  return (
    <section className="surface-card rounded-2xl p-5 space-y-5 max-w-lg">
      <div>
        <h2 className="text-xl font-black text-on-light">Printer Configuration</h2>
        <p className="text-sm text-muted mt-1">Set the USB Vendor and Product ID for your receipt printer.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs uppercase text-muted mb-1">Vendor ID (hex)</label>
          <input
            value={vendorId}
            onChange={(e) => updateFromHex('vendor', e.target.value)}
            placeholder="0x0525"
            className="surface-input h-10 w-full rounded-lg px-3 font-mono"
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
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-muted mb-1">Product ID (dec)</label>
            <input
              value={productIdDec}
              onChange={(e) => updateFromDec('product', e.target.value)}
              placeholder="42752"
              className="surface-input h-10 w-full rounded-lg px-3"
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</Button>
    </section>
  );
}