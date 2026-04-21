import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

const FIELDS = [
  { key: 'businessName', label: 'Business Name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'hours', label: 'Business Hours' },
  { key: 'ownerName', label: 'Owner Name' },
];

export default function BusinessInfoPage() {
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await ipcService.invoke('load-business-info');
        if (!mountedRef.current) return;
        const safe = {};
        if (data && typeof data === 'object') {
          for (const f of FIELDS) {
            const val = data[f.key];
            safe[f.key] = typeof val === 'string' ? val : '';
          }
        }
        setInfo(safe);
      } catch (err) {
        console.error('Failed to load business info:', err);
        if (mountedRef.current) setError('Could not load business information.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await ipcService.requestReply('save-business-info', 'save-business-info-response', info);
      if (!mountedRef.current) return;
      if (result?.success) {
        setMessage('Business information saved.');
      } else {
        setError(result?.message || 'Failed to save business information.');
      }
    } catch (err) {
      if (mountedRef.current) setError('Could not save business information.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) {
    return <section className="surface-card rounded-2xl p-6 text-sm text-muted">Loading...</section>;
  }

  return (
    <section className="surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-black text-on-light">Business Information</h2>
        <p className="text-sm text-muted mt-1">Edit your business details for receipts and reports.</p>
      </div>

      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs uppercase text-muted mb-1">{f.label}</label>
            <input
              value={info[f.key] ?? ''}
              onChange={(e) => setInfo((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="surface-input h-10 w-full rounded-lg px-3 text-sm"
            />
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Business Info'}</Button>
    </section>
  );
}