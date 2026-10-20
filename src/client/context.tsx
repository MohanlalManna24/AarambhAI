import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setClientSecurityTokens, extractErrorMessage } from './api';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'vendor' | 'collaborator';
  emailVerified: boolean;
  status: string;
  phone: string;
  city: string;
  preferredCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  privacySettings: {
    shareAnalytics: boolean;
    emailNotifications: boolean;
    marketingOptIn: boolean;
  };
  aiDailyCount: number;
  aiDailyQuota: number;
  createdAt: string;
}

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface AppContextValue {
  user: UserProfile | null;
  loadingAuth: boolean;
  pendingVerificationToken: string | null;
  setPendingVerificationToken: (token: string | null) => void;
  refreshUser: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  notify: (type: ToastItem['type'], title: string, message?: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [pendingVerificationToken, setPendingVerificationToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((type: ToastItem['type'], title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data.user);
        setClientSecurityTokens(res.data.data.csrfToken);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithCredentials = async (email: string, password: string): Promise<UserProfile> => {
    const res = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, csrfToken, sessionToken } = res.data.data;
    setClientSecurityTokens(csrfToken, sessionToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn(extractErrorMessage(err));
    } finally {
      setClientSecurityTokens('', '');
      setUser(null);
      setPendingVerificationToken(null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        pendingVerificationToken,
        setPendingVerificationToken,
        refreshUser,
        loginWithCredentials,
        logout,
        notify,
      }}
    >
      {children}

      {/* Accessible Toast Notification Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-lg text-slate-900 transition-all"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.message && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-700 p-1 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
