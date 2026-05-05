import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
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
  const toast = useToast();
  const [info, setInfo] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
        if (mountedRef.current) toast.error('Could not load business information.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const result = await ipcService.requestReply('save-business-info', 'save-business-info-response', draft);
      if (!mountedRef.current) return;
      if (result?.success) {
        setInfo(draft);
        setEditOpen(false);
        toast.success('Business information saved.');
      } else {
        toast.error(result?.message || 'Failed to save business information.');
      }
    } catch (err) {
      if (mountedRef.current) toast.error('Could not save business information.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) {
    return <section className="surface-card rounded-2xl p-6 text-sm text-muted">Loading...</section>;
  }

  const renderValue = (value) => {
    const text = String(value || '').trim();
    return text ? text : 'Not set';
  };

  return (
    <>
      <section className="surface-card rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-on-light">Business Information</h2>
            <p className="text-sm text-muted mt-1">Preview the business profile used across receipts and reports.</p>
          </div>
          <Button onClick={() => { setDraft(info); setEditOpen(true); }}>Edit Business Info</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-on-light bg-app p-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Business Profile</p>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-on-light">{renderValue(info.businessName)}</h3>
              <p className="text-sm text-muted">{renderValue(info.tagline)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Owner Name" value={renderValue(info.ownerName)} />
              <InfoTile label="Phone" value={renderValue(info.phone)} />
              <InfoTile label="Email" value={renderValue(info.email)} />
              <InfoTile label="Business Hours" value={renderValue(info.hours)} />
            </div>
          </div>

          <div className="rounded-2xl border border-on-light bg-card p-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Address</p>
            <div className="rounded-2xl border border-subtle bg-app p-4 min-h-[8rem]">
              <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-on-light">
                {renderValue(info.address)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-on-light bg-app p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Help</p>
          <p className="mt-2 text-sm font-semibold text-on-light">
            Contact 9108816244 for help or alstondmendonca@gmail.com
          </p>
        </div>
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !saving && setEditOpen(false)}>
          <div
            className="surface-card w-full max-w-2xl rounded-2xl p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-on-light">Edit Business Information</h3>
                <p className="text-sm text-muted mt-1">Update the business profile used by the app.</p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setEditOpen(false)}
                className="text-lg leading-none p-1 rounded hover:bg-hover transition-colors"
                style={{ color: '#dc2626' }}
              >
                &#x2715;
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs uppercase text-muted mb-1">{field.label}</label>
                  {field.key === 'address' ? (
                    <textarea
                      value={draft[field.key] ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="surface-input min-h-28 w-full rounded-lg px-3 py-2 text-sm"
                      rows={4}
                      disabled={saving}
                    />
                  ) : (
                    <input
                      value={draft[field.key] ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="surface-input h-10 w-full rounded-lg px-3 text-sm"
                      disabled={saving}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Business Info'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-subtle bg-card p-3">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-light whitespace-pre-wrap leading-5">{value}</p>
    </div>
  );
}