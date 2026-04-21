import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

function DialogShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="surface-card w-full max-w-md rounded-2xl p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-black text-on-light">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none p-1 rounded hover:bg-hover transition-colors"
            style={{ color: '#dc2626' }}
          >
            &#x2715;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  busy,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <DialogShell title={title} onClose={() => !busy && onCancel?.()}>
      <p className="text-sm text-muted mb-5">{message}</p>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>{cancelText}</Button>
        <Button type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmText}</Button>
      </div>
    </DialogShell>
  );
}

export function PromptDialog({
  open,
  title,
  message,
  label,
  initialValue = '',
  inputType = 'text',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  busy,
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <DialogShell title={title} onClose={() => !busy && onCancel?.()}>
      {message ? <p className="text-sm text-muted mb-3">{message}</p> : null}
      {label ? <label className="block text-xs uppercase text-muted mb-1">{label}</label> : null}
      <input
        type={inputType}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="surface-input h-10 w-full rounded-lg px-3 mb-5"
        disabled={busy}
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>{cancelText}</Button>
        <Button type="button" onClick={() => onConfirm?.(value)} disabled={busy}>{busy ? 'Working...' : confirmText}</Button>
      </div>
    </DialogShell>
  );
}
