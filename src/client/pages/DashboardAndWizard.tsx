import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api, formatPaiseToInr, formatDateShort, extractErrorMessage } from '../api';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  LogOut,
  Shield,
  Settings,
  ArrowRight,
  MailCheck,
  Search,
} from 'lucide-react';

export const WorkspaceNavbar: React.FC<{ breadcrumb?: string; primaryAction?: React.ReactNode }> = ({
  breadcrumb,
  primaryAction,
}) => {
  const { user, logout, notify } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    notify('info', 'Signed out', 'Your session token has been revoked.');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Brand + Contextual Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Aarambh AI
          </Link>
          {breadcrumb && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-600 truncate max-w-xs sm:max-w-md">
                {breadcrumb}
              </span>
            </>
          )}
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <Link to="/dashboard" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            My Events
          </Link>
          <Link to="/events/new" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Create Event Wizard
          </Link>
          <Link to="/settings" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Account & Privacy
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Admin Console
            </Link>
          )}
        </nav>

        {/* Zone 3: Primary Action & Session Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {primaryAction}
          <Link
            to="/settings"
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden"
            aria-label="Account Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const UserDashboardPage: React.FC = () => {
  const { user, pendingVerificationToken, setPendingVerificationToken, refreshUser, notify } = useApp();
  const navigate = useNavigate();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [verifyCode, setVerifyCode] = useState(pendingVerificationToken || '');
  const [verifying, setVerifying] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data?.data?.events || []);
    } catch (err) {
      notify('error', 'Failed to load events', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (pendingVerificationToken) {
      setVerifyCode(pendingVerificationToken);
    }
  }, [pendingVerificationToken]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifying(true);
    try {
      await api.post('/auth/verify-email', { token: verifyCode.trim() });
      setPendingVerificationToken(null);
      await refreshUser();
      notify('success', 'Email Verified', 'Your account now has full sensitive operation access.');
    } catch (err) {
      notify('error', 'Verification failed', extractErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const res = await api.post('/auth/resend-verification');
      const token = res.data?.data?.verificationPreviewToken;
      if (token) {
        setVerifyCode(token);
        setPendingVerificationToken(token);
      }
      notify('info', 'Verification token issued', 'Token pre-filled in verification box.');
    } catch (err) {
      notify('error', 'Could not resend token', extractErrorMessage(err));
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || ev.eventType === filterType;
    return matchesSearch && matchesType;
  });

  const totalPortfolioBudgetPaise = events.reduce((acc, e) => acc + (e.totalBudgetPaise || 0), 0);
  const totalPortfolioSpentPaise = events.reduce(
    (acc, e) => acc + (e.summary?.totalActualExpensesPaise || 0),
    0
  );
  const totalTasksCompleted = events.reduce((acc, e) => acc + (e.summary?.tasksCompleted || 0), 0);
  const totalTasksCount = events.reduce((acc, e) => acc + (e.summary?.tasksTotal || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <WorkspaceNavbar
        breadcrumb="Portfolio Dashboard"
        primaryAction={
          <button
            type="button"
            onClick={() => navigate('/events/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 py-8">
        {/* Email Verification Banner if not yet verified */}
        {user && !user.emailVerified && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MailCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-950">Verify your email address</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Enter your single-use verification token below (auto-filled in console mode) to unlock all sensitive
                  account operations.
                </p>
              </div>
            </div>
            <form onSubmit={handleVerifyEmail} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="Paste verification token"
                className="px-3 py-1.5 text-xs font-mono bg-white border border-amber-300 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg cursor-pointer"
              >
                {verifying ? 'Verifying...' : 'Verify Email'}
              </button>
              <button
                type="button"
                onClick={handleResendVerification}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:underline cursor-pointer"
              >
                Generate New Code
              </button>
            </form>
          </div>
        )}

        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500">
              <span>{user?.name}</span>
              <span> · </span>
              <span>{user?.city}</span>
              <span> · </span>
              <span>
                AI Quota: {user?.aiDailyCount || 0}/{user?.aiDailyQuota || 25} used today
              </span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Event Operations Portfolio
            </h1>
          </div>

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Open Protected Admin Console</span>
            </Link>
          )}
        </div>

        {/* 4-Column Portfolio KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Active Events Managed</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {events.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Isolated per-owner MongoDB records</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Gross Portfolio Budget</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {formatPaiseToInr(totalPortfolioBudgetPaise)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Calculated in integer paise</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Committed & Logged Expenses</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-1">
              {formatPaiseToInr(totalPortfolioSpentPaise)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Remaining: {formatPaiseToInr(Math.max(0, totalPortfolioBudgetPaise - totalPortfolioSpentPaise))}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Checklist Completion</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {totalTasksCompleted} / {totalTasksCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Across milestones & run sheets</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title or city..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(['all', 'wedding', 'corporate', 'birthday', 'anniversary', 'cultural', 'community'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterType(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterType === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Events List / Loading / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-64">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-6" />
                <div className="h-20 bg-slate-100 rounded mb-4" />
                <div className="h-8 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Calendar className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900">No matching events found</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-6">
              Launch our 4-step Event Creation Wizard to configure your dates, guest count, INR budget, and
              dietary requirements, and generate your AI event blueprint.
            </p>
            <button
              type="button"
              onClick={() => navigate('/events/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Event</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => {
              const summary = ev.summary || {};
              return (
                <div
                  key={ev._id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    {/* Clean unboxed metadata line */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="capitalize font-semibold text-indigo-700">{ev.eventType}</span>
                        <span>·</span>
                        <span>{ev.city}</span>
                        <span>·</span>
                        <span>{formatDateShort(ev.startDate)}</span>
                      </div>
                      <span className="capitalize font-medium text-slate-700">
                        Status: {ev.planningStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 mb-1">{ev.title}</h2>
                    <p className="text-xs text-slate-600 mb-5">
                      {ev.venueName || 'Venue TBD'} · {ev.estimatedGuests} Guests ({ev.indoorOutdoor})
                    </p>

                    {/* Financial & Operational Metrics */}
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200/80 mb-4">
                      <div>
                        <p className="text-[11px] text-slate-500">Total Budget</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {formatPaiseToInr(ev.totalBudgetPaise)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Logged Spend</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
                          {formatPaiseToInr(summary.totalActualExpensesPaise || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Tasks / RSVPs</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {summary.tasksCompleted || 0}/{summary.tasksTotal || 0} · {summary.confirmedGuestHeadcount || 0} pax
                        </p>
                      </div>
                    </div>

                    {summary.isOverBudget && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>One or more categories exceed planned allocation</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Workspace Jump Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/events/${ev._id}?tab=ai-planner`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Planner</span>
                      </Link>
                      <Link
                        to={`/events/${ev._id}?tab=budget`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Budget
                      </Link>
                      <Link
                        to={`/events/${ev._id}?tab=timeline`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Timeline
                      </Link>
                      <Link
                        to={`/events/${ev._id}?tab=vendors`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Vendors
                      </Link>
                      <Link
                        to={`/events/${ev._id}?tab=guests`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Guests
                      </Link>
                    </div>

                    <Link
                      to={`/events/${ev._id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// MULTI-STEP VALIDATED EVENT CREATION WIZARD
// ============================================================================

const DIETARY_OPTIONS = [
  'Standard Vegetarian',
  'Jain (No Onion/Garlic Counter)',
  'Vegan Live Station',
  'Non-Vegetarian Counter',
  'Gluten-Free Options',
  'Halal Certified',
  'Kids Menu',
];

const ACCESSIBILITY_OPTIONS = [
  'Wheelchair Ramp at Main Stage/Mandap',
  'Step-Free Restroom & Dining Access',
  'Senior Citizen Golf Cart Shuttle',
  'Reserved Elders Front-Row Seating',
  'Sign Language / Live Captioning',
];

export const CreateEventWizardPage: React.FC = () => {
  const { notify } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Wizard state with sensible Indian event defaults
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<
    'wedding' | 'birthday' | 'anniversary' | 'corporate' | 'cultural' | 'community'
  >('wedding');
  const [startDate, setStartDate] = useState('2026-12-18T10:00');
  const [endDate, setEndDate] = useState('2026-12-19T22:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [city, setCity] = useState('Jaipur, Rajasthan');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor' | 'hybrid'>('hybrid');
  const [estimatedGuests, setEstimatedGuests] = useState<number>(250);
  const [totalBudgetInr, setTotalBudgetInr] = useState<number>(2500000); // ₹25,00,000
  const [emergencyReserveInr, setEmergencyReserveInr] = useState<number>(200000); // ₹2,00,000
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [theme, setTheme] = useState('Royal Terracotta, Marigold & Brass Heritage');
  const [preferredStyle, setPreferredStyle] = useState('Contemporary Heritage & Sustainable Craft');
  const [dietaryRequirements, setDietaryRequirements] = useState<string[]>([
    'Standard Vegetarian',
    'Jain (No Onion/Garlic Counter)',
  ]);
  const [accessibilityRequirements, setAccessibilityRequirements] = useState<string[]>([
    'Wheelchair Ramp at Main Stage/Mandap',
    'Reserved Elders Front-Row Seating',
  ]);
  const [culturalPreferences, setCulturalPreferences] = useState(
    'Traditional welcome tilak, acoustic folk performers during arrival, and sunset ceremony.'
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    'Avoid single-use plastics; prioritize local florals and separate Jain preparation counters.'
  );
  const [planningStatus, setPlanningStatus] = useState<'draft' | 'planning' | 'confirmed'>('planning');

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const validateCurrentStep = (): boolean => {
    setError('');
    if (step === 1) {
      if (title.trim().length < 3) {
        setError('Please enter an event title of at least 3 characters.');
        return false;
      }
      if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
        setError('Event end date/time must be on or after the start date/time.');
        return false;
      }
    }
    if (step === 2) {
      if (city.trim().length < 2) {
        setError('Please specify the event city.');
        return false;
      }
      if (estimatedGuests < 1 || estimatedGuests > 50000) {
        setError('Estimated guests must be between 1 and 50,000.');
        return false;
      }
      if (totalBudgetInr < 1000) {
        setError('Total budget must be at least ₹1,000.');
        return false;
      }
      if (emergencyReserveInr > totalBudgetInr) {
        setError('Emergency reserve cannot exceed the total event budget.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleCreateEvent = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        eventType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        timezone,
        city: city.trim(),
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        indoorOutdoor,
        estimatedGuests: Number(estimatedGuests),
        totalBudgetPaise: Math.round(Number(totalBudgetInr) * 100),
        emergencyReservePaise: Math.round(Number(emergencyReserveInr) * 100),
        currency,
        theme: theme.trim(),
        preferredStyle: preferredStyle.trim(),
        dietaryRequirements,
        accessibilityRequirements,
        culturalPreferences: culturalPreferences.trim(),
        specialInstructions: specialInstructions.trim(),
        planningStatus,
      };

      const res = await api.post('/events', payload);
      const created = res.data.data.event;
      notify(
        'success',
        'Event Created & Persisted',
        'Default paise-accurate budget categories and milestone tasks have been initialized.'
      );
      navigate(`/events/${created._id}?tab=ai-planner`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <WorkspaceNavbar breadcrumb="Create Event Wizard" />

      <main className="max-w-3xl mx-auto w-full flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configure New Event Blueprint
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Step {step} of 4 · Validated on client & server · Defaults to Indian Rupee (₹ INR) and Asia/Kolkata
          </p>

          {/* 4-Step Progress Bar */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { s: 1, label: '01. Identity & Dates' },
              { s: 2, label: '02. Venue & INR Budget' },
              { s: 3, label: '03. Dietary & Culture' },
              { s: 4, label: '04. Review & Launch' },
            ].map((item) => (
              <button
                key={item.s}
                type="button"
                onClick={() => {
                  if (item.s < step || validateCurrentStep()) {
                    setStep(item.s as 1 | 2 | 3 | 4);
                  }
                }}
                className={`text-left p-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  step === item.s
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : step > item.s
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="wiz-title" className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  id="wiz-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Kabir & Meera — Heritage Palace Wedding & Sangeet"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wiz-type" className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Type *
                  </label>
                  <select
                    id="wiz-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="wedding">Wedding & Sangeet</option>
                    <option value="corporate">Corporate Summit / Offsite</option>
                    <option value="birthday">Milestone Birthday Celebration</option>
                    <option value="anniversary">Anniversary / Silver Jubilee</option>
                    <option value="cultural">Cultural / Festive Program</option>
                    <option value="community">Community / Charity Gathering</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wiz-status" className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Planning Status
                  </label>
                  <select
                    id="wiz-status"
                    value={planningStatus}
                    onChange={(e) => setPlanningStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="draft">Draft</option>
                    <option value="planning">Active Planning</option>
                    <option value="confirmed">Dates Confirmed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="wiz-start" className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    id="wiz-start"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-end" className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date & Time *
                  </label>
                  <input
                    id="wiz-end"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-tz" className="block text-xs font-semibold text-slate-700 mb-1">
                    Time Zone
                  </label>
                  <select
                    id="wiz-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wiz-city" className="block text-xs font-semibold text-slate-700 mb-1">
                    City & Region *
                  </label>
                  <input
                    id="wiz-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jaipur, Rajasthan"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-venue" className="block text-xs font-semibold text-slate-700 mb-1">
                    Venue Name (Optional / Shortlisted)
                  </label>
                  <input
                    id="wiz-venue"
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Samode Palace Courtyard"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wiz-setting" className="block text-xs font-semibold text-slate-700 mb-1">
                    Indoor / Outdoor Setting
                  </label>
                  <select
                    id="wiz-setting"
                    value={indoorOutdoor}
                    onChange={(e) => setIndoorOutdoor(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="hybrid">Hybrid (Indoor Hall + Outdoor Lawn/Courtyard)</option>
                    <option value="indoor">Fully Indoor Banquet / Convention Hall</option>
                    <option value="outdoor">Outdoor Lawn / Terrace / Beachfront</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="wiz-guests" className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Guest Count *
                  </label>
                  <input
                    id="wiz-guests"
                    type="number"
                    min={1}
                    max={50000}
                    value={estimatedGuests}
                    onChange={(e) => setEstimatedGuests(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label htmlFor="wiz-curr" className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="wiz-curr"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="wiz-budget" className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Gross Budget (₹ INR) *
                  </label>
                  <input
                    id="wiz-budget"
                    type="number"
                    min={1000}
                    step={5000}
                    value={totalBudgetInr}
                    onChange={(e) => setTotalBudgetInr(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-reserve" className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Reserve (₹ INR)
                  </label>
                  <input
                    id="wiz-reserve"
                    type="number"
                    min={0}
                    step={5000}
                    value={emergencyReserveInr}
                    onChange={(e) => setEmergencyReserveInr(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Allocatable Category Budget (Gross minus Reserve):</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatPaiseToInr(Math.max(0, (totalBudgetInr - emergencyReserveInr) * 100))}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wiz-theme" className="block text-xs font-semibold text-slate-700 mb-1">
                    Theme Direction
                  </label>
                  <input
                    id="wiz-theme"
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-style" className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Aesthetic Style
                  </label>
                  <input
                    id="wiz-style"
                    type="text"
                    value={preferredStyle}
                    onChange={(e) => setPreferredStyle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Dietary Requirements (Select all that apply)
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((opt) => {
                    const active = dietaryRequirements.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleItem(dietaryRequirements, setDietaryRequirements, opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Accessibility Requirements
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_OPTIONS.map((opt) => {
                    const active = accessibilityRequirements.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          toggleItem(accessibilityRequirements, setAccessibilityRequirements, opt)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="wiz-culture" className="block text-xs font-semibold text-slate-700 mb-1">
                  Cultural & Ritual Preferences
                </label>
                <textarea
                  id="wiz-culture"
                  rows={2}
                  value={culturalPreferences}
                  onChange={(e) => setCulturalPreferences(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-special" className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Instructions & Sustainability Notes
                </label>
                <textarea
                  id="wiz-special"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Event Title & Type</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {title} ({eventType})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">City, Venue & Setting</span>
                  <span className="font-medium text-slate-900">
                    {city} · {venueName || 'TBD'} ({indoorOutdoor})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Estimated Guests</span>
                  <span className="font-mono font-bold text-slate-900">{estimatedGuests} pax</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Gross Budget (Paise Integer Validated)</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {formatPaiseToInr(totalBudgetInr * 100)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Protected Emergency Reserve</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatPaiseToInr(emergencyReserveInr * 100)}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Dietary & Accessibility Streams</span>
                  <span className="text-slate-800">
                    {[...dietaryRequirements, ...accessibilityRequirements].join(' · ') || 'Standard'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Previous Step
              </button>
            ) : (
              <Link to="/dashboard" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Cancel
              </Link>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Continue to Step {step + 1}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreateEvent}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Saving to MongoDB...' : 'Create Event & Open AI Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
