import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api, setClientSecurityTokens, extractErrorMessage } from '../api';
import { ShieldCheck, KeyRound, MailCheck, ArrowLeft, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, notify } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await loginWithCredentials(email, password);
      notify('success', `Welcome back, ${loggedIn.name}`, 'Session authenticated with HttpOnly + CSRF protection.');
      navigate(loggedIn.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await loginWithCredentials(demoEmail, demoPass);
      notify('success', `Signed in as ${loggedIn.name}`, `Role: ${loggedIn.role.toUpperCase()}`);
      navigate(loggedIn.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Aarambh AI Home</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your workspace</h1>
        <p className="mt-1 text-xs text-slate-600">
          Access your AI event blueprints, paise-accurate INR budgets, and vendor ledgers.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 border border-slate-200 rounded-xl shadow-xs">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya.sharma@aarambh-events.in"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* One-Click Pre-Seeded Test Accounts for Immediate Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2.5">
              Instant Evaluation Accounts (Pre-Seeded MongoDB Data)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('priya.sharma@aarambh-events.in', 'Aarambh@2026!')}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-900">Priya Sharma · Customer / Event Owner</p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    2 Events (Udaipur Wedding ₹42L & Mumbai Conclave ₹18.5L)
                  </p>
                </div>
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@aarambh-events.in', 'Admin@2026!')}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-900">Vikramaditya Nair · Platform Administrator</p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Admin Console · AI Telemetry · Audit Logs · Moderation
                  </p>
                </div>
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            New to Aarambh AI?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Create an Event Owner account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { refreshUser, setPendingVerificationToken, notify } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        city,
        phone,
        password,
      });
      const { csrfToken, sessionToken, verificationPreviewToken } = res.data.data;
      setClientSecurityTokens(csrfToken, sessionToken);
      if (verificationPreviewToken) {
        setPendingVerificationToken(verificationPreviewToken);
      }
      await refreshUser();
      notify(
        'success',
        'Account created successfully',
        'Please verify your email on the dashboard using your verification token.'
      );
      navigate('/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Aarambh AI Home</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your Event Owner account</h1>
        <p className="mt-1 text-xs text-slate-600">
          Plan weddings, corporate summits, birthdays, and cultural events with AI precision.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 border border-slate-200 rounded-xl shadow-xs">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Krishnan"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya@example.in"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-city" className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary City
                </label>
                <input
                  id="reg-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mumbai"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password (min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Creating Account...' : 'Create Event Owner Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { notify } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [issuedToken, setIssuedToken] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      const previewToken = res.data?.data?.resetPreviewToken;
      if (previewToken) {
        setIssuedToken(previewToken);
        setResetTokenInput(previewToken);
      }
      setStep('reset');
      notify('info', 'Recovery token issued', res.data?.data?.message);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetTokenInput,
        newPassword,
      });
      notify('success', 'Password reset complete', res.data?.data?.message);
      navigate('/login');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Password Recovery</h1>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Single-use expiring recovery tokens automatically revoke prior active sessions.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 border border-slate-200 rounded-xl shadow-xs">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label htmlFor="recover-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Email Address
                </label>
                <input
                  id="recover-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya.sharma@aarambh-events.in"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Generating Single-Use Token...' : 'Send Recovery Token'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {issuedToken && (
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <MailCheck className="w-4 h-4 text-indigo-600" />
                    <span>Console Email Provider Token (Auto-Filled for Testing)</span>
                  </div>
                  <p className="font-mono text-[11px] break-all">{issuedToken}</p>
                </div>
              )}

              <div>
                <label htmlFor="reset-token" className="block text-xs font-semibold text-slate-700 mb-1">
                  Single-Use Recovery Token
                </label>
                <input
                  id="reset-token"
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label htmlFor="reset-new-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 8 chars, 1 uppercase, 1 number)
                </label>
                <input
                  id="reset-new-pass"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Confirm Password Reset'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
