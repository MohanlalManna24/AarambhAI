import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api, extractErrorMessage, formatDateShort } from '../api';
import { WorkspaceNavbar } from './DashboardAndWizard';
import {
  Download,
  Trash2,
  Shield,
  Activity,
  AlertTriangle,
  Users,
  FileText,
  Sliders,
} from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const { user, refreshUser, logout, notify } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredCurrency, setPreferredCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>(
    user?.preferredCurrency || 'INR'
  );
  const [shareAnalytics, setShareAnalytics] = useState(
    user?.privacySettings?.shareAnalytics ?? false
  );
  const [emailNotifications, setEmailNotifications] = useState(
    user?.privacySettings?.emailNotifications ?? true
  );
  const [marketingOptIn, setMarketingOptIn] = useState(
    user?.privacySettings?.marketingOptIn ?? false
  );
  const [saving, setSaving] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCity(user.city);
      setPhone(user.phone);
      setPreferredCurrency(user.preferredCurrency);
      setShareAnalytics(user.privacySettings.shareAnalytics);
      setEmailNotifications(user.privacySettings.emailNotifications);
      setMarketingOptIn(user.privacySettings.marketingOptIn);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me', {
        name,
        city,
        phone,
        preferredCurrency,
        privacySettings: {
          shareAnalytics,
          emailNotifications,
          marketingOptIn,
        },
      });
      await refreshUser();
      notify('success', 'Settings saved', 'Your profile and privacy preferences have been updated.');
    } catch (err) {
      notify('error', 'Failed to update profile', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExportPersonalData = async () => {
    try {
      const res = await api.get('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aarambh-personal-data-${user?._id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('success', 'Data Export Downloaded', 'Complete JSON archive of your account and events exported.');
    } catch (err) {
      notify('error', 'Export failed', extractErrorMessage(err));
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== 'DELETE') {
      notify('warning', 'Confirmation required', 'Please type DELETE in uppercase to confirm account deletion.');
      return;
    }
    try {
      await api.delete('/users/me');
      await logout();
      notify('info', 'Account Deleted', 'Your account and all associated event records were permanently deleted.');
      navigate('/');
    } catch (err) {
      notify('error', 'Deletion failed', extractErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <WorkspaceNavbar breadcrumb="Profile & Privacy Settings" />

      <main className="max-w-3xl mx-auto w-full flex-1 px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Profile & Regional Preferences</h1>
          <p className="text-xs text-slate-500 mb-6">
            Account Email: <span className="font-mono text-slate-800">{user?.email}</span> · Role:{' '}
            <span className="uppercase font-semibold">{user?.role}</span>
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="prof-city" className="block text-xs font-semibold text-slate-700 mb-1">
                  Default City
                </label>
                <input
                  id="prof-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="prof-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="prof-curr" className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Currency
                </label>
                <select
                  id="prof-curr"
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="INR">INR (₹ Indian Rupee)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs font-semibold text-slate-800">Privacy & Communication Controls</p>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Receive critical task deadline and budget threshold alerts</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareAnalytics}
                  onChange={(e) => setShareAnalytics(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Share anonymized aggregate event telemetry for model quality improvement</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Receive seasonal planning guides and curated product updates</span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Profile & Privacy Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Data Export & Account Deletion (DPDP / GDPR Compliance) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Export Personal Event Archive</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Download a machine-readable JSON archive of your profile, events, budgets, tasks, vendors, and guests.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPersonalData}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Archive</span>
            </button>
          </div>

          <div>
            <h2 className="text-sm font-bold text-red-700">Permanent Account & Data Deletion</h2>
            <p className="text-xs text-slate-600 mt-0.5 mb-3">
              Atomically deletes your user account and all owned events, budgets, expenses, tasks, vendors, and guest
              records. Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="Type DELETE"
                className="px-3 py-2 text-xs font-mono border border-red-300 rounded-lg w-40"
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// PROTECTED ADMINISTRATOR DASHBOARD (SERVER-ENFORCED RBAC)
// ============================================================================

export const AdminDashboardPage: React.FC = () => {
  const { notify } = useApp();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'ai' | 'moderation' | 'config' | 'audit'>('users');
  const [quotaInput, setQuotaInput] = useState<number>(25);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/overview');
      setData(res.data.data);
      if (res.data.data?.platformConfig?.aiDailyQuotaPerUser) {
        setQuotaInput(res.data.data.platformConfig.aiDailyQuotaPerUser);
      }
    } catch (err) {
      notify('error', 'Admin authorization error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/users/${userId}`, { status: nextStatus });
      notify('success', 'User status updated', `Account status set to ${nextStatus}.`);
      fetchAdminData();
    } catch (err) {
      notify('error', 'Update failed', extractErrorMessage(err));
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.patch(`/admin/abuse-reports/${reportId}`, {
        status,
        resolutionNotes: `Reviewed and marked ${status} by administrator.`,
      });
      notify('success', 'Moderation report updated', `Report marked ${status}.`);
      fetchAdminData();
    } catch (err) {
      notify('error', 'Moderation update failed', extractErrorMessage(err));
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/admin/config', {
        aiDailyQuotaPerUser: Number(quotaInput),
        allowNewRegistrations: data?.platformConfig?.allowNewRegistrations,
      });
      notify('success', 'Platform configuration saved', `Daily AI quota set to ${quotaInput}/user.`);
      fetchAdminData();
    } catch (err) {
      notify('error', 'Config update failed', extractErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <WorkspaceNavbar breadcrumb="Protected Administrator Console" />

      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold mb-1">
            <Shield className="w-4 h-4" />
            <span>Server-Enforced Role-Based Access Control · Zero Private Guest PII Exposure</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Platform Governance & AI Telemetry Console
          </h1>
        </div>

        {loading || !data ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-xs text-slate-500">
            Loading platform telemetry and audit logs...
          </div>
        ) : (
          <>
            {/* Top Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Registered Users</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.metrics.totalUsers}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{data.metrics.activeUsers} active</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Platform Events</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.metrics.totalEvents}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Aggregate count only</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">AI Generations / Failures</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-1">
                  {data.metrics.totalAiGenerations} / {data.metrics.failedAiGenerations}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {data.metrics.totalEstimatedTokens.toLocaleString('en-IN')} est. tokens
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Rate-Limit Events</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                  {data.metrics.rateLimitEventsCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Auth & AI throttles</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Open Moderation Reports</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.metrics.openAbuseReportsCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Vendor & content queue</p>
              </div>
            </div>

            {/* Interactive Admin Module Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 rounded-lg mb-6 w-fit">
              {(
                [
                  { id: 'users', label: 'User Management', icon: Users },
                  { id: 'ai', label: 'AI Usage & Failure Monitor', icon: Activity },
                  { id: 'moderation', label: 'Abuse & Vendor Reports', icon: AlertTriangle },
                  { id: 'config', label: 'Platform Config & Categories', icon: Sliders },
                  { id: 'audit', label: 'Security Audit Logs', icon: FileText },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'users' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Name & Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Email Verified</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">AI Daily Usage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-slate-500 font-mono text-[11px]">{u.email}</p>
                        </td>
                        <td className="py-3 px-4 uppercase font-mono text-slate-700">{u.role}</td>
                        <td className="py-3 px-4">
                          {u.emailVerified ? 'Verified' : 'Pending Verification'}
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-slate-800">{u.status}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{u.aiDailyCount}</td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u._id, u.status)}
                              className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-100 font-medium text-slate-800 cursor-pointer"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Model</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Tokens (In / Out)</th>
                      <th className="py-3 px-4 text-right">Latency</th>
                      <th className="py-3 px-4">Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.aiGenerations.map((g: any) => (
                      <tr key={g._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {formatDateShort(g.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">{g.modelName}</td>
                        <td className="py-3 px-4">{g.generationType}</td>
                        <td className="py-3 px-4 font-semibold capitalize">
                          {g.status === 'failed' ? (
                            <span className="text-red-700">Failed</span>
                          ) : (
                            <span className="text-emerald-700">{g.status}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {g.estimatedInputTokens} / {g.estimatedOutputTokens}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{g.latencyMs} ms</td>
                        <td className="py-3 px-4 text-slate-500">{g.errorMessage || 'Validated OK'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Reported Content & Vendor Verification Queue
                </h2>
                {data.abuseReports.map((rep: any) => (
                  <div
                    key={rep._id}
                    className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="text-slate-500">
                        Reporter: <span className="font-mono">{rep.reporterEmail}</span> · Target:{' '}
                        <span className="uppercase font-semibold">{rep.targetType}</span> · Status:{' '}
                        <span className="font-bold uppercase">{rep.status}</span>
                      </p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{rep.reason}</p>
                      {rep.resolutionNotes && (
                        <p className="text-slate-600 mt-1">Resolution: {rep.resolutionNotes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep._id, 'resolved')}
                        className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep._id, 'dismissed')}
                        className="px-3 py-1.5 bg-slate-200 text-slate-800 font-semibold rounded-lg cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <form onSubmit={handleUpdateConfig} className="max-w-md space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">AI Quota & Registration Governance</h2>
                  <div>
                    <label
                      htmlFor="cfg-quota"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Daily AI Plan Generation Quota Per User
                    </label>
                    <input
                      id="cfg-quota"
                      type="number"
                      min={1}
                      max={500}
                      value={quotaInput}
                      onChange={(e) => setQuotaInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    Save Platform Configuration
                  </button>
                </form>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 mb-3">
                    Supported Event Categories
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {data.platformConfig.supportedEventCategories.map((c: any) => (
                      <div key={c.slug} className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                        <p className="font-semibold text-slate-900">{c.label}</p>
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                          Slug: {c.slug} · Default: {c.defaultCurrency}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor Role</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-4">Request ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.auditLogs.map((log: any) => (
                      <tr key={log._id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 uppercase font-mono text-slate-600">
                          {log.actorRole}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {log.targetType} ({log.targetId.slice(0, 10)})
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                          {log.requestId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
