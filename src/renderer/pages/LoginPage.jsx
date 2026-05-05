import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ToastProvider';
import ipcService from '@/services/ipcService';

export default function LoginPage({ onLogin, loading }) {
  const toast = useToast();
  const [method, setMethod] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recovering, setRecovering] = useState(false);
  const loginCardMuted = 'var(--text-on-dark)';
  const loginErrorColor = 'var(--text-on-dark)';
  const loginInputStyle = {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-on-light)',
    border: '1.5px solid var(--border-on-light)',
  };
  const selectedMethodButtonStyle = {
    backgroundColor: 'var(--btn-secondary-bg)',
    color: 'var(--btn-secondary-text)',
    borderColor: 'var(--btn-secondary-border)',
  };
  const unselectedMethodButtonStyle = {
    backgroundColor: 'transparent',
    color: 'var(--text-on-dark)',
    borderColor: 'var(--border-on-dark)',
  };
  const submitButtonStyle = {
    backgroundColor: 'var(--btn-secondary-bg)',
    color: 'var(--btn-secondary-text)',
    borderColor: 'var(--btn-secondary-border)',
  };
  const exitButtonStyle = {
    backgroundColor: 'transparent',
    color: 'var(--text-on-dark)',
    borderColor: 'var(--border-on-dark)',
  };

  const renderStepDots = (currentStep, totalSteps) => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const active = step <= currentStep;
        return (
          <span
            key={step}
            className="h-2.5 w-2.5 rounded-full border"
            style={{
              backgroundColor: active ? 'var(--text-on-dark)' : 'transparent',
              borderColor: 'var(--text-on-dark)',
              opacity: active ? 0.95 : 0.45,
            }}
          />
        );
      })}
    </div>
  );

  const submit = (event) => {
    event.preventDefault();
    if (method === 'pin') {
      onLogin({ method: 'pin', pin: pin.trim() });
      return;
    }

    onLogin({ method: 'password', username: username.trim(), password });
  };

  const resetRecoveryForm = () => {
    setRecoveryStep(1);
    setRecoveryUsername('');
    setMasterPin('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleRecoveryNext = async () => {
    if (recoveryStep === 1) {
      if (!recoveryUsername.trim()) {
        toast.error('Admin username is required.');
        return;
      }
      const usernameCheck = await ipcService.invoke('verify-admin-username', {
        username: recoveryUsername.trim(),
      });
      if (!usernameCheck?.success) {
        toast.error(usernameCheck?.message || 'Admin username not found.');
        return;
      }
      setRecoveryStep(2);
      return;
    }

    if (recoveryStep === 2) {
      if (!masterPin.trim()) {
        toast.error('Master PIN is required.');
        return;
      }
      if (!/^\d{4,8}$/.test(masterPin.trim())) {
        toast.error('Master PIN must be 4 to 8 digits.');
        return;
      }
      const pinCheck = await ipcService.invoke('verify-master-pin', {
        masterPin: masterPin.trim(),
      });
      if (!pinCheck?.success) {
        toast.error(pinCheck?.message || 'Master PIN is incorrect.');
        return;
      }
      setRecoveryStep(3);
      return;
    }

    if (recoveryStep === 3) {
      if (!newPassword.trim()) {
        toast.error('New password is required.');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters.');
        return;
      }
      setRecoveryStep(4);
    }
  };

  const handleRecoveryBack = () => {
    setRecoveryStep((prev) => Math.max(1, prev - 1));
  };

  const handlePasswordRecovery = async (event) => {
    event.preventDefault();
    if (!recoveryUsername.trim() || !masterPin.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setRecovering(true);
    try {
      // Call the admin-reset-password-self Supabase function
      // This would be via ipcService to a handler that calls the function
      const result = await ipcService.invoke('admin-recover-password', {
        adminUsername: recoveryUsername.trim().toLowerCase(),
        masterPin: masterPin.trim(),
        newPassword: newPassword.trim(),
      });

      if (result?.success) {
        toast.success('Password reset successfully. Please log in with your new password.');
        setShowRecovery(false);
        setRecoveryUsername('');
        setMasterPin('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Password recovery failed:', err);
      toast.error('Unable to reset password. Please try again.');
    } finally {
      setRecovering(false);
    }
  };

  const handleExit = () => {
    ipcService.send('exit-app');
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-on-light)' }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, var(--color-a) 2px, transparent 2px), radial-gradient(circle at 75% 75%, var(--color-a) 1.5px, transparent 1.5px)',
          backgroundSize: '60px 60px, 40px 40px',
        }}
      />
      <div
        className="w-full max-w-md rounded-2xl p-8 relative z-10"
        style={{
          backgroundColor: 'var(--color-a)',
          color: 'var(--text-on-dark)',
          border: '2px solid var(--border-on-dark)',
        }}
      >
        <p
          className="text-xs uppercase tracking-[0.3em] font-semibold mb-3"
          style={{ color: 'var(--text-on-dark)' }}
        >
          ViperCore
        </p>
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-on-dark)' }}>
          {showRecovery ? 'Recover Password' : 'Welcome Back'}
        </h1>
        <p className="text-sm mb-6" style={{ color: loginCardMuted, opacity: 0.72 }}>
          {showRecovery
            ? `Step ${recoveryStep} of 4: ${
              recoveryStep === 1
                ? 'Enter admin username.'
                : recoveryStep === 2
                  ? 'Verify with master PIN.'
                  : recoveryStep === 3
                    ? 'Set your new password.'
                    : 'Confirm your new password.'
            }`
            : 'Sign in to continue to your billing dashboard.'}
        </p>

          {showRecovery ? renderStepDots(recoveryStep, 4) : null}

        {!showRecovery ? (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="hover:opacity-90"
              onClick={() => setMethod('password')}
              disabled={loading}
              style={method === 'password'
                ? selectedMethodButtonStyle
                : unselectedMethodButtonStyle}
            >
              Username + Password
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="hover:opacity-90"
              onClick={() => setMethod('pin')}
              disabled={loading}
              style={method === 'pin'
                ? selectedMethodButtonStyle
                : unselectedMethodButtonStyle}
            >
              PIN Login
            </Button>
          </div>

          {method === 'password' ? (
            <>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 rounded-lg px-3 text-sm outline-none"
              style={loginInputStyle}
              placeholder="Enter your username"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 rounded-lg px-3 text-sm outline-none"
              style={loginInputStyle}
              placeholder="Enter your password"
              required
            />
          </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
                PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D+/g, '').slice(0, 8))}
                className="w-full h-11 rounded-lg px-3 text-sm outline-none"
                style={loginInputStyle}
                placeholder="Enter your PIN"
                required
              />
              <p className="text-xs mt-1" style={{ color: loginCardMuted, opacity: 0.72 }}>
                PIN should be 4 to 8 digits.
              </p>
            </div>
          )}

          {/* Error display removed - now using toast notifications */}

          <Button type="submit" size="lg" className="w-full hover:opacity-90" style={submitButtonStyle} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={() => {
              resetRecoveryForm();
              setShowRecovery(true);
            }}
            disabled={loading}
            className="w-full text-xs font-medium py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-on-dark)', opacity: 0.6 }}
          >
            Forgot your password?
          </button>

          <Button type="button" variant="secondary" size="lg" className="w-full hover:opacity-90" style={exitButtonStyle} onClick={handleExit} disabled={loading}>
            Exit App
          </Button>
        </form>
        ) : (
        <form onSubmit={recoveryStep === 4 ? handlePasswordRecovery : async (event) => { event.preventDefault(); await handleRecoveryNext(); }} className="space-y-4">
          {recoveryStep === 1 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
                Admin Username
              </label>
              <input
                type="text"
                value={recoveryUsername}
                onChange={(e) => setRecoveryUsername(e.target.value)}
                className="w-full h-11 rounded-lg px-3 text-sm outline-none"
                style={loginInputStyle}
                placeholder="Your admin username"
                required
                disabled={recovering}
                autoFocus
              />
            </div>
          )}

          {recoveryStep === 2 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
                Master PIN
              </label>
              <input
                type="password"
                value={masterPin}
                onChange={(e) => setMasterPin(e.target.value.replace(/\D+/g, '').slice(0, 8))}
                className="w-full h-11 rounded-lg px-3 text-sm outline-none"
                style={loginInputStyle}
                placeholder="Organization master PIN"
                required
                disabled={recovering}
                autoFocus
              />
              <p className="text-xs mt-1" style={{ color: loginCardMuted, opacity: 0.72 }}>
                4 to 8 digits
              </p>
            </div>
          )}

          {recoveryStep === 3 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 rounded-lg px-3 text-sm outline-none"
                style={loginInputStyle}
                placeholder="At least 6 characters"
                required
                disabled={recovering}
                autoFocus
              />
            </div>
          )}

          {recoveryStep === 4 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-on-dark)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 rounded-lg px-3 text-sm outline-none"
                style={loginInputStyle}
                placeholder="Confirm your new password"
                required
                disabled={recovering}
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1 hover:opacity-90"
              style={exitButtonStyle}
              onClick={handleRecoveryBack}
              disabled={recovering || recoveryStep === 1}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 hover:opacity-90"
              style={submitButtonStyle}
              disabled={recovering}
            >
              {recoveryStep === 4 ? (recovering ? 'Recovering...' : 'Reset Password') : 'Next'}
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full hover:opacity-90"
            style={exitButtonStyle}
            onClick={() => {
              setShowRecovery(false);
              resetRecoveryForm();
            }}
            disabled={recovering}
          >
            Back to Login
          </Button>
        </form>
        )}
      </div>
    </div>
  );
}