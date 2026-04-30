import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

export default function BackupRestorePage({ mode }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyUsername, setKeyUsername] = useState('');
  const [keyPassword, setKeyPassword] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [restoreSourceKey, setRestoreSourceKey] = useState('');
  const mountedRef = useRef(true);

  const isBackup = mode === 'backup';

  const handleCopyKey = async () => {
    setError('');
    setKeyCopied(false);
    setKeyLoading(true);
    try {
      const result = await ipcService.invoke('get-db-encryption-key', {
        username: keyUsername,
        password: keyPassword,
      });
      if (result?.success && result.key) {
        await navigator.clipboard.writeText(result.key);
        setEncryptionKey(result.key);
        setKeyCopied(true);
        setShowKeyForm(false);
        setKeyUsername('');
        setKeyPassword('');
        setTimeout(() => setKeyCopied(false), 3000);
      } else {
        setError(result?.message || 'Failed to retrieve encryption key.');
      }
    } catch (err) {
      console.error('Failed to get encryption key:', err);
      setError('Failed to retrieve encryption key.');
    } finally {
      setKeyLoading(false);
    }
  };

  const runAction = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const channel = isBackup ? 'backup-database-local' : 'restore-database-local';
      const replyChannel = isBackup ? 'backup-local-completed' : 'restore-local-completed';
      const payload = !isBackup && restoreSourceKey.trim() ? restoreSourceKey.trim() : undefined;

      const result = await ipcService.requestReply(channel, replyChannel, payload, 30000);
      if (!mountedRef.current) return;

      if (result?.[0]) {
        setMessage(isBackup ? 'Database backed up successfully.' : 'Database restored successfully.');
      } else {
        setError(isBackup ? 'Backup was cancelled or failed.' : 'Restore was cancelled or failed.');
      }
    } catch (err) {
      console.error(`${isBackup ? 'Backup' : 'Restore'} failed:`, err);
      if (mountedRef.current) setError(`${isBackup ? 'Backup' : 'Restore'} operation failed.`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 12rem)' }}>
      <section className="surface-card rounded-2xl p-6 space-y-5 max-w-lg w-full">
        <div className="text-center">
          <h2 className="text-xl font-black text-on-light">{isBackup ? 'Backup Database' : 'Restore Database'}</h2>
          <p className="text-sm text-muted mt-1">
            {isBackup
              ? 'Create a backup copy of your database to a local file.'
              : 'Restore your database from a previously created backup file.'}
          </p>
        </div>

        {isBackup && (
          <div className="space-y-3">
            <p className="text-xs text-muted">Need to transfer this backup to another machine? Copy the encryption key first.</p>

            {!showKeyForm && !encryptionKey && (
              <Button onClick={() => setShowKeyForm(true)} variant="secondary" size="sm">
                Copy Encryption Key
              </Button>
            )}

            {showKeyForm && (
              <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: 'var(--border-on-light)' }}>
                <p className="text-xs font-medium text-on-light">Verify your admin credentials</p>
                <input
                  type="text"
                  value={keyUsername}
                  onChange={(e) => setKeyUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ background: 'var(--bg-input, var(--bg-app))', color: 'var(--text-on-light)', borderColor: 'var(--border-on-light)' }}
                />
                <input
                  type="password"
                  value={keyPassword}
                  onChange={(e) => setKeyPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ background: 'var(--bg-input, var(--bg-app))', color: 'var(--text-on-light)', borderColor: 'var(--border-on-light)' }}
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleCopyKey} disabled={keyLoading} size="sm">
                    {keyLoading ? 'Verifying...' : 'Verify & Copy Key'}
                  </Button>
                  <Button onClick={() => { setShowKeyForm(false); setKeyUsername(''); setKeyPassword(''); }} variant="secondary" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {encryptionKey && (
              <div className="flex items-center gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(encryptionKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 3000); }} variant="secondary" size="sm">
                  {keyCopied ? 'Copied!' : 'Copy Again'}
                </Button>
                <code className="text-xs text-muted truncate" style={{ maxWidth: '260px' }}>{encryptionKey}</code>
              </div>
            )}
          </div>
        )}

        {!isBackup && (
          <>
            <div className="rounded-lg border border-on-light p-3 text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-on-light)' }}>
              Restoring will overwrite your current database. Make sure you have a backup before proceeding.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted">
                Source backup encryption key
                <span className="text-muted ml-1">(only needed if backup was made on another machine)</span>
              </label>
              <input
                type="text"
                value={restoreSourceKey}
                onChange={(e) => setRestoreSourceKey(e.target.value)}
                placeholder="Leave empty if backup is from this machine"
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ background: 'var(--bg-input, var(--bg-app))', color: 'var(--text-on-light)', borderColor: 'var(--border-on-light)' }}
              />
            </div>
          </>
        )}

        {error ? <p className="text-sm text-error text-center">{error}</p> : null}
        {message ? <p className="text-sm text-success text-center">{message}</p> : null}

        <div className="flex justify-center">
          <Button onClick={runAction} disabled={loading} variant={isBackup ? 'default' : 'secondary'}>
            {loading ? (isBackup ? 'Backing up...' : 'Restoring...') : (isBackup ? 'Create Backup' : 'Restore from Backup')}
          </Button>
        </div>
      </section>
    </div>
  );
}