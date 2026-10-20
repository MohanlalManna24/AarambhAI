import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useApp } from './client/context';
import { LandingPage } from './client/pages/LandingPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './client/pages/AuthPages';
import { UserDashboardPage, CreateEventWizardPage } from './client/pages/DashboardAndWizard';
import { EventWorkspacePage } from './client/pages/EventWorkspacePage';
import { ProfileSettingsPage, AdminDashboardPage } from './client/pages/SettingsAndAdmin';
import { AlertTriangle } from 'lucide-react';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'admin' | 'customer';
}> = ({ children, requiredRole }) => {
  const { user, loadingAuth } = useApp();

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-xs font-mono text-slate-500">Verifying session & CSRF security context...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
    <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8">
      <AlertTriangle className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
      <h1 className="text-xl font-bold text-slate-900">404 — Page Not Found</h1>
      <p className="text-xs text-slate-600 mt-1 mb-6">
        The requested route does not exist or has been moved.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/"
          className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          Landing Page
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          Open Dashboard
        </Link>
      </div>
    </div>
  </div>
);

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:text-xs focus:font-semibold focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1} className="outline-none">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <ProtectedRoute>
                  <CreateEventWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId"
              element={
                <ProtectedRoute>
                  <EventWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfileSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
