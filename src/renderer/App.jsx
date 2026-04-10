import { useEffect, useState } from 'react';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import ipcService from '@/services/ipcService';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        if (!ipcService.isAvailable()) {
          if (mounted) setError('Electron IPC is unavailable.');
          return;
        }

        const sessionUser = await ipcService.invoke('get-session-user');
        if (mounted && sessionUser) {
          setUser(sessionUser);
        }
      } catch (sessionError) {
        console.error('Failed to restore session:', sessionError);
        if (mounted) setError('Unable to restore previous session.');
      } finally {
        if (mounted) setBooting(false);
      }
    };

    restoreSession();
    return () => { mounted = false; };
  }, []);

  const handleLogin = async ({ username, password }) => {
    setLoading(true);
    setError('');
    try {
      const loggedInUser = await ipcService.invoke('login', { username, password });
      if (!loggedInUser) {
        setError('Invalid username or password.');
        return;
      }
      setUser(loggedInUser);
    } catch (loginError) {
      console.error('Login failed:', loginError);
      setError('Unable to login right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await ipcService.invoke('logout');
    } catch (logoutError) {
      console.error('Logout failed:', logoutError);
    }
    setUser(null);
    setError('');
  };

  if (booting) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-on-light)' }}
      >
        <p className="text-sm tracking-[0.25em] uppercase" style={{ opacity: 0.6 }}>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} />;
}