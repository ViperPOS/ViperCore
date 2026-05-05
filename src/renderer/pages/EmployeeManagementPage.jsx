import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ToastProvider';
import ipcService from '@/services/ipcService';

export default function EmployeeManagementPage({ user }) {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadEmployees();
    return () => { mountedRef.current = false; };
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const result = await ipcService.invoke('get-all-employees');
      if (mountedRef.current) {
        if (result?.success && Array.isArray(result.employees)) {
          setEmployees(result.employees.filter(emp => emp.userid !== user?.userid));
        } else {
          toast.error('Failed to load employees.');
        }
      }
    } catch (err) {
      console.error('Load employees failed:', err);
      if (mountedRef.current) {
        toast.error('Unable to load employees.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee) return;
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Both password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setResettingPassword(true);
    try {
      const result = await ipcService.invoke('admin-reset-employee-password', {
        targetUserid: selectedEmployee.userid,
        newPassword: newPassword.trim(),
      });

      if (mountedRef.current) {
        if (result?.success) {
          toast.success(`Password reset for ${selectedEmployee.username}`);
          setNewPassword('');
          setConfirmPassword('');
          setSelectedEmployee(null);
        } else {
          toast.error(result?.message || 'Failed to reset password.');
        }
      }
    } catch (err) {
      console.error('Reset password failed:', err);
      if (mountedRef.current) {
        toast.error('Unable to reset password.');
      }
    } finally {
      if (mountedRef.current) {
        setResettingPassword(false);
      }
    }
  };

  const handleResetPin = async () => {
    if (!selectedEmployee) return;
    if (!newPin.trim() || !confirmPin.trim()) {
      toast.error('Both PIN fields are required.');
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      toast.error('PIN must be 4-8 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match.');
      return;
    }

    setResettingPin(true);
    try {
      const result = await ipcService.invoke('admin-reset-employee-pin', {
        targetUserid: selectedEmployee.userid,
        newPin: newPin.trim(),
      });

      if (mountedRef.current) {
        if (result?.success) {
          toast.success(`PIN reset for ${selectedEmployee.username}`);
          setNewPin('');
          setConfirmPin('');
          setSelectedEmployee(null);
        } else {
          toast.error(result?.message || 'Failed to reset PIN.');
        }
      }
    } catch (err) {
      console.error('Reset PIN failed:', err);
      if (mountedRef.current) {
        toast.error('Unable to reset PIN.');
      }
    } finally {
      if (mountedRef.current) {
        setResettingPin(false);
      }
    }
  };

  if (!user?.isAdmin) {
    return (
      <section className="surface-card rounded-2xl p-5 space-y-4">
        <p className="text-sm text-error">Only admins can manage employees.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="surface-card rounded-2xl p-5 space-y-4">
        <p className="text-sm text-muted">Loading employees...</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-on-light">Employee Management</h2>
          <p className="text-sm text-muted mt-1">Reset employee passwords and PINs.</p>
        </div>

        {employees.length === 0 ? (
          <p className="text-sm text-muted">No employees found.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {employees.map((emp) => (
              <button
                key={emp.userid}
                onClick={() => {
                  setSelectedEmployee(emp);
                  setNewPassword('');
                  setConfirmPassword('');
                  setNewPin('');
                  setConfirmPin('');
                }}
                className="w-full text-left px-4 py-3 rounded-lg border transition-all"
                style={{
                  backgroundColor: selectedEmployee?.userid === emp.userid ? 'var(--bg-hover)' : 'transparent',
                  borderColor: selectedEmployee?.userid === emp.userid ? 'var(--text-on-light)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-light">{emp.username}</p>
                    <p className="text-xs text-muted">{emp.uname || 'No name'}</p>
                  </div>
                  <div className="text-xs text-muted">
                    {emp.isAdmin ? 'Admin' : 'Employee'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedEmployee && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Reset Password */}
          <section className="surface-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-on-light">Reset Password</h3>
              <p className="text-xs text-muted mt-1">{selectedEmployee.username}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase text-muted mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="surface-input h-10 w-full rounded-lg px-3"
                  disabled={resettingPassword}
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-muted mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="surface-input h-10 w-full rounded-lg px-3"
                  disabled={resettingPassword}
                />
              </div>
            </div>

            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              variant="default"
            >
              {resettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </section>

          {/* Reset PIN */}
          <section className="surface-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-on-light">Reset PIN</h3>
              <p className="text-xs text-muted mt-1">{selectedEmployee.username}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase text-muted mb-1">New PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D+/g, '').slice(0, 8))}
                  placeholder="4-8 digits"
                  className="surface-input h-10 w-full rounded-lg px-3"
                  disabled={resettingPin}
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-muted mb-1">Confirm PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D+/g, '').slice(0, 8))}
                  placeholder="Confirm PIN"
                  className="surface-input h-10 w-full rounded-lg px-3"
                  disabled={resettingPin}
                />
              </div>
            </div>

            <Button
              onClick={handleResetPin}
              disabled={resettingPin}
              variant="default"
            >
              {resettingPin ? 'Resetting...' : 'Reset PIN'}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
