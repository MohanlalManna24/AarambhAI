import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import {
  ArrowRight,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Users,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

const SAMPLE_BLUEPRINTS: Record<
  string,
  {
    title: string;
    city: string;
    guests: number;
    budgetInr: string;
    reserveInr: string;
    theme: string;
    allocations: { name: string; pct: number; inr: string }[];
    runSheet: { time: string; item: string; owner: string }[];
  }
> = {
  wedding: {
    title: 'Royal Mewar Courtyard Wedding & Sangeet',
    city: 'Udaipur, Rajasthan',
    guests: 320,
    budgetInr: '₹42,00,000',
    reserveInr: '₹3,50,000',
    theme: 'Saffron Marigold & Ivory Heritage Pichwai',
    allocations: [
      { name: 'Heritage Venue & 48 Suites', pct: 35, inr: '₹14,50,000' },
      { name: 'Royal Rajasthani & Jain Catering', pct: 23, inr: '₹9,80,000' },
      { name: 'Pichwai Florals & Sustainable Mandap', pct: 15, inr: '₹6,20,000' },
      { name: 'Documentary Photography & Cinema', pct: 9, inr: '₹3,80,000' },
      { name: 'Manganiyar Folk & Sangeet Audio', pct: 6, inr: '₹2,40,000' },
    ],
    runSheet: [
      { time: 'Day 1 · 10:30 AM', item: 'Manganiyar Folk Welcome & Kulhad Thandai', owner: 'Hospitality Desk' },
      { time: 'Day 1 · 01:30 PM', item: 'Courtyard Marigold Haldi Carnival', owner: 'Ritual Team' },
      { time: 'Day 2 · 05:15 PM', item: 'Sunset Lake Terrace Varmala & Vedic Pheras', owner: 'Mandap Director' },
    ],
  },
  corporate: {
    title: 'Bharat FinTech Founders Annual Conclave',
    city: 'Bandra Kurla Complex, Mumbai',
    guests: 240,
    budgetInr: '₹18,50,000',
    reserveInr: '₹1,50,000',
    theme: 'Architectural Slate & Executive Keynote',
    allocations: [
      { name: 'Convention Hall & Breakout Lounges', pct: 46, inr: '₹8,50,000' },
      { name: 'Executive Vegetarian & Jain Buffet', pct: 23, inr: '₹4,30,000' },
      { name: 'P2.5 LED Wall, Broadcast Audio & Captioning', pct: 23, inr: '₹4,20,000' },
      { name: 'Delegate Kits & Badge Printing', pct: 8, inr: '₹1,50,000' },
    ],
    runSheet: [
      { time: '09:00 AM', item: 'RFID Badge Check-In & Artisanal Filter Coffee Bar', owner: 'Registration Team' },
      { time: '10:15 AM', item: 'Traditional Lamp Lighting & Opening Keynote', owner: 'Stage Producer' },
      { time: '01:15 PM', item: 'Curated Networking Lunch & Investor Roundtables', owner: 'Catering Lead' },
    ],
  },
  birthday: {
    title: '50th Golden Milestone Courtyard Gala',
    city: 'Bengaluru, Karnataka',
    guests: 140,
    budgetInr: '₹8,80,000',
    reserveInr: '₹80,000',
    theme: 'Botanical Conservatory & Carnatic Jazz Fusion',
    allocations: [
      { name: 'Glasshouse Boutique Venue', pct: 36, inr: '₹3,20,000' },
      { name: 'Artisanal South Indian & Global Tapas', pct: 32, inr: '₹2,80,000' },
      { name: 'Botanical Warm Edison & Floral Styling', pct: 16, inr: '₹1,40,000' },
      { name: 'Live Acoustic Quartet & Portrait Studio', pct: 16, inr: '₹1,40,000' },
    ],
    runSheet: [
      { time: '06:30 PM', item: 'Filter Kaapi & Botanical Mocktail Reception', owner: 'Bar Captain' },
      { time: '07:45 PM', item: 'Family Audio-Visual Retrospective & Toast', owner: 'AV Coordinator' },
      { time: '08:45 PM', item: 'Live Appam & Gourmet Grazing Dinner', owner: 'Head Chef' },
    ],
  },
  cultural: {
    title: 'Sharad Utsav Classical Music & Craft Sammelan',
    city: 'Kolkata, West Bengal',
    guests: 450,
    budgetInr: '₹12,00,000',
    reserveInr: '₹1,20,000',
    theme: 'Terracotta Alpona & Shola Pith Craftsmanship',
    allocations: [
      { name: 'Heritage Auditorium & Open Lawn', pct: 32, inr: '₹3,85,000' },
      { name: 'Traditional Bhog & Bengali Festive Spread', pct: 34, inr: '₹4,10,000' },
      { name: 'Shola Pith & Alpona Artisan Stage', pct: 18, inr: '₹2,15,000' },
      { name: 'Classical Concert Sound & Artist Honorariums', pct: 16, inr: '₹1,90,000' },
    ],
    runSheet: [
      { time: '05:00 PM', item: 'Dhak Welcome & Artisan Craft Exhibition Opening', owner: 'Cultural Secretary' },
      { time: '06:30 PM', item: 'Sarod & Tabla Jugalbandi Recital', owner: 'Sound Engineer' },
      { time: '08:30 PM', item: 'Community Sit-Down Festive Dinner', owner: 'Hospitality Committee' },
    ],
  },
};

export const LandingPage: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'wedding' | 'corporate' | 'birthday' | 'cultural'>('wedding');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeSample = SAMPLE_BLUEPRINTS[selectedType];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (single text element, one line) */}
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Aarambh AI
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#capabilities"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#blueprints"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Blueprints
            </a>
            <a
              href="#workflow"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#pricing"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user ? 'Open Workspace' : 'Launch Planner'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="text-xs font-medium text-slate-500 mb-4 flex items-center gap-2">
                <span>GenAI Event Architecture</span>
                <span aria-hidden="true">·</span>
                <span>Paise-Accurate INR Ledger</span>
                <span aria-hidden="true">·</span>
                <span>Server-Enforced RBAC</span>
              </div>

              <h1
                className="font-bold tracking-tight text-slate-900 leading-[1.12] mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                Plan Indian & global celebrations with architectural precision.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl mb-8">
                Generate schema-validated AI event blueprints, track integer-paise INR budgets distinguishing
                AI estimates from verified vendor quotations, coordinate timelines and run sheets, and manage
                guest dietary & accessibility requirements in one secure workspace.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(user ? '/events/new' : '/register')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Start Event Blueprint</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{user ? 'Go to Dashboard' : 'Sign In / Try Live Demo'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Architectural Blueprint Preview Card */}
            <div className="lg:col-span-5 flex">
              <div className="w-full bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Live Blueprint Preview · Udaipur</p>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        Aarav & Priya — Courtyard Wedding
                      </h2>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-indigo-700 font-semibold">
                      ₹42,00,000
                    </span>
                  </div>

                  {/* Architectural SVG Courtyard & Mandap Diagram */}
                  <div className="bg-slate-900 rounded-lg p-4 text-white mb-4">
                    <svg
                      viewBox="0 0 400 135"
                      className="w-full h-32"
                      role="img"
                      aria-label="Architectural event floorplan and budget allocation preview"
                    >
                      <rect x="4" y="4" width="392" height="127" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                      {/* Courtyard Grid */}
                      <line x1="140" y1="4" x2="140" y2="131" stroke="#1E293B" strokeDasharray="3 3" />
                      <line x1="270" y1="4" x2="270" y2="131" stroke="#1E293B" strokeDasharray="3 3" />
                      {/* Mandap Zone */}
                      <rect x="18" y="18" width="106" height="98" rx="4" fill="#1E1B4B" stroke="#6366F1" strokeWidth="1.2" />
                      <circle cx="71" cy="56" r="18" fill="none" stroke="#818CF8" strokeWidth="1.5" />
                      <text x="71" y="96" textAnchor="middle" fill="#E0E7FF" fontSize="9" fontFamily="Plus Jakarta Sans">
                        Pichwai Mandap
                      </text>
                      <text x="71" y="108" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono">
                        Ramp · 1:12 Slope
                      </text>
                      {/* Dining & Jain Kitchen Zone */}
                      <rect x="154" y="18" width="102" height="45" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1" />
                      <text x="205" y="38" textAnchor="middle" fill="#D1FAE5" fontSize="9" fontFamily="Plus Jakarta Sans">
                        Jain & Vegan Live
                      </text>
                      <text x="205" y="51" textAnchor="middle" fill="#6EE7B7" fontSize="8" fontFamily="JetBrains Mono">
                        140 Pax Separated
                      </text>
                      {/* Acoustic Sangeet Stage */}
                      <rect x="154" y="71" width="102" height="45" rx="4" fill="#1E293B" stroke="#64748B" strokeWidth="1" />
                      <text x="205" y="91" textAnchor="middle" fill="#F1F5F9" fontSize="9" fontFamily="Plus Jakarta Sans">
                        Manganiyar Stage
                      </text>
                      <text x="205" y="104" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono">
                        10 PM Indoor Shift
                      </text>
                      {/* Reserve & Ledger */}
                      <rect x="282" y="18" width="100" height="98" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                      <text x="332" y="42" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="Plus Jakarta Sans">
                        Emergency Reserve
                      </text>
                      <text x="332" y="58" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                        ₹3,50,000
                      </text>
                      <text x="332" y="84" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="Plus Jakarta Sans">
                        Confirmed Quotes
                      </text>
                      <text x="332" y="100" textAnchor="middle" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                        84.3% Locked
                      </text>
                    </svg>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Heritage Venue & 48 Suites (Confirmed Invoice)</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">₹14,20,000</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Mewar Royal & Jain Catering (Vendor Quote)</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">₹9,40,000</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-600">Protected Emergency Reserve (Untouched)</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-700">₹3,50,000</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>320 Guests · 4 Dietary Streams</span>
                  <span className="font-mono tabular-nums text-slate-700">Paise Integer Ledger</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Quantitative Proof Strip Below Hero Split */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-xl p-6">
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">100 Paise = ₹1</p>
              <p className="text-xs text-slate-600 mt-1">
                Zero floating-point rounding drift across planned budgets, advances, and vendor balances.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">12 Collections</p>
              <p className="text-xs text-slate-600 mt-1">
                Mongoose-validated schemas with compound indexes and strict owner/member isolation.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">Zod + Gemini</p>
              <p className="text-xs text-slate-600 mt-1">
                Server-side structured JSON generation that never overwrites approved plans without consent.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">OWASP CSV Safe</p>
              <p className="text-xs text-slate-600 mt-1">
                Formula-injection neutralization and HttpOnly + CSRF-protected cookie sessions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Core Capabilities (Editorial Numbering, Asymmetric Bento) */}
        <section id="capabilities" className="bg-white border-y border-slate-200 py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-indigo-600 mb-2">Platform Architecture</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Engineered for real financial, culinary, and operational complexity.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#F8FAFC] border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    01. Schema-Validated AI Event Planning Assistant
                  </h3>
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Generates a 12-part structured blueprint tailored to your city, guest count, dietary needs,
                  and INR budget: Overview, Theme & Decor concepts, Category Budget Allocation, Preparation
                  Timeline, Vendor Specifications, Task Checklist, Menu & Entertainment, Shopping List,
                  Event-Day Run Sheet, Risk & Contingency plans, and Cost-Saving Substitutions.
                </p>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <span>Server-Side Gemini API</span>
                  <span>·</span>
                  <span>Untrusted Prompt Sanitization</span>
                  <span>·</span>
                  <span>Explicit Approval Gate</span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    02. Smart Paise-Accurate Budget Ledger
                  </h3>
                  <IndianRupee className="w-5 h-5 text-indigo-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  All financial records are stored and calculated in integer paise on the backend. Clearly
                  separates AI-generated estimates from verified vendor quotations and confirmed invoices,
                  while protecting your emergency reserve.
                </p>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <span>Over-Budget Alerts</span>
                  <span>·</span>
                  <span>Advance & Balance Tracking</span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    03. Timeline, Checklist & Event-Day Run Sheet
                  </h3>
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Switch seamlessly between prioritized preparation checklists, monthly calendar views, and
                  hour-by-hour event-day run sheets with overdue indicators and assignee tracking.
                </p>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <span>Calendar & List Views</span>
                  <span>·</span>
                  <span>Hour-by-Hour Run Sheet</span>
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#F8FAFC] border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    04. Vendor Quotations, Guest Dietary Matrix & Authorized Reports
                  </h3>
                  <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Compare user-entered vendor quotations across 9 service categories, track guest RSVPs and
                  Indian dietary streams (Jain No-Onion/Garlic, Standard Veg, Vegan, Gluten-Free), and export
                  formula-sanitized CSVs or printable executive summaries.
                </p>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <span>Vendor Advance Ledger</span>
                  <span>·</span>
                  <span>Bulk Guest CSV Import</span>
                  <span>·</span>
                  <span>Printable Executive Dossier</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Event-Type Blueprint Explorer */}
        <section id="blueprints" className="max-w-7xl mx-auto py-16 px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-medium text-indigo-600 mb-2">Interactive Blueprints</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Explore sample event architectures by category
              </h2>
            </div>

            {/* Interactive Segmented Filter Control */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
              {(
                [
                  { id: 'wedding', label: 'Weddings & Sangeet' },
                  { id: 'corporate', label: 'Corporate Summits' },
                  { id: 'birthday', label: 'Milestone Birthdays' },
                  { id: 'cultural', label: 'Cultural Programs' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedType === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <div className="text-xs text-slate-500 mb-2">
                <span>{activeSample.city}</span>
                <span> · </span>
                <span>{activeSample.guests} Guests</span>
                <span> · </span>
                <span>Reserve {activeSample.reserveInr}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{activeSample.title}</h3>
              <p className="text-xs text-slate-600 mb-6">Theme Direction: {activeSample.theme}</p>

              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                Planned Category Allocation (Total {activeSample.budgetInr})
              </h4>
              <div className="space-y-3">
                {activeSample.allocations.map((alloc) => (
                  <div key={alloc.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-800">{alloc.name}</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {alloc.inr} ({alloc.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${alloc.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-4">
                  Sample Event-Day Run Sheet Preview
                </h4>
                <div className="space-y-3">
                  {activeSample.runSheet.map((slot) => (
                    <div
                      key={slot.time}
                      className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                          {slot.time}
                        </p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{slot.item}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                        {slot.owner}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Ready to customize this template with your own dates & budget?
                </span>
                <button
                  type="button"
                  onClick={() => navigate(user ? '/events/new' : '/register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Use This Blueprint
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Workflow Explanation */}
        <section id="workflow" className="bg-white border-y border-slate-200 py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-10">
              How Aarambh AI safeguards your planning workflow
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '01. Configure Event Parameters',
                  desc: 'Capture dates, city, venue type, guest capacity, total INR budget, emergency reserve, and dietary/accessibility requirements in our 4-step wizard.',
                },
                {
                  step: '02. Generate & Validate Blueprint',
                  desc: 'Our backend calls Gemini with strict JSON schema validation. Untrusted inputs are sanitized and existing event records are never overwritten automatically.',
                },
                {
                  step: '03. Approve & Track Paise Ledger',
                  desc: 'Approve AI-suggested categories with one click, then record real vendor quotations, advance payments, and confirmed invoices in integer paise.',
                },
                {
                  step: '04. Execute Run Sheet & Export',
                  desc: 'Manage RSVP headcounts, dietary counters, and event-day run sheets, and export formula-safe CSVs or printable dossiers.',
                },
              ].map((item) => (
                <div key={item.step} className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{item.step}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Pricing-Ready Comparison Section */}
        <section id="pricing" className="max-w-7xl mx-auto py-16 px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium text-indigo-600 mb-2">Transparent Tiers</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Built for personal milestones and professional event studios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                audience: 'For personal family celebrations',
                name: 'Celebration Starter',
                price: '₹0',
                cadence: 'Free forever for up to 2 active events',
                specs: [
                  'Up to 2 active events & 250 guest records/event',
                  '10 AI Blueprint & Idea generations per day',
                  'Paise-accurate INR budget & expense ledger',
                  'CSV exports with formula-injection protection',
                ],
                cta: 'Start Free Account',
                featured: false,
              },
              {
                audience: 'For multi-day weddings & large galas',
                name: 'Royal Host Suite',
                price: '₹2,499',
                cadence: 'Per event · Unlimited revisions',
                specs: [
                  'Unlimited events & up to 5,000 guest records',
                  '25 AI Blueprint & Idea generations per day',
                  'Multi-day Run Sheet, Jain/Vegan dietary matrix & seating notes',
                  'Vendor quotation comparison & advance tracking',
                ],
                cta: 'Launch Royal Host Workspace',
                featured: true,
              },
              {
                audience: 'For corporate & agency operations',
                name: 'Enterprise Studio',
                price: '₹9,999',
                cadence: 'Per month · Multi-user RBAC & Audit Logs',
                specs: [
                  'Role-based Collaborator & Admin governance console',
                  '100 AI generations/day with token & latency telemetry',
                  'Full security audit logs & DPDP data export compliance',
                  'Dedicated MongoDB Atlas isolation & custom categories',
                ],
                cta: 'Explore Studio Features',
                featured: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-6 flex flex-col justify-between bg-white border ${
                  tier.featured ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs text-slate-500 mb-1">{tier.audience}</p>
                  <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                  <div className="mt-4 mb-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                      {tier.price}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">{tier.cadence}</p>

                  <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                    {tier.specs.map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(user ? '/dashboard' : '/register')}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    tier.featured
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section id="faq" className="bg-white border-t border-slate-200 py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: 'Does the AI Assistant overwrite my approved budget or confirmed vendor contracts?',
                  a: 'Never. AI-generated plans are stored as separate versioned proposals. Budget categories and checklist items are only synced when you click "Approve & Apply Blueprint", and existing confirmed vendor invoices are never overwritten.',
                },
                {
                  q: 'How are Indian Rupee (INR) budgets and vendor advances calculated?',
                  a: 'All currency values are stored and computed in integer minor units (paise, where ₹1 = 100 paise) on the backend server. This prevents floating-point rounding errors across planned budgets, advances, balances, and emergency reserves.',
                },
                {
                  q: 'Can other users or unauthorized vendors view my guest list or private events?',
                  a: 'No. Every API endpoint enforces server-side authentication and resource-level ownership/membership verification. Cross-user access attempts are blocked with HTTP 403 and recorded in the security audit log.',
                },
                {
                  q: 'How are LLM API keys and authentication tokens protected?',
                  a: 'The Gemini API key resides strictly on the Express backend and is never bundled into frontend code. Browser sessions use HttpOnly, SameSite cookies paired with HMAC-signed CSRF tokens and server-side session version revocation.',
                },
              ].map((item, idx) => (
                <div key={item.q} className="border border-slate-200 rounded-xl bg-[#F8FAFC]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-900 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        openFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200/70 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs">
          <div>
            <p className="text-white font-bold text-sm">Aarambh AI</p>
            <p className="mt-1">
              Intelligent Event Planning & Paise-Accurate Operations Platform · Built for Indian & Global Celebrations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Create Account
            </Link>
            <Link to="/forgot-password" className="hover:text-white transition-colors">
              Password Recovery
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
