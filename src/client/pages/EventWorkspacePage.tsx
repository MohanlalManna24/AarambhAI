import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useApp } from '../context';
import { api, formatPaiseToInr, formatInrNumber, formatDateShort, extractErrorMessage } from '../api';
import { WorkspaceNavbar } from './DashboardAndWizard';
import {
  LayoutDashboard,
  Sparkles,
  IndianRupee,
  Calendar,
  Briefcase,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  Printer,
  Lightbulb,
  Clock,
  Menu,
  X,
} from 'lucide-react';

type TabKey = 'overview' | 'ai-planner' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'reports';

export const EventWorkspacePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify, refreshUser } = useApp();

  const initialTab = (searchParams.get('tab') as TabKey) || 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [workspaceData, setWorkspaceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // AI Planner state
  const [customPromptFocus, setCustomPromptFocus] = useState('');
  const [prioritizeSustainability, setPrioritizeSustainability] = useState(true);
  const [prioritizeCostSavings, setPrioritizeCostSavings] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [applyingPlanId, setApplyingPlanId] = useState<string | null>(null);
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);

  // Personalized Ideas state
  const [ideaCategory, setIdeaCategory] = useState('wedding_themes');
  const [ideaContext, setIdeaContext] = useState('');
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [personalizedIdeas, setPersonalizedIdeas] = useState<any | null>(null);

  // Budget & Expense state
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmountInr, setNewCatAmountInr] = useState('');
  const [newCatNotes, setNewCatNotes] = useState('');

  const [expCategoryId, setExpCategoryId] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expAmountInr, setExpAmountInr] = useState('');
  const [expAdvanceInr, setExpAdvanceInr] = useState('0');
  const [expPaymentStatus, setExpPaymentStatus] = useState<'planned' | 'advance_paid' | 'paid'>('advance_paid');
  const [expPriceType, setExpPriceType] = useState<'confirmed_invoice' | 'vendor_quotation' | 'ai_estimate'>(
    'vendor_quotation'
  );

  // Timeline / Tasks state
  const [timelineView, setTimelineView] = useState<'checklist' | 'calendar' | 'run_sheet'>('checklist');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('logistics');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [taskDueDate, setTaskDueDate] = useState('2026-11-20');
  const [taskIsRunSheet, setTaskIsRunSheet] = useState(false);
  const [taskRunSheetTime, setTaskRunSheetTime] = useState('Day 1 · 06:00 PM');
  const [taskAssignee, setTaskAssignee] = useState('Event Owner');

  // Vendor state
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('catering');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorCity, setVendorCity] = useState('');
  const [vendorQuoteInr, setVendorQuoteInr] = useState('');
  const [vendorAdvanceInr, setVendorAdvanceInr] = useState('0');
  const [vendorVerified, setVendorVerified] = useState(true);
  const [vendorStatus, setVendorStatus] = useState<'shortlisted' | 'contacted' | 'booked'>('shortlisted');
  const [vendorDeliverables, setVendorDeliverables] = useState('');
  const [vendorDocRef, setVendorDocRef] = useState('');

  // Guest state
  const [guestName, setGuestName] = useState('');
  const [guestGroup, setGuestGroup] = useState('family_bride');
  const [guestRsvp, setGuestRsvp] = useState<'pending' | 'confirmed' | 'tentative' | 'declined'>('confirmed');
  const [guestHeadcount, setGuestHeadcount] = useState(2);
  const [guestDietary, setGuestDietary] = useState('standard_veg');
  const [guestSeating, setGuestSeating] = useState('');
  const [guestAccessibility, setGuestAccessibility] = useState(false);
  const [guestPhone, setGuestPhone] = useState('');
  const [csvImportText, setCsvImportText] = useState('');

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setMobileMenuOpen(false);
  };

  const fetchWorkspace = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get(`/events/${eventId}`);
      const payload = res.data.data;
      setWorkspaceData(payload);
      if (payload.categories?.length > 0 && !expCategoryId) {
        setExpCategoryId(payload.categories[0]._id);
      }
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, expCategoryId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    const t = searchParams.get('tab') as TabKey;
    if (t && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams, activeTab]);

  // Handlers
  const handleStatusChange = async (nextStatus: string) => {
    try {
      await api.patch(`/events/${eventId}`, { planningStatus: nextStatus });
      notify('success', 'Event status updated', `Event is now marked ${nextStatus.replace('_', ' ')}.`);
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not update status', extractErrorMessage(err));
    }
  };

  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAi(true);
    try {
      await api.post(`/events/${eventId}/ai-plans/generate`, {
        customPromptFocus,
        prioritizeSustainability,
        prioritizeCostSavings,
      });
      await refreshUser();
      await fetchWorkspace();
      setSelectedPlanIdx(0);
      notify(
        'success',
        'AI Event Blueprint Generated',
        'Structured JSON validated. Review below and click "Approve & Apply Blueprint" to sync.'
      );
    } catch (err) {
      notify('error', 'AI Generation Failed (Existing Data Preserved)', extractErrorMessage(err));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApplyAiPlan = async (planId: string) => {
    setApplyingPlanId(planId);
    try {
      const res = await api.post(`/events/${eventId}/ai-plans/${planId}/apply`);
      notify('success', 'Blueprint Approved & Applied', res.data.data.message);
      await fetchWorkspace();
    } catch (err) {
      notify('error', 'Failed to apply blueprint', extractErrorMessage(err));
    } finally {
      setApplyingPlanId(null);
    }
  };

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingIdeas(true);
    try {
      const res = await api.post(`/events/${eventId}/personalized-ideas`, {
        focusCategory: ideaCategory,
        customContext: ideaContext,
      });
      setPersonalizedIdeas(res.data.data.ideas);
      await refreshUser();
      notify('success', 'Personalized Ideas Curated', 'Grounded cost ranges and sustainable alternatives ready.');
    } catch (err) {
      notify('error', 'Could not generate ideas', extractErrorMessage(err));
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleAddBudgetCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatAmountInr) return;
    try {
      await api.post(`/events/${eventId}/budget/categories`, {
        name: newCatName.trim(),
        plannedAmountPaise: Math.round(Number(newCatAmountInr) * 100),
        isAiEstimated: false,
        notes: newCatNotes.trim(),
      });
      setNewCatName('');
      setNewCatAmountInr('');
      setNewCatNotes('');
      notify('success', 'Budget category added', 'Recalculated paise allocations.');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Failed to add category', extractErrorMessage(err));
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCategoryId || !expTitle.trim() || !expAmountInr) return;
    try {
      await api.post(`/events/${eventId}/budget/expenses`, {
        categoryId: expCategoryId,
        title: expTitle.trim(),
        vendorName: expVendor.trim(),
        amountPaise: Math.round(Number(expAmountInr) * 100),
        advancePaidPaise: Math.round(Number(expAdvanceInr || 0) * 100),
        paymentStatus: expPaymentStatus,
        priceType: expPriceType,
      });
      setExpTitle('');
      setExpVendor('');
      setExpAmountInr('');
      setExpAdvanceInr('0');
      notify('success', 'Expense logged in paise ledger', 'Authoritative budget utilization updated.');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not log expense', extractErrorMessage(err));
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.delete(`/events/${eventId}/budget/expenses/${expenseId}`);
      notify('info', 'Expense removed');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Delete failed', extractErrorMessage(err));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await api.post(`/events/${eventId}/tasks`, {
        title: taskTitle.trim(),
        category: taskIsRunSheet ? 'run_sheet' : taskCategory,
        priority: taskPriority,
        status: 'todo',
        dueDate: new Date(taskDueDate).toISOString(),
        isEventDayRunSheet: taskIsRunSheet,
        runSheetTime: taskIsRunSheet ? taskRunSheetTime : '',
        assignedToName: taskAssignee.trim() || 'Event Owner',
        reminderEnabled: true,
      });
      setTaskTitle('');
      notify('success', taskIsRunSheet ? 'Run-sheet cue added' : 'Task added to timeline');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not create task', extractErrorMessage(err));
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await api.patch(`/events/${eventId}/tasks/${task._id}`, { status: nextStatus });
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Task update failed', extractErrorMessage(err));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/events/${eventId}/tasks/${taskId}`);
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not delete task', extractErrorMessage(err));
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !vendorQuoteInr) return;
    try {
      await api.post(`/events/${eventId}/vendors`, {
        vendorName: vendorName.trim(),
        serviceCategory: vendorCategory,
        contactPerson: vendorContact.trim(),
        phone: vendorPhone.trim(),
        city: vendorCity.trim() || workspaceData?.event?.city || '',
        quotedAmountPaise: Math.round(Number(vendorQuoteInr) * 100),
        advancePaidPaise: Math.round(Number(vendorAdvanceInr || 0) * 100),
        isVerifiedQuotation: vendorVerified,
        status: vendorStatus,
        deliverablesNotes: vendorDeliverables.trim(),
        documentReference: vendorDocRef.trim(),
      });
      setVendorName('');
      setVendorContact('');
      setVendorPhone('');
      setVendorQuoteInr('');
      setVendorAdvanceInr('0');
      setVendorDeliverables('');
      setVendorDocRef('');
      notify('success', 'Vendor quotation recorded');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Failed to add vendor', extractErrorMessage(err));
    }
  };

  const handleUpdateVendorStatus = async (vendorId: string, status: string) => {
    try {
      await api.patch(`/events/${eventId}/vendors/${vendorId}`, { status });
      notify('success', 'Vendor status updated', `Marked as ${status}.`);
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not update vendor', extractErrorMessage(err));
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await api.delete(`/events/${eventId}/vendors/${vendorId}`);
      notify('info', 'Vendor removed');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not remove vendor', extractErrorMessage(err));
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    try {
      await api.post(`/events/${eventId}/guests`, {
        fullName: guestName.trim(),
        groupName: guestGroup,
        rsvpStatus: guestRsvp,
        invitationStatus: 'sent',
        headcount: Number(guestHeadcount),
        dietaryPreference: guestDietary,
        tableOrSeatingNote: guestSeating.trim(),
        requiresAccessibilitySupport: guestAccessibility,
        phone: guestPhone.trim(),
      });
      setGuestName('');
      setGuestSeating('');
      setGuestPhone('');
      notify('success', 'Guest record added');
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Failed to add guest', extractErrorMessage(err));
    }
  };

  const handleBulkCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = csvImportText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsedGuests = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        fullName: parts[0] || 'Guest Family',
        headcount: Math.max(1, Math.min(20, Number(parts[1]) || 1)),
        dietaryPreference: ([
          'standard_veg',
          'jain_no_onion_garlic',
          'non_veg',
          'vegan',
          'gluten_free',
          'halal',
          'kids_meal',
        ].includes(parts[2])
          ? parts[2]
          : 'standard_veg') as any,
        rsvpStatus: (['pending', 'confirmed', 'tentative', 'declined'].includes(parts[3])
          ? parts[3]
          : 'pending') as any,
        tableOrSeatingNote: parts[4] || '',
      };
    });

    try {
      const res = await api.post(`/events/${eventId}/guests/import`, { guests: parsedGuests });
      setCsvImportText('');
      notify('success', 'Bulk Guest Import Complete', `Imported ${res.data.data.importedCount} guest records.`);
      fetchWorkspace();
    } catch (err) {
      notify('error', 'CSV Import Failed', extractErrorMessage(err));
    }
  };

  const handleUpdateGuestRsvp = async (guestId: string, rsvpStatus: string) => {
    try {
      await api.patch(`/events/${eventId}/guests/${guestId}`, { rsvpStatus });
      fetchWorkspace();
    } catch (err) {
      notify('error', 'RSVP update failed', extractErrorMessage(err));
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    try {
      await api.delete(`/events/${eventId}/guests/${guestId}`);
      fetchWorkspace();
    } catch (err) {
      notify('error', 'Could not remove guest', extractErrorMessage(err));
    }
  };

  const handleDownloadCsv = async (section: 'budget' | 'vendors' | 'guests') => {
    try {
      const res = await api.get(`/events/${eventId}/reports/export.csv?section=${section}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `aarambh-${eventId}-${section}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('success', 'Sanitized CSV Downloaded', 'Spreadsheet formula-injection protection verified.');
    } catch (err) {
      notify('error', 'CSV Export Failed', extractErrorMessage(err));
    }
  };

  const handleDeleteEntireEvent = async () => {
    try {
      await api.delete(`/events/${eventId}`);
      notify('info', 'Event Deleted', 'Event and all child records have been removed.');
      navigate('/dashboard');
    } catch (err) {
      notify('error', 'Delete failed', extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <WorkspaceNavbar breadcrumb="Loading Event Workspace..." />
        <div className="max-w-7xl mx-auto w-full p-8">
          <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse h-96" />
        </div>
      </div>
    );
  }

  if (loadError || !workspaceData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <WorkspaceNavbar breadcrumb="Access Denied or Not Found" />
        <div className="max-w-xl mx-auto w-full p-8 mt-12 bg-white border border-slate-200 rounded-xl text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Unable to load event workspace</h1>
          <p className="text-xs text-slate-600 mt-1 mb-6">
            {loadError || 'You do not have permission to view this event or it does not exist.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
          >
            Return to Portfolio Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { event, budgetSummary, categories, expenses, tasks, vendors, guests, aiPlans } = workspaceData;
  const activeAiPlanDoc = aiPlans?.[selectedPlanIdx] || aiPlans?.[0] || null;
  const activePlan = activeAiPlanDoc?.structuredPlan || null;

  const navItems: { id: TabKey; label: string; icon: any; count?: string | number }[] = [
    { id: 'overview', label: 'Event Overview', icon: LayoutDashboard },
    { id: 'ai-planner', label: 'AI Planning Workspace', icon: Sparkles, count: aiPlans?.length || 0 },
    {
      id: 'budget',
      label: 'Smart Budget Ledger',
      icon: IndianRupee,
      count: `${budgetSummary.utilizationPercent}%`,
    },
    { id: 'timeline', label: 'Timeline & Run Sheet', icon: Calendar, count: tasks?.length || 0 },
    { id: 'vendors', label: 'Vendor Quotations', icon: Briefcase, count: vendors?.length || 0 },
    { id: 'guests', label: 'Guest & Dietary Matrix', icon: Users, count: guests?.length || 0 },
    { id: 'reports', label: 'Reports & Settings', icon: FileSpreadsheet },
  ];

  // Prepare Recharts data
  const chartData = (budgetSummary.categoryBreakdown || []).map((c: any) => ({
    name: c.name.length > 18 ? `${c.name.slice(0, 18)}…` : c.name,
    PlannedINR: Math.round(c.plannedAmountPaise / 100),
    ActualINR: Math.round(c.actualAmountPaise / 100),
  }));

  // Guest summary calculations
  const confirmedGuestsHeadcount = guests
    .filter((g: any) => g.rsvpStatus === 'confirmed')
    .reduce((acc: number, g: any) => acc + g.headcount, 0);
  const tentativeGuestsHeadcount = guests
    .filter((g: any) => g.rsvpStatus === 'tentative')
    .reduce((acc: number, g: any) => acc + g.headcount, 0);
  const pendingGuestsHeadcount = guests
    .filter((g: any) => g.rsvpStatus === 'pending')
    .reduce((acc: number, g: any) => acc + g.headcount, 0);
  const accessibilityGuestsCount = guests.filter((g: any) => g.requiresAccessibilitySupport).length;

  const dietaryCounts: Record<string, number> = {};
  for (const g of guests) {
    if (g.rsvpStatus !== 'declined') {
      dietaryCounts[g.dietaryPreference] = (dietaryCounts[g.dietaryPreference] || 0) + g.headcount;
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <WorkspaceNavbar
        breadcrumb={event.title}
        primaryAction={
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Modules</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Navigation (260px on Desktop, Collapsible Drawer on Mobile) */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4`}
        >
          <div className="mb-4 pb-4 border-b border-slate-100">
            <p className="text-[11px] text-slate-500 capitalize">
              {event.eventType} · {event.city}
            </p>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-2">{event.title}</h2>
            <p className="text-xs font-mono tabular-nums text-indigo-700 font-semibold mt-1">
              {formatPaiseToInr(event.totalBudgetPaise)}
            </p>
          </div>

          <nav className="space-y-1" aria-label="Event Workspace Modules">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* ================================================================ */}
          {/* TAB 1: EVENT OVERVIEW                                            */}
          {/* ================================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1">
                      <span className="capitalize font-semibold text-indigo-700">{event.eventType}</span>
                      <span>·</span>
                      <span>{event.city}</span>
                      <span>·</span>
                      <span>
                        {formatDateShort(event.startDate)} to {formatDateShort(event.endDate)}
                      </span>
                      <span>·</span>
                      <span>{event.timezone}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{event.title}</h1>
                    <p className="text-xs text-slate-600 mt-1">
                      Venue: {event.venueName || 'TBD'} ({event.indoorOutdoor}) · Theme:{' '}
                      {event.theme || 'Contemporary Heritage'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor="ev-status-select" className="text-xs font-semibold text-slate-600">
                      Status:
                    </label>
                    <select
                      id="ev-status-select"
                      value={event.planningStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="planning">Planning</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* 4-Column Executive KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Gross Budget / Reserve</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {formatPaiseToInr(budgetSummary.totalBudgetPaise)}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      Reserve: {formatPaiseToInr(budgetSummary.emergencyReservePaise)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Logged Spend ({budgetSummary.utilizationPercent}%)</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-indigo-700 mt-1">
                      {formatPaiseToInr(budgetSummary.totalActualExpensesPaise)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Advance Paid: {formatPaiseToInr(budgetSummary.totalAdvancePaidPaise)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Confirmed Guest Headcount</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {confirmedGuestsHeadcount} / {event.estimatedGuests} pax
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tentativeGuestsHeadcount} tentative · {pendingGuestsHeadcount} pending
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Tasks & Vendors Booked</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {tasks.filter((t: any) => t.status === 'completed').length}/{tasks.length} Tasks
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {vendors.filter((v: any) => v.status === 'booked' || v.status === 'completed').length} of{' '}
                      {vendors.length} vendors booked
                    </p>
                  </div>
                </div>
              </div>

              {/* Dietary, Accessibility & Cultural Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">
                    Dietary & Accessibility Requirements
                  </h2>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Active Dietary Streams:</p>
                      <p className="font-medium text-slate-900">
                        {event.dietaryRequirements?.join(' · ') || 'Standard Vegetarian'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Accessibility Provisions:</p>
                      <p className="font-medium text-slate-900">
                        {event.accessibilityRequirements?.join(' · ') || 'Step-free entrance'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Cultural & Ritual Context:</p>
                      <p className="text-slate-700 leading-relaxed">
                        {event.culturalPreferences || 'No special ritual notes specified.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-2">
                      AI Planning Blueprint Status
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {activePlan
                        ? activePlan.overview
                        : 'No AI blueprint has been generated yet for this event. Open the AI Planning Workspace to generate a validated 12-part blueprint.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => switchTab('ai-planner')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{activePlan ? 'Inspect AI Blueprint & Ideas' : 'Generate AI Blueprint'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('budget')}
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Manage INR Budget Ledger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: AI PLANNING WORKSPACE & PERSONALIZED IDEAS                */}
          {/* ================================================================ */}
          {activeTab === 'ai-planner' && (
            <div className="space-y-8">
              {/* Generator Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      AI Event Planning Assistant
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Server-side Gemini structured JSON generator · Validated with Zod · Never overwrites approved data without consent
                    </p>
                  </div>
                </div>

                <form onSubmit={handleGenerateAiPlan} className="space-y-4">
                  <div>
                    <label
                      htmlFor="ai-focus-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Conversational Planning Focus or Revision Request
                    </label>
                    <textarea
                      id="ai-focus-input"
                      rows={2}
                      value={customPromptFocus}
                      onChange={(e) => setCustomPromptFocus(e.target.value)}
                      placeholder="e.g., Prioritize eco-friendly terracotta decor, separate Jain & Vegan live counters, and a rain-safe indoor backup plan..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prioritizeSustainability}
                          onChange={(e) => setPrioritizeSustainability(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Prioritize Zero-Waste & Sustainable Decor</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prioritizeCostSavings}
                          onChange={(e) => setPrioritizeCostSavings(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Emphasize Low-Budget Cost-Saving Substitutions</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={generatingAi}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {generatingAi ? 'Generating Schema-Validated Plan...' : 'Generate Structured AI Blueprint'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Structured Blueprint Display */}
              {activePlan ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Model: {activeAiPlanDoc.modelName}</span>
                        <span>·</span>
                        <span>Latency: {activeAiPlanDoc.latencyMs}ms</span>
                        <span>·</span>
                        <span>Status: {activeAiPlanDoc.status.toUpperCase()}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        Structured Event Blueprint
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {aiPlans.length > 1 && (
                        <select
                          value={selectedPlanIdx}
                          onChange={(e) => setSelectedPlanIdx(Number(e.target.value))}
                          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          aria-label="Select blueprint version"
                        >
                          {aiPlans.map((p: any, idx: number) => (
                            <option key={p._id} value={idx}>
                              Version {aiPlans.length - idx} ({formatDateShort(p.createdAt)} · {p.status})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        disabled={applyingPlanId === activeAiPlanDoc._id}
                        onClick={() => handleApplyAiPlan(activeAiPlanDoc._id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {activeAiPlanDoc.status === 'applied'
                            ? 'Re-Sync Blueprint to Budget & Tasks'
                            : 'Approve & Apply Blueprint to Event'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Overview */}
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 mb-1">01. Executive Overview</h3>
                    <p className="text-xs text-slate-700 leading-relaxed">{activePlan.overview}</p>
                  </div>

                  {/* 2. Theme & Decor + 3. Budget Allocation */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        02. Theme & Sustainable Decor Concepts
                      </h3>
                      <div className="space-y-3">
                        {activePlan.themeAndDecor.map((td: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs">
                            <div className="flex justify-between font-semibold text-slate-900 mb-1">
                              <span>{td.area}</span>
                              <span className="font-mono tabular-nums text-indigo-700">
                                Est. {formatInrNumber(td.estimatedCostInr)}
                              </span>
                            </div>
                            <p className="text-slate-700">{td.concept}</p>
                            {td.sustainabilityNote && (
                              <p className="text-emerald-800 mt-1 text-[11px]">
                                Sustainability: {td.sustainabilityNote}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        03. Recommended Budget Allocation (AI Estimate)
                      </h3>
                      <div className="space-y-2.5">
                        {activePlan.budgetAllocation.map((ba: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span>{ba.category}</span>
                              <span className="font-mono tabular-nums">
                                {formatInrNumber(ba.amountInr)} ({ba.percentage}%)
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] mt-0.5">{ba.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Preparation Timeline & 5. Event-Day Schedule */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        04. Preparation Milestones
                      </h3>
                      <div className="space-y-2">
                        {activePlan.preparationTimeline.map((m: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span>{m.timeframe}</span>
                              <span className="uppercase font-mono text-[11px] text-indigo-700">
                                {m.priority}
                              </span>
                            </div>
                            <p className="text-slate-700 mt-0.5">{m.milestone}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        05. Event-Day Run Sheet Schedule
                      </h3>
                      <div className="space-y-2">
                        {activePlan.eventDaySchedule.map((slot: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span className="font-mono text-indigo-700">{slot.timeSlot}</span>
                              <span className="text-slate-500">{slot.owner}</span>
                            </div>
                            <p className="text-slate-800 mt-0.5">{slot.activity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. Menu & Entertainment + 7. Shopping List */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs space-y-3">
                      <h3 className="font-bold text-slate-900">06. Curated Menu & Entertainment</h3>
                      <div>
                        <p className="font-semibold text-slate-800 mb-1">Culinary Highlights:</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {activePlan.menuAndEntertainment.menuHighlights.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 mb-1">Entertainment Lineup:</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {activePlan.menuAndEntertainment.entertainmentIdeas.map((e: string, i: number) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs space-y-3">
                      <h3 className="font-bold text-slate-900">
                        07. Procurement & Shopping List + Vendor Specs
                      </h3>
                      <div className="space-y-2">
                        {activePlan.shoppingList.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between py-1 border-b border-slate-200/70">
                            <span>
                              {item.item} ({item.quantity})
                            </span>
                            <span className="font-mono tabular-nums font-semibold">
                              {formatInrNumber(item.estimatedCostInr)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2">
                        <p className="font-semibold text-slate-800 mb-1">Key Vendor Requirements:</p>
                        {activePlan.vendorRequirements.map((vr: any, i: number) => (
                          <p key={i} className="text-slate-600 text-[11px] mt-1">
                            <span className="font-semibold text-slate-800">{vr.category}:</span> {vr.specification}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 8. Cost-Saving Alternatives & 9. Risk & Contingency */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        08. AI Cost-Saving Substitutions
                      </h3>
                      <div className="space-y-2">
                        {activePlan.budgetSavingAlternatives.map((alt: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs">
                            <div className="flex justify-between font-semibold text-emerald-950">
                              <span>Instead of: {alt.originalItem}</span>
                              <span className="font-mono tabular-nums text-emerald-700">
                                Save ~{formatInrNumber(alt.estimatedSavingsInr)}
                              </span>
                            </div>
                            <p className="text-emerald-900 mt-1">Use: {alt.alternative}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-3">
                        09. Risk & Weather Contingency Matrix
                      </h3>
                      <div className="space-y-2">
                        {activePlan.riskAndContingency.map((rc: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs">
                            <p className="font-semibold text-amber-950">Risk: {rc.risk}</p>
                            <p className="text-amber-900 mt-1">Mitigation: {rc.mitigation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 10. Follow-Up Questions */}
                  {activePlan.followUpQuestions?.length > 0 && (
                    <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs">
                      <p className="font-bold text-indigo-950 mb-1.5">
                        10. Assistant Follow-Up Questions to Refine Next Revision:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-indigo-900">
                        {activePlan.followUpQuestions.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Personalized Ideas Studio (Feature 4.8) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Personalized Event Ideas & Low-Budget / Weather Backup Studio
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Generate targeted suggestions with grounded INR cost ranges, sustainable swaps, and shopping checklists.
                </p>

                <form onSubmit={handleGenerateIdeas} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
                  <div className="md:col-span-4">
                    <select
                      value={ideaCategory}
                      onChange={(e) => setIdeaCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      aria-label="Idea Category"
                    >
                      <option value="wedding_themes">Wedding Themes & Mandap Concepts</option>
                      <option value="birthday_decorations">Birthday Decorations & Experiences</option>
                      <option value="cultural_community">Cultural & Community Programs</option>
                      <option value="menu_options">Regional Menu & Jain/Vegan Options</option>
                      <option value="activities_entertainment">Activities & Live Entertainment</option>
                      <option value="low_budget_alternatives">Low-Budget Cost-Saving Alternatives</option>
                      <option value="sustainable_decor">Sustainable & Zero-Plastic Decor</option>
                      <option value="bad_weather_indoor_backup">Indoor Alternatives for Bad Weather</option>
                      <option value="shopping_list">Event-Specific Shopping List</option>
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={ideaContext}
                      onChange={(e) => setIdeaContext(e.target.value)}
                      placeholder="Optional context (e.g., monsoon afternoon, kids + elders mix)..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={generatingIdeas}
                      className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      {generatingIdeas ? 'Curating Ideas...' : 'Generate Ideas'}
                    </button>
                  </div>
                </form>

                {personalizedIdeas && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900">{personalizedIdeas.categoryTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {personalizedIdeas.curatedIdeas.map((idea: any, i: number) => (
                        <div key={i} className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <h4 className="font-bold text-slate-900">{idea.title}</h4>
                              <span className="font-mono text-[11px] text-indigo-700 shrink-0">
                                {idea.estimatedCostRangeInr}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed mb-3">{idea.explanation}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-200/70 text-[11px] text-emerald-800">
                            <span className="font-semibold">Sustainable / Low-Budget Swap:</span>{' '}
                            {idea.lowBudgetOrSustainableAlternative}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: SMART BUDGET & EXPENSE LEDGER                             */}
          {/* ================================================================ */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Top Financial Ledger Summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Smart Budget & Paise-Accurate Expense Ledger
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Authoritative backend calculations in integer paise · Explicitly separates AI estimates from verified vendor quotations
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('budget')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Budget CSV</span>
                  </button>
                </div>

                {budgetSummary.overBudgetAlerts?.length > 0 && (
                  <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Over-Budget Category Alerts</span>
                    </div>
                    {budgetSummary.overBudgetAlerts.map((alertStr: string, idx: number) => (
                      <p key={idx} className="pl-5">
                        • {alertStr}
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Allocatable Budget (Excl. Reserve)</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {formatPaiseToInr(budgetSummary.allocatableBudgetPaise)}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      +{formatPaiseToInr(budgetSummary.emergencyReservePaise)} Reserve Protected
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Total Logged Expenses</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-indigo-700 mt-1">
                      {formatPaiseToInr(budgetSummary.totalActualExpensesPaise)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Advance Paid: {formatPaiseToInr(budgetSummary.totalAdvancePaidPaise)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Verified Quotes vs AI Estimates</p>
                    <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-1">
                      Verified:{' '}
                      {formatPaiseToInr(
                        budgetSummary.confirmedInvoiceTotalPaise +
                          budgetSummary.verifiedVendorQuotationTotalPaise
                      )}
                    </p>
                    <p className="text-[11px] text-amber-800 font-mono mt-0.5">
                      AI Est. Only: {formatPaiseToInr(budgetSummary.aiEstimatedExpenseTotalPaise)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Remaining Balance Payable</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {formatPaiseToInr(budgetSummary.totalRemainingPayablePaise)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Unspent Budget: {formatPaiseToInr(budgetSummary.remainingUnspentBudgetPaise)}
                    </p>
                  </div>
                </div>

                {/* Recharts Visualization */}
                {chartData.length > 0 && (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                        <Tooltip
                          formatter={(value: any) => formatInrNumber(Number(value))}
                          contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="PlannedINR" name="Planned Allocation (₹)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ActualINR" name="Logged Expense (₹)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Category Allocations vs. Actual Spend</h2>
                  <span className="text-xs text-slate-500">All values computed in integer paise</span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Basis</th>
                      <th className="py-3 px-4 text-right">Planned (INR)</th>
                      <th className="py-3 px-4 text-right">Actual Logged (INR)</th>
                      <th className="py-3 px-4 text-right">Advance Paid</th>
                      <th className="py-3 px-4 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetSummary.categoryBreakdown.map((cat: any) => (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {cat.name}
                          {cat.notes && <p className="text-[11px] font-normal text-slate-500">{cat.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cat.isAiEstimated ? 'AI Estimated Allocation' : 'Owner Planned'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatPaiseToInr(cat.plannedAmountPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatPaiseToInr(cat.actualAmountPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatPaiseToInr(cat.advancePaidPaise)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            cat.isOverBudget ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {cat.isOverBudget ? 'Over by ' : 'Under by '}
                          {formatPaiseToInr(Math.abs(cat.variancePaise))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Forms: Log New Expense & Add Category */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleAddExpense}
                  className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">Log Expense / Vendor Invoice</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                      <select
                        value={expCategoryId}
                        onChange={(e) => setExpCategoryId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        {categories.map((c: any) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Price Verification Basis *
                      </label>
                      <select
                        value={expPriceType}
                        onChange={(e) => setExpPriceType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="confirmed_invoice">Confirmed Vendor Invoice</option>
                        <option value="vendor_quotation">Verified Vendor Quotation</option>
                        <option value="ai_estimate">Unverified AI Estimate</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expense Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        placeholder="e.g., Sound & Truss Rigging Deposit"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Name</label>
                      <input
                        type="text"
                        value={expVendor}
                        onChange={(e) => setExpVendor(e.target.value)}
                        placeholder="Apex Stage Audio Pvt Ltd"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total Amount (₹ INR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={expAmountInr}
                        onChange={(e) => setExpAmountInr(e.target.value)}
                        placeholder="150000"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Advance Paid (₹ INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={expAdvanceInr}
                        onChange={(e) => setExpAdvanceInr(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={expPaymentStatus}
                        onChange={(e) => setExpPaymentStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="planned">Planned</option>
                        <option value="advance_paid">Advance Paid</option>
                        <option value="paid">Fully Paid</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Expense in Paise Ledger</span>
                  </button>
                </form>

                <form
                  onSubmit={handleAddBudgetCategory}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">Add Budget Category</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g., Bridal Mehendi & Folk Artists"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Planned Allocation (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newCatAmountInr}
                      onChange={(e) => setNewCatAmountInr(e.target.value)}
                      placeholder="120000"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={newCatNotes}
                      onChange={(e) => setNewCatNotes(e.target.value)}
                      placeholder="Includes organic henna cones & seating"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </form>
              </div>

              {/* Expense History Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Recorded Expense Ledger</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Item & Vendor</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Verification Basis</th>
                      <th className="py-3 px-4 text-right">Total (INR)</th>
                      <th className="py-3 px-4 text-right">Advance Paid</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp: any) => (
                      <tr key={exp._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{exp.title}</p>
                          <p className="text-[11px] text-slate-500">{exp.vendorName || 'Direct Expense'}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{exp.categoryName}</td>
                        <td className="py-3 px-4">
                          {exp.priceType === 'confirmed_invoice' && (
                            <span className="font-semibold text-emerald-700">Confirmed Invoice</span>
                          )}
                          {exp.priceType === 'vendor_quotation' && (
                            <span className="font-medium text-indigo-700">Verified Vendor Quote</span>
                          )}
                          {exp.priceType === 'ai_estimate' && (
                            <span className="text-amber-700">AI Estimate (Unverified)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {formatPaiseToInr(exp.amountPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatPaiseToInr(exp.advancePaidPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                          {formatPaiseToInr(Math.max(0, exp.amountPaise - exp.advancePaidPaise))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                            aria-label="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: TIMELINE, CHECKLIST & EVENT-DAY RUN SHEET                 */}
          {/* ================================================================ */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Timeline, Checklist & Event-Day Run Sheet
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tasks.filter((t: any) => t.status === 'completed').length} of {tasks.length} tasks completed
                    </p>
                  </div>

                  {/* Interactive View Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                    {(
                      [
                        { id: 'checklist', label: 'Task Checklist' },
                        { id: 'calendar', label: 'Calendar Schedule' },
                        { id: 'run_sheet', label: 'Event-Day Run Sheet' },
                      ] as const
                    ).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setTimelineView(v.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          timelineView === v.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Task / Run Sheet Form */}
                <form
                  onSubmit={handleCreateTask}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Add task or event-day run-sheet cue..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taskIsRunSheet}
                        onChange={(e) => setTaskIsRunSheet(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Run Sheet Cue</span>
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Add Item
                    </button>
                  </div>
                </form>

                {/* View 1: Task Checklist */}
                {timelineView === 'checklist' && (
                  <div className="space-y-2.5">
                    {tasks
                      .filter((t: any) => !t.isEventDayRunSheet)
                      .map((t: any) => {
                        const isOverdue =
                          t.status !== 'completed' && new Date(t.dueDate).getTime() < Date.now();
                        return (
                          <div
                            key={t._id}
                            className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={t.status === 'completed'}
                                onChange={() => handleToggleTaskStatus(t)}
                                className="mt-1 rounded border-slate-300 text-indigo-600 cursor-pointer"
                                aria-label={`Mark ${t.title} complete`}
                              />
                              <div>
                                <p
                                  className={`text-xs font-semibold ${
                                    t.status === 'completed'
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {t.title}
                                </p>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="uppercase font-mono text-indigo-700">{t.priority}</span>
                                  <span>·</span>
                                  <span className="capitalize">{t.category}</span>
                                  <span>·</span>
                                  <span>Due {formatDateShort(t.dueDate)}</span>
                                  <span>·</span>
                                  <span>Assignee: {t.assignedToName}</span>
                                  {isOverdue && (
                                    <span className="text-red-600 font-semibold">· OVERDUE</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t._id)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              aria-label="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* View 2: Chronological Calendar Schedule */}
                {timelineView === 'calendar' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...tasks]
                      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .map((t: any) => (
                        <div key={t._id} className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-mono text-[11px] text-indigo-700 mb-1">
                            <span>{formatDateShort(t.dueDate)}</span>
                            <span className="uppercase">{t.priority}</span>
                          </div>
                          <p className="font-bold text-slate-900 mb-1">{t.title}</p>
                          <p className="text-slate-500 text-[11px]">
                            {t.assignedToName} · Status: {t.status.replace('_', ' ')}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {/* View 3: Event-Day Run Sheet */}
                {timelineView === 'run_sheet' && (
                  <div className="space-y-3">
                    {tasks
                      .filter((t: any) => t.isEventDayRunSheet)
                      .map((t: any) => (
                        <div
                          key={t._id}
                          className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-mono font-bold text-indigo-700">
                                {t.runSheetTime || formatDateShort(t.dueDate)}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 mt-0.5">{t.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Crew / Owner: {t.assignedToName} {t.description ? `· ${t.description}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-white border border-slate-300 text-slate-800'
                            }`}
                          >
                            {t.status === 'completed' ? 'Completed' : 'Mark Cue Done'}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: VENDOR & QUOTATION MANAGEMENT                             */}
          {/* ================================================================ */}
          {activeTab === 'vendors' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Vendor Directory & Quotation Comparison
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track user-entered vendor quotations, verification status, advance payments, and balance payables
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('vendors')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Vendors CSV</span>
                  </button>
                </div>

                {/* Add Vendor Quotation Form */}
                <form
                  onSubmit={handleCreateVendor}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3 mb-6"
                >
                  <p className="text-xs font-bold text-slate-900">Add Vendor Quotation</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="Vendor Business Name *"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <select
                      value={vendorCategory}
                      onChange={(e) => setVendorCategory(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="venue">Venue & Hospitality</option>
                      <option value="catering">Catering & Culinary</option>
                      <option value="decor_florals">Decor & Florals</option>
                      <option value="photography_cinema">Photography & Cinema</option>
                      <option value="music_entertainment">Music & Entertainment</option>
                      <option value="makeup_mehendi">Makeup & Mehendi</option>
                      <option value="logistics_transport">Logistics & Transport</option>
                      <option value="lighting_sound">Lighting & Sound</option>
                    </select>
                    <input
                      type="text"
                      value={vendorContact}
                      onChange={(e) => setVendorContact(e.target.value)}
                      placeholder="Contact Person"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      placeholder="Phone Number"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <input
                      type="number"
                      required
                      min={0}
                      value={vendorQuoteInr}
                      onChange={(e) => setVendorQuoteInr(e.target.value)}
                      placeholder="Quoted Amount (₹ INR) *"
                      className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="number"
                      min={0}
                      value={vendorAdvanceInr}
                      onChange={(e) => setVendorAdvanceInr(e.target.value)}
                      placeholder="Advance Paid (₹)"
                      className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={vendorDocRef}
                      onChange={(e) => setVendorDocRef(e.target.value)}
                      placeholder="Quote Ref (e.g. QTN-104.pdf)"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={vendorVerified}
                        onChange={(e) => setVendorVerified(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Verified Quote</span>
                    </label>
                    <button
                      type="submit"
                      className="py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Save Quotation
                    </button>
                  </div>
                </form>

                {/* Vendor Quotations Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Vendor & Deliverables</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Quote Basis</th>
                        <th className="py-3 px-4 text-right">Quoted (INR)</th>
                        <th className="py-3 px-4 text-right">Advance Paid</th>
                        <th className="py-3 px-4 text-right">Balance Due</th>
                        <th className="py-3 px-4">Booking Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendors.map((v: any) => (
                        <tr key={v._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{v.vendorName}</p>
                            <p className="text-[11px] text-slate-500">
                              {v.contactPerson} · {v.phone} {v.documentReference ? `· ${v.documentReference}` : ''}
                            </p>
                            {v.deliverablesNotes && (
                              <p className="text-[11px] text-slate-600 mt-0.5">{v.deliverablesNotes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 capitalize">{v.serviceCategory.replace('_', ' ')}</td>
                          <td className="py-3 px-4">
                            {v.isVerifiedQuotation ? (
                              <span className="font-semibold text-emerald-700">Verified Vendor Quote</span>
                            ) : (
                              <span className="text-amber-700">Unverified Estimate</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                            {formatPaiseToInr(v.quotedAmountPaise)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatPaiseToInr(v.advancePaidPaise)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                            {formatPaiseToInr(Math.max(0, v.quotedAmountPaise - v.advancePaidPaise))}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={v.status}
                              onChange={(e) => handleUpdateVendorStatus(v._id, e.target.value)}
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-medium"
                            >
                              <option value="shortlisted">Shortlisted</option>
                              <option value="contacted">Contacted</option>
                              <option value="booked">Booked</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteVendor(v._id)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              aria-label="Delete vendor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: GUEST & DIETARY MATRIX                                    */}
          {/* ================================================================ */}
          {activeTab === 'guests' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Guest List, RSVP & Dietary Matrix
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Protected guest contact records · Isolated from unauthorized collaborators and vendors
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('guests')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Sanitized Guest CSV</span>
                  </button>
                </div>

                {/* Guest & Dietary Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Confirmed Headcount</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                      {confirmedGuestsHeadcount} pax
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Tentative / Pending</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                      {tentativeGuestsHeadcount + pendingGuestsHeadcount} pax
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Jain (No Onion/Garlic)</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
                      {dietaryCounts['jain_no_onion_garlic'] || 0} pax
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="text-xs text-slate-500">Accessibility Support</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {accessibilityGuestsCount} groups
                    </p>
                  </div>
                </div>

                {/* Add Guest Form */}
                <form
                  onSubmit={handleCreateGuest}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3 mb-6"
                >
                  <p className="text-xs font-bold text-slate-900">Add Guest / Family Group</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Full Name or Family Title *"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <select
                      value={guestGroup}
                      onChange={(e) => setGuestGroup(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="family_bride">Bride Family</option>
                      <option value="family_groom">Groom Family</option>
                      <option value="vip_dignitaries">VIP & Dignitaries</option>
                      <option value="friends">Friends</option>
                      <option value="colleagues">Colleagues</option>
                      <option value="community">Community</option>
                    </select>
                    <select
                      value={guestDietary}
                      onChange={(e) => setGuestDietary(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="standard_veg">Standard Vegetarian</option>
                      <option value="jain_no_onion_garlic">Jain (No Onion/Garlic)</option>
                      <option value="vegan">Vegan</option>
                      <option value="non_veg">Non-Vegetarian</option>
                      <option value="gluten_free">Gluten-Free</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={guestHeadcount}
                      onChange={(e) => setGuestHeadcount(Number(e.target.value))}
                      placeholder="Headcount"
                      className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={guestSeating}
                      onChange={(e) => setGuestSeating(e.target.value)}
                      placeholder="Table / Suite / Seating Note"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="Phone (+91...)"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={guestAccessibility}
                        onChange={(e) => setGuestAccessibility(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Elders / Wheelchair Support</span>
                    </label>
                    <button
                      type="submit"
                      className="py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Add Guest Record
                    </button>
                  </div>
                </form>

                {/* Guest Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Guest / Family</th>
                        <th className="py-3 px-4">Group</th>
                        <th className="py-3 px-4 text-right">Headcount</th>
                        <th className="py-3 px-4">Dietary Stream</th>
                        <th className="py-3 px-4">Seating & Accessibility</th>
                        <th className="py-3 px-4">RSVP Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {guests.map((g: any) => (
                        <tr key={g._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{g.fullName}</p>
                            <p className="text-[11px] text-slate-500">{g.phone || g.email}</p>
                          </td>
                          <td className="py-3 px-4 capitalize">{g.groupName.replace('_', ' ')}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                            {g.headcount}
                          </td>
                          <td className="py-3 px-4 capitalize">{g.dietaryPreference.replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {g.tableOrSeatingNote || '—'}
                            {g.requiresAccessibilitySupport && (
                              <span className="block text-[11px] font-semibold text-indigo-700">
                                Requires Step-Free / Elders Assistance
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={g.rsvpStatus}
                              onChange={(e) => handleUpdateGuestRsvp(g._id, e.target.value)}
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-medium"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="tentative">Tentative</option>
                              <option value="pending">Pending</option>
                              <option value="declined">Declined</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(g._id)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              aria-label="Remove guest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bulk CSV Import */}
                <form
                  onSubmit={handleBulkCsvImport}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                >
                  <p className="text-xs font-bold text-slate-800">
                    Bulk CSV Import (Format: Full Name, Headcount, Dietary, RSVP, Seating Note)
                  </p>
                  <textarea
                    rows={2}
                    value={csvImportText}
                    onChange={(e) => setCsvImportText(e.target.value)}
                    placeholder="Shashi & Meena Kapoor, 3, jain_no_onion_garlic, confirmed, Table 4 Courtyard"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Validate & Import CSV Rows
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 7: REPORTS, EXPORT & EVENT SETTINGS                          */}
          {/* ================================================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Printable Executive Report & Authorized Exports
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All CSV exports neutralize spreadsheet formula injection (`=`, `+`, `-`, `@` prefixes)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / Save PDF Dossier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCsv('budget')}
                      className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Budget CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCsv('vendors')}
                      className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Vendors CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCsv('guests')}
                      className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Guests CSV
                    </button>
                  </div>
                </div>

                {/* Printable Summary Sheet */}
                <div className="mt-6 space-y-6 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <div>
                      <p className="text-slate-500">Event Title & Venue</p>
                      <p className="font-bold text-slate-900 mt-0.5">{event.title}</p>
                      <p className="text-slate-600">{event.venueName || event.city}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Financial Position</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        Gross: {formatPaiseToInr(budgetSummary.totalBudgetPaise)}
                      </p>
                      <p className="font-mono text-indigo-700">
                        Actual: {formatPaiseToInr(budgetSummary.totalActualExpensesPaise)} (
                        {budgetSummary.utilizationPercent}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Operational Readiness</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        Confirmed Guests: {confirmedGuestsHeadcount} pax
                      </p>
                      <p className="font-mono text-slate-600">
                        Booked Vendors:{' '}
                        {vendors.filter((v: any) => v.status === 'booked' || v.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone: Delete Event */}
              <div className="bg-white border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-red-700">Delete This Event</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Atomically deletes this event along with its budget categories, expenses, tasks, vendor quotes, and
                    guest list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteEntireEvent}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event Permanently</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
