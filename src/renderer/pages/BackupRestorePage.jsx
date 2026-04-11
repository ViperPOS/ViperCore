import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ipcService from '@/services/ipcService';

export default function BackupRestorePage({ mode }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const isBackup = mode === 'backup';

  const runAction = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const channel = isBackup ? 'backup-database-local' : 'restore-database-local';
      const replyChannel = isBackup ? 'backup-local-completed' : 'restore-local-completed';

      const result = await ipcService.requestReply(channel, replyChannel, undefined, 30000);
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
    <section className="surface-card rounded-2xl p-5 space-y-4 max-w-lg">
      <div>
        <h2 className="text-xl font-black text-on-light">{isBackup ? 'Backup Database' : 'Restore Database'}</h2>
        <p className="text-sm text-muted mt-1">
          {isBackup
            ? 'Create a backup copy of your database to a local file.'
            : 'Restore your database from a previously created backup file.'}
        </p>
      </div>

      {!isBackup && (
        <div className="rounded-lg border border-on-light p-3 text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-on-light)' }}>
          Restoring will overwrite your current database. Make sure you have a backup before proceeding.
        </div>
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <Button onClick={runAction} disabled={loading} variant={isBackup ? 'default' : 'secondary'}>
        {loading ? (isBackup ? 'Backing up...' : 'Restoring...') : (isBackup ? 'Create Backup' : 'Restore from Backup')}
      </Button>
    </section>
  );
}