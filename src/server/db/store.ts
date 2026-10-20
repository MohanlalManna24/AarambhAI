import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin' | 'vendor' | 'collaborator';
  emailVerified: boolean;
  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  resetTokenHash: string | null;
  resetExpiresAt: string | null;
  sessionVersion: number;
  status: 'active' | 'suspended' | 'deleted';
  phone: string;
  city: string;
  preferredCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  privacySettings: {
    shareAnalytics: boolean;
    emailNotifications: boolean;
    marketingOptIn: boolean;
  };
  aiDailyCount: number;
  aiLastResetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventDoc {
  _id: string;
  ownerId: string;
  title: string;
  eventType: 'wedding' | 'birthday' | 'anniversary' | 'corporate' | 'cultural' | 'community';
  startDate: string;
  endDate: string;
  timezone: string;
  city: string;
  venueName: string;
  venueAddress: string;
  indoorOutdoor: 'indoor' | 'outdoor' | 'hybrid';
  estimatedGuests: number;
  totalBudgetPaise: number;
  emergencyReservePaise: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  theme: string;
  preferredStyle: string;
  dietaryRequirements: string[];
  accessibilityRequirements: string[];
  culturalPreferences: string;
  specialInstructions: string;
  planningStatus: 'draft' | 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  approvedAiPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventMembershipDoc {
  _id: string;
  eventId: string;
  userId: string;
  invitedBy: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: ('read' | 'tasks:write' | 'guests:write' | 'budget:write' | 'vendors:write')[];
  status: 'pending' | 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategoryDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  name: string;
  plannedAmountPaise: number;
  isAiEstimated: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  categoryId: string;
  categoryName: string;
  title: string;
  vendorName: string;
  amountPaise: number;
  advancePaidPaise: number;
  paymentStatus: 'planned' | 'advance_paid' | 'paid' | 'refunded';
  priceType: 'ai_estimate' | 'vendor_quotation' | 'confirmed_invoice';
  expenseDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  title: string;
  description: string;
  category:
    | 'venue'
    | 'catering'
    | 'decor'
    | 'rituals'
    | 'logistics'
    | 'guests'
    | 'entertainment'
    | 'attire'
    | 'documentation'
    | 'run_sheet';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  dueDate: string;
  isEventDayRunSheet: boolean;
  runSheetTime: string;
  assignedToName: string;
  dependsOnTaskIds: string[];
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventVendorDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  vendorName: string;
  serviceCategory:
    | 'venue'
    | 'catering'
    | 'decor_florals'
    | 'photography_cinema'
    | 'music_entertainment'
    | 'makeup_mehendi'
    | 'logistics_transport'
    | 'invitations_gifting'
    | 'lighting_sound';
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  quotedAmountPaise: number;
  advancePaidPaise: number;
  isVerifiedQuotation: boolean;
  status: 'shortlisted' | 'contacted' | 'booked' | 'completed' | 'cancelled';
  followUpDate: string | null;
  deliverablesNotes: string;
  documentReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  fullName: string;
  email: string;
  phone: string;
  groupName: 'family_bride' | 'family_groom' | 'friends' | 'vip_dignitaries' | 'colleagues' | 'community' | 'general';
  tags: string[];
  rsvpStatus: 'pending' | 'confirmed' | 'declined' | 'tentative';
  invitationStatus: 'not_sent' | 'sent' | 'viewed';
  headcount: number;
  dietaryPreference:
    | 'standard_veg'
    | 'jain_no_onion_garlic'
    | 'non_veg'
    | 'vegan'
    | 'gluten_free'
    | 'halal'
    | 'kids_meal';
  tableOrSeatingNote: string;
  requiresAccessibilitySupport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiPlanGenerationDoc {
  _id: string;
  eventId: string;
  ownerId: string;
  modelName: string;
  generationType: 'full_plan' | 'personalized_ideas' | 'budget_optimization';
  status: 'succeeded' | 'failed' | 'applied';
  promptSummary: string;
  structuredPlan: any;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  latencyMs: number;
  errorMessage: string;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDoc {
  _id: string;
  userId: string;
  eventId: string | null;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDoc {
  _id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  requestId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AbuseReportDoc {
  _id: string;
  reporterUserId: string;
  reporterEmail: string;
  targetType: 'event' | 'vendor' | 'ai_output' | 'user';
  targetId: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConfigDoc {
  _id: string;
  aiDailyQuotaPerUser: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  enableCollaboratorModule: boolean;
  enableVendorModule: boolean;
  supportedEventCategories: {
    slug: string;
    label: string;
    defaultCurrency: string;
    active: boolean;
  }[];
  updatedAt: string;
}

export interface DatabaseCollections {
  users: UserDoc[];
  events: EventDoc[];
  memberships: EventMembershipDoc[];
  budgetCategories: BudgetCategoryDoc[];
  expenses: ExpenseDoc[];
  tasks: TaskDoc[];
  eventVendors: EventVendorDoc[];
  guests: GuestDoc[];
  aiGenerations: AiPlanGenerationDoc[];
  notifications: NotificationDoc[];
  auditLogs: AuditLogDoc[];
  abuseReports: AbuseReportDoc[];
  platformConfig: PlatformConfigDoc;
}

export function newObjectId(): string {
  return new mongoose.Types.ObjectId().toHexString();
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aarambh_db.json');

function createInitialSeedData(): DatabaseCollections {
  const now = new Date().toISOString();
  const priyaId = '671400000000000000000001';
  const adminId = '671400000000000000000002';
  const rohanId = '671400000000000000000003';

  const weddingEventId = '671400000000000000000101';
  const corporateEventId = '671400000000000000000102';
  const rohanEventId = '671400000000000000000103';

  const catVenueId = '671400000000000000000201';
  const catCateringId = '671400000000000000000202';
  const catDecorId = '671400000000000000000203';
  const catPhotoId = '671400000000000000000204';
  const catMusicId = '671400000000000000000205';
  const catLogisticsId = '671400000000000000000206';

  const corpCatVenueId = '671400000000000000000207';
  const corpCatAvId = '671400000000000000000208';
  const corpCatCateringId = '671400000000000000000209';

  const defaultPasswordHash = bcrypt.hashSync('Aarambh@2026!', 10);
  const adminPasswordHash = bcrypt.hashSync('Admin@2026!', 10);

  return {
    users: [
      {
        _id: priyaId,
        name: 'Priya Sharma',
        email: 'priya.sharma@aarambh-events.in',
        passwordHash: defaultPasswordHash,
        role: 'customer',
        emailVerified: true,
        verificationTokenHash: null,
        verificationExpiresAt: null,
        resetTokenHash: null,
        resetExpiresAt: null,
        sessionVersion: 1,
        status: 'active',
        phone: '+91 98201 44510',
        city: 'Udaipur',
        preferredCurrency: 'INR',
        privacySettings: {
          shareAnalytics: true,
          emailNotifications: true,
          marketingOptIn: false,
        },
        aiDailyCount: 2,
        aiLastResetDate: now.slice(0, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: adminId,
        name: 'Vikramaditya Nair (Platform Admin)',
        email: 'admin@aarambh-events.in',
        passwordHash: adminPasswordHash,
        role: 'admin',
        emailVerified: true,
        verificationTokenHash: null,
        verificationExpiresAt: null,
        resetTokenHash: null,
        resetExpiresAt: null,
        sessionVersion: 1,
        status: 'active',
        phone: '+91 98112 77890',
        city: 'Bengaluru',
        preferredCurrency: 'INR',
        privacySettings: {
          shareAnalytics: false,
          emailNotifications: true,
          marketingOptIn: false,
        },
        aiDailyCount: 1,
        aiLastResetDate: now.slice(0, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: rohanId,
        name: 'Rohan Verma',
        email: 'rohan.verma@aarambh-events.in',
        passwordHash: defaultPasswordHash,
        role: 'customer',
        emailVerified: true,
        verificationTokenHash: null,
        verificationExpiresAt: null,
        resetTokenHash: null,
        resetExpiresAt: null,
        sessionVersion: 1,
        status: 'active',
        phone: '+91 98450 11223',
        city: 'Delhi NCR',
        preferredCurrency: 'INR',
        privacySettings: {
          shareAnalytics: false,
          emailNotifications: true,
          marketingOptIn: false,
        },
        aiDailyCount: 0,
        aiLastResetDate: now.slice(0, 10),
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        _id: weddingEventId,
        ownerId: priyaId,
        title: 'Aarav & Priya — Royal Mewar Courtyard Wedding',
        eventType: 'wedding',
        startDate: '2026-12-12T10:30:00.000Z',
        endDate: '2026-12-14T18:00:00.000Z',
        timezone: 'Asia/Kolkata',
        city: 'Udaipur, Rajasthan',
        venueName: 'Fateh Garh Heritage Courtyard & Lake Terrace',
        venueAddress: 'Sisarma Road, Udaipur, Rajasthan 313001',
        indoorOutdoor: 'hybrid',
        estimatedGuests: 320,
        // ₹42,00,000.00 in paise = 420000000
        totalBudgetPaise: 420000000,
        // ₹3,50,000.00 emergency reserve in paise = 35000000
        emergencyReservePaise: 35000000,
        currency: 'INR',
        theme: 'Saffron Marigold & Ivory Heritage Pichwai',
        preferredStyle: 'Royal Heritage & Sustainable Craft',
        dietaryRequirements: ['Standard Vegetarian', 'Jain (No Onion/Garlic Counter)', 'Vegan Live Station', 'Gluten-Free Desserts'],
        accessibilityRequirements: ['Wheelchair Ramp at Courtyard Mandap', 'Golf Cart Shuttle for Senior Citizens', 'Reserved Front-Row Elders Seating'],
        culturalPreferences: 'Traditional Marwari & North Indian pheras at sunset, preceded by daytime Haldi courtyard carnival and Sufi acoustic sangeet.',
        specialInstructions: 'Ensure zero single-use plastics; use terracotta kulhads, brass thalis, and locally sourced marigold/rajnigandha garlands.',
        planningStatus: 'confirmed',
        approvedAiPlanId: '671400000000000000000901',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: corporateEventId,
        ownerId: priyaId,
        title: 'Bharat FinTech Founders Annual Conclave 2026',
        eventType: 'corporate',
        startDate: '2026-11-20T09:00:00.000Z',
        endDate: '2026-11-20T20:00:00.000Z',
        timezone: 'Asia/Kolkata',
        city: 'Mumbai, Maharashtra',
        venueName: 'Jio World Convention Centre — Jasmine Hall',
        venueAddress: 'Bandra Kurla Complex, Bandra East, Mumbai 400098',
        indoorOutdoor: 'indoor',
        estimatedGuests: 240,
        // ₹18,50,000.00 in paise = 185000000
        totalBudgetPaise: 185000000,
        // ₹1,50,000.00 in paise = 15000000
        emergencyReservePaise: 15000000,
        currency: 'INR',
        theme: 'Architectural Minimalist Slate & Indigo',
        preferredStyle: 'Executive Keynote & High-Density Networking',
        dietaryRequirements: ['Gourmet Vegetarian Buffet', 'Jain Bento Option', 'Artisanal Filter Coffee Bar'],
        accessibilityRequirements: ['Stage Wheelchair Lift', 'Live Captioning Screen on Main Stage'],
        culturalPreferences: 'Formal lighting of traditional brass lamp at inauguration followed by keynote panels.',
        specialInstructions: 'Redundant fiber internet lines and dual lapel mics for 6 keynote panelists.',
        planningStatus: 'planning',
        approvedAiPlanId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: rohanEventId,
        ownerId: rohanId,
        title: 'Verma 25th Silver Jubilee Family Celebration',
        eventType: 'anniversary',
        startDate: '2026-11-28T18:30:00.000Z',
        endDate: '2026-11-28T23:30:00.000Z',
        timezone: 'Asia/Kolkata',
        city: 'New Delhi',
        venueName: 'The Lodhi Garden Pavilion',
        venueAddress: 'Lodhi Road, New Delhi 110003',
        indoorOutdoor: 'outdoor',
        estimatedGuests: 120,
        totalBudgetPaise: 95000000,
        emergencyReservePaise: 8000000,
        currency: 'INR',
        theme: 'Warm Candlelight & Classical Ghazals',
        preferredStyle: 'Intimate Heritage Evening',
        dietaryRequirements: ['North Indian Vegetarian', 'Jain Counter'],
        accessibilityRequirements: ['Step-free Lawn Entry'],
        culturalPreferences: 'Family toast and acoustic sitar recital.',
        specialInstructions: 'Outdoor patio heaters required for late November Delhi evening.',
        planningStatus: 'planning',
        approvedAiPlanId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    memberships: [
      {
        _id: newObjectId(),
        eventId: weddingEventId,
        userId: priyaId,
        invitedBy: priyaId,
        role: 'owner',
        permissions: ['read', 'tasks:write', 'guests:write', 'budget:write', 'vendors:write'],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ],
    budgetCategories: [
      {
        _id: catVenueId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Heritage Venue & Courtyard Buyout',
        plannedAmountPaise: 145000000, // ₹14,50,000
        isAiEstimated: false,
        notes: 'Includes 48-room heritage block + main courtyard & lake terrace.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: catCateringId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Royal Rajasthani & Jain Catering',
        plannedAmountPaise: 98000000, // ₹9,80,000
        isAiEstimated: false,
        notes: '5 meals across 2.5 days including dedicated Jain & Vegan counters.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: catDecorId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Pichwai Florals, Mandap & Sustainable Decor',
        plannedAmountPaise: 62000000, // ₹6,20,000
        isAiEstimated: false,
        notes: 'Local marigold artisans, hand-painted Pichwai backdrops, brass diyas.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: catPhotoId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Documentary Photography & Cinema',
        plannedAmountPaise: 38000000, // ₹3,80,000
        isAiEstimated: false,
        notes: '4-person crew covering Haldi, Sangeet, and Pheras.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: catMusicId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Folk Manganiyar Ensemble & Sangeet Sound',
        plannedAmountPaise: 24000000, // ₹2,40,000
        isAiEstimated: true,
        notes: 'Live Manganiyar musicians for welcome + Sangeet acoustic lineup.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: catLogisticsId,
        eventId: weddingEventId,
        ownerId: priyaId,
        name: 'Guest Airport Transfers & Senior Shuttles',
        plannedAmountPaise: 18000000, // ₹1,80,000
        isAiEstimated: true,
        notes: 'Maharana Pratap Airport pickup vans + venue golf carts.',
        createdAt: now,
        updatedAt: now,
      },
      // Corporate event categories
      {
        _id: corpCatVenueId,
        eventId: corporateEventId,
        ownerId: priyaId,
        name: 'Convention Hall & VIP Lounge',
        plannedAmountPaise: 85000000, // ₹8,50,000
        isAiEstimated: false,
        notes: 'Full day hall rental + 2 breakout rooms.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: corpCatAvId,
        eventId: corporateEventId,
        ownerId: priyaId,
        name: 'LED Wall, Broadcast Audio & Live Captioning',
        plannedAmountPaise: 42000000, // ₹4,20,000
        isAiEstimated: false,
        notes: 'P2.5 LED wall + dual redundant livestream encoders.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: corpCatCateringId,
        eventId: corporateEventId,
        ownerId: priyaId,
        name: 'Specialty Coffee & Executive Lunch',
        plannedAmountPaise: 43000000, // ₹4,30,000
        isAiEstimated: true,
        notes: '240 pax lunch + 3 high-tea breaks.',
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [
      {
        _id: '671400000000000000000301',
        eventId: weddingEventId,
        ownerId: priyaId,
        categoryId: catVenueId,
        categoryName: 'Heritage Venue & Courtyard Buyout',
        title: 'Fateh Garh Palace Venue Booking & 48 Rooms',
        vendorName: 'Fateh Garh Heritage Hospitality Pvt Ltd',
        amountPaise: 142000000, // ₹14,20,000
        advancePaidPaise: 71000000, // ₹7,10,000 paid
        paymentStatus: 'advance_paid',
        priceType: 'confirmed_invoice',
        expenseDate: '2026-09-15T10:00:00.000Z',
        notes: '50% advance paid via RTGS; balance due 15 days before check-in.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000302',
        eventId: weddingEventId,
        ownerId: priyaId,
        categoryId: catCateringId,
        categoryName: 'Royal Rajasthani & Jain Catering',
        title: 'Mewar Royal Thali & Live Jain Kitchen Contract',
        vendorName: 'Sangam Gourmet Caterers Udaipur',
        amountPaise: 94000000, // ₹9,40,000
        advancePaidPaise: 30000000, // ₹3,00,000
        paymentStatus: 'advance_paid',
        priceType: 'vendor_quotation',
        expenseDate: '2026-09-28T14:20:00.000Z',
        notes: 'Includes separate Jain preparation kitchen and brass servingware.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000303',
        eventId: weddingEventId,
        ownerId: priyaId,
        categoryId: catDecorId,
        categoryName: 'Pichwai Florals, Mandap & Sustainable Decor',
        title: 'Hand-Painted Nathdwara Pichwai Mandap & Marigold Drapes',
        vendorName: 'Aravalli Artisan Decor Studio',
        amountPaise: 59500000, // ₹5,95,000
        advancePaidPaise: 25000000, // ₹2,50,000
        paymentStatus: 'advance_paid',
        priceType: 'vendor_quotation',
        expenseDate: '2026-10-04T11:30:00.000Z',
        notes: '100% biodegradable floral installation with post-event composting.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000304',
        eventId: weddingEventId,
        ownerId: priyaId,
        categoryId: catPhotoId,
        categoryName: 'Documentary Photography & Cinema',
        title: 'Full Wedding Editorial Stills & 4K Film Package',
        vendorName: 'Kahani Fine Art Wedding Collective',
        amountPaise: 36000000, // ₹3,60,000
        advancePaidPaise: 36000000, // ₹3,60,000
        paymentStatus: 'paid',
        priceType: 'confirmed_invoice',
        expenseDate: '2026-10-10T16:00:00.000Z',
        notes: 'Full settlement completed with early booking discount of ₹20,000.',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000305',
        eventId: weddingEventId,
        ownerId: priyaId,
        categoryId: catMusicId,
        categoryName: 'Folk Manganiyar Ensemble & Sangeet Sound',
        title: 'Barmer Manganiyar Troupe + Line Array Sound Rig',
        vendorName: 'Desert Raga Folk Collective',
        amountPaise: 22500000, // ₹2,25,000
        advancePaidPaise: 5000000, // ₹50,000
        paymentStatus: 'advance_paid',
        priceType: 'ai_estimate',
        expenseDate: '2026-10-14T12:00:00.000Z',
        notes: 'Initial token paid; awaiting final stage plot confirmation.',
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [
      {
        _id: '671400000000000000000401',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Finalize Jain & Vegan Tasting Menu with Head Maharaj',
        description: 'Confirm zero root-vegetable cross-contamination protocol and approve live Bajra Khichdi & Dal Baati counters.',
        category: 'catering',
        priority: 'critical',
        status: 'completed',
        dueDate: '2026-10-25T12:00:00.000Z',
        isEventDayRunSheet: false,
        runSheetTime: '',
        assignedToName: 'Priya Sharma',
        dependsOnTaskIds: [],
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000402',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Approve Nathdwara Pichwai Mandap Fabric Swatches & Ramp Slope',
        description: 'Verify wheelchair ramp gradient at main courtyard steps and sign off on terracotta pot lighting.',
        category: 'decor',
        priority: 'high',
        status: 'in_progress',
        dueDate: '2026-11-05T15:00:00.000Z',
        isEventDayRunSheet: false,
        runSheetTime: '',
        assignedToName: 'Aarav Mehta',
        dependsOnTaskIds: [],
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000403',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Assign 48 Heritage Room Keys & Elders Ground-Floor Allocation',
        description: 'Allocate ground-floor elevator-adjacent suites to grandparents and senior guests.',
        category: 'guests',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-11-18T18:00:00.000Z',
        isEventDayRunSheet: false,
        runSheetTime: '',
        assignedToName: 'Priya Sharma',
        dependsOnTaskIds: [],
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000404',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Submit Sound Permission & 10:00 PM Outdoor Acoustic Cut-Off Notice',
        description: 'Ensure outdoor Sangeet shifts indoors to Durbar Hall by 10:00 PM per municipal rules.',
        category: 'documentation',
        priority: 'medium',
        status: 'todo',
        dueDate: '2026-11-25T12:00:00.000Z',
        isEventDayRunSheet: false,
        runSheetTime: '',
        assignedToName: 'Event Coordinator',
        dependsOnTaskIds: [],
        reminderEnabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000405',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Run Sheet: Manganiyar Folk Welcome & Kesariya Thandai Reception',
        description: 'Welcome arriving guests at Suraj Pol courtyard gate with rose-petal shower and kulhad thandai.',
        category: 'run_sheet',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-12-12T10:30:00.000Z',
        isEventDayRunSheet: true,
        runSheetTime: 'Day 1 · 10:30 AM',
        assignedToName: 'Hospitality Desk',
        dependsOnTaskIds: [],
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000406',
        eventId: weddingEventId,
        ownerId: priyaId,
        title: 'Run Sheet: Sunset Lake TerraceVarmala & Vedic Pheras',
        description: 'Bride and groom entry under phoolon ki chaadar; sunset pheras with live flute accompaniment.',
        category: 'run_sheet',
        priority: 'critical',
        status: 'todo',
        dueDate: '2026-12-13T17:15:00.000Z',
        isEventDayRunSheet: true,
        runSheetTime: 'Day 2 · 05:15 PM',
        assignedToName: 'Ritual & Mandap Team',
        dependsOnTaskIds: [],
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    eventVendors: [
      {
        _id: '671400000000000000000501',
        eventId: weddingEventId,
        ownerId: priyaId,
        vendorName: 'Fateh Garh Heritage Hospitality Pvt Ltd',
        serviceCategory: 'venue',
        contactPerson: 'Maharaj Devendra Singh',
        phone: '+91 294 243 1100',
        email: 'events@fatehgarh-heritage.example.in',
        city: 'Udaipur',
        quotedAmountPaise: 142000000,
        advancePaidPaise: 71000000,
        isVerifiedQuotation: true,
        status: 'booked',
        followUpDate: '2026-11-25T10:00:00.000Z',
        deliverablesNotes: '48 Heritage Suites + Courtyard + Sunset Terrace + Generator Backup included.',
        documentReference: 'QTN-FG-2026-089.pdf',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000502',
        eventId: weddingEventId,
        ownerId: priyaId,
        vendorName: 'Sangam Gourmet Caterers Udaipur',
        serviceCategory: 'catering',
        contactPerson: 'Rameshwar Joshi',
        phone: '+91 98290 55112',
        email: 'joshi@sangamcaterers.example.in',
        city: 'Udaipur',
        quotedAmountPaise: 94000000,
        advancePaidPaise: 30000000,
        isVerifiedQuotation: true,
        status: 'booked',
        followUpDate: '2026-11-20T14:00:00.000Z',
        deliverablesNotes: '320 guests × 5 meals. Separate Jain Maharaj brigade and brass thali service.',
        documentReference: 'QTN-SGC-2026-412.pdf',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000503',
        eventId: weddingEventId,
        ownerId: priyaId,
        vendorName: 'Aravalli Artisan Decor Studio',
        serviceCategory: 'decor_florals',
        contactPerson: 'Meera Rathore',
        phone: '+91 98281 33490',
        email: 'meera@aravallidecor.example.in',
        city: 'Jaipur / Udaipur',
        quotedAmountPaise: 59500000,
        advancePaidPaise: 25000000,
        isVerifiedQuotation: true,
        status: 'booked',
        followUpDate: '2026-11-15T11:00:00.000Z',
        deliverablesNotes: 'Nathdwara Pichwai hand-painted panels, 800kg local marigold & mogra, zero foam floral cages.',
        documentReference: 'QTN-AAD-2026-190.pdf',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000504',
        eventId: weddingEventId,
        ownerId: priyaId,
        vendorName: 'Mewar Royal Vintage Fleet & Transfers',
        serviceCategory: 'logistics_transport',
        contactPerson: 'Harish Choudhary',
        phone: '+91 94141 66789',
        email: 'dispatch@mewarfleet.example.in',
        city: 'Udaipur',
        quotedAmountPaise: 17500000,
        advancePaidPaise: 0,
        isVerifiedQuotation: false,
        status: 'shortlisted',
        followUpDate: '2026-11-10T10:00:00.000Z',
        deliverablesNotes: '12 Innova Hycross SUVs + 4 Force Urbania vans for airport shuttle loop.',
        documentReference: 'EST-MRF-2026-044.pdf',
        createdAt: now,
        updatedAt: now,
      },
    ],
    guests: [
      {
        _id: '671400000000000000000601',
        eventId: weddingEventId,
        ownerId: priyaId,
        fullName: 'Justice (Retd.) Narayan & Smt. Savitri Sharma',
        email: 'narayan.sharma@family.example.in',
        phone: '+91 98200 11001',
        groupName: 'family_bride',
        tags: ['Elders', 'Ground Floor Suite', 'Airport Pickup'],
        rsvpStatus: 'confirmed',
        invitationStatus: 'viewed',
        headcount: 2,
        dietaryPreference: 'jain_no_onion_garlic',
        tableOrSeatingNote: 'Courtyard Table 1 — Front Lounge Sofa near Mandap Ramp',
        requiresAccessibilitySupport: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000602',
        eventId: weddingEventId,
        ownerId: priyaId,
        fullName: 'Rajeshwar & Kavita Mehta Family',
        email: 'rajeshwar.mehta@family.example.in',
        phone: '+91 98111 22004',
        groupName: 'family_groom',
        tags: ['Groom Parents', 'Royal Suite 101'],
        rsvpStatus: 'confirmed',
        invitationStatus: 'viewed',
        headcount: 4,
        dietaryPreference: 'standard_veg',
        tableOrSeatingNote: 'Courtyard Table 1 — Host Family Enclosure',
        requiresAccessibilitySupport: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000603',
        eventId: weddingEventId,
        ownerId: priyaId,
        fullName: 'Ananya Deshmukh & Siddharth Kulkarni',
        email: 'ananya.d@friends.example.in',
        phone: '+91 97690 88123',
        groupName: 'friends',
        tags: ['Sangeet Dance Performance', 'Bridesmaid'],
        rsvpStatus: 'confirmed',
        invitationStatus: 'viewed',
        headcount: 2,
        dietaryPreference: 'vegan',
        tableOrSeatingNote: 'Lake Terrace Table 6',
        requiresAccessibilitySupport: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000604',
        eventId: weddingEventId,
        ownerId: priyaId,
        fullName: 'Dr. Arvind & Mrs. Sunita Singhania',
        email: 'dr.singhania@vip.example.in',
        phone: '+91 98210 99400',
        groupName: 'vip_dignitaries',
        tags: ['VIP', 'Chauffeur Pickup'],
        rsvpStatus: 'tentative',
        invitationStatus: 'sent',
        headcount: 2,
        dietaryPreference: 'jain_no_onion_garlic',
        tableOrSeatingNote: 'Courtyard Table 2 — VIP Enclosure',
        requiresAccessibilitySupport: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: '671400000000000000000605',
        eventId: weddingEventId,
        ownerId: priyaId,
        fullName: 'Nikhil & Pooja Agarwal',
        email: 'nikhil.agarwal@colleagues.example.in',
        phone: '+91 99100 54321',
        groupName: 'colleagues',
        tags: ['Mumbai Flight Group'],
        rsvpStatus: 'pending',
        invitationStatus: 'sent',
        headcount: 3,
        dietaryPreference: 'standard_veg',
        tableOrSeatingNote: 'Lake Terrace Table 9',
        requiresAccessibilitySupport: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    aiGenerations: [
      {
        _id: '671400000000000000000901',
        eventId: weddingEventId,
        ownerId: priyaId,
        modelName: 'gemini-3.8-flash',
        generationType: 'full_plan',
        status: 'applied',
        promptSummary: 'Generate structured 3-day Udaipur heritage courtyard wedding blueprint for 320 guests with ₹42L budget, Jain/Vegan counters, and zero-plastic sustainability.',
        structuredPlan: {
          overview:
            'A 3-day sustainable Royal Mewar Courtyard Wedding in Udaipur for 320 guests, blending authentic Nathdwara Pichwai artistry, dedicated Jain & Vegan culinary stations, and senior-friendly accessibility within a ₹42,00,000 total budget (preserving ₹3,50,000 as an untouched emergency reserve).',
          themeAndDecor: [
            {
              area: 'Main Courtyard Welcome & Haldi Carnival',
              concept: 'Saffron Marigold & Brass Urlis with Woven Khus Canopies',
              sustainabilityNote: '100% locally grown Udaipur marigolds composted post-event; reusable handloom dhurries.',
              estimatedCostInr: 185000,
            },
            {
              area: 'Sunset Lake Terrace Mandap',
              concept: 'Hand-Painted Ivory Pichwai Backdrop with Open-Pillar Mogra Garlands & Step-Free Wheelchair Ramp',
              sustainabilityNote: 'Rental heritage brass lamps fuelled by sesame oil; zero floral foam.',
              estimatedCostInr: 410000,
            },
          ],
          budgetAllocation: [
            { category: 'Heritage Venue & Courtyard Buyout', percentage: 35, amountInr: 1450000, rationale: 'Covers 48 rooms for 2 nights plus courtyard and terrace exclusivity.' },
            { category: 'Royal Rajasthani & Jain Catering', percentage: 23, amountInr: 980000, rationale: '5 curated vegetarian meals with independent Jain & Vegan stations.' },
            { category: 'Pichwai Florals, Mandap & Sustainable Decor', percentage: 15, amountInr: 620000, rationale: 'Artisan Pichwai textiles, fresh florals, and accessibility ramp styling.' },
            { category: 'Documentary Photography & Cinema', percentage: 9, amountInr: 380000, rationale: 'Multi-camera stills and 4K film crew across all rituals.' },
            { category: 'Folk Manganiyar Ensemble & Sangeet Sound', percentage: 6, amountInr: 240000, rationale: 'Acoustic folk artists + compliant PA system.' },
            { category: 'Guest Airport Transfers & Senior Shuttles', percentage: 4, amountInr: 180000, rationale: 'Airport SUVs and continuous internal golf carts.' },
            { category: 'Emergency Reserve', percentage: 8, amountInr: 350000, rationale: 'Protected buffer for weather tents or last-minute guest additions.' },
          ],
          preparationTimeline: [
            { timeframe: '60 Days Prior', milestone: 'Lock Heritage Venue Block, Catering Maharaj & Photography Crew', priority: 'critical' },
            { timeframe: '30 Days Prior', milestone: 'Finalize Nathdwara Pichwai Art Panels, Jain Menu & Guest Flight Manifest', priority: 'high' },
            { timeframe: '14 Days Prior', milestone: 'Confirm Wheelchair Ramp Specs, Sound Permits & Room Allocation Matrix', priority: 'high' },
            { timeframe: '2 Days Prior', milestone: 'On-Site Hospitality Desk Setup, Kulhad & Brassware Hygiene Audit', priority: 'critical' },
          ],
          vendorRequirements: [
            { category: 'Heritage Venue', specification: 'Minimum 45 rooms + step-free courtyard access + 125kVA silent DG backup', estimatedBudgetInr: 1450000 },
            { category: 'Gourmet Vegetarian & Jain Caterer', specification: 'Separate Jain kitchen brigade, terracotta kulhads, live millet & chaat stations', estimatedBudgetInr: 980000 },
            { category: 'Artisan Florist & Decor', specification: 'Foam-free floral rigging, Pichwai fabric rentals, warm LED pin-spots', estimatedBudgetInr: 620000 },
          ],
          taskChecklist: [
            { title: 'Conduct Jain & Vegan menu tasting with catering head', category: 'catering', priority: 'critical', daysBeforeEvent: 40 },
            { title: 'Inspect wheelchair ramp slope at Lake Terrace Mandap', category: 'logistics', priority: 'high', daysBeforeEvent: 20 },
            { title: 'Assign ground-floor suites to senior family members', category: 'guests', priority: 'high', daysBeforeEvent: 15 },
          ],
          menuAndEntertainment: {
            menuHighlights: [
              'Welcome: Kesariya Badam Thandai in baked terracotta kulhads & Moong Dal Kachori',
              'Sangeet Dinner: Live Mewari Millet Khichda, Paneer Lababdar, Vegan Jackfruit Galouti',
              'Wedding Feast: Separate Jain Panchmel Dal Baati Churma counter, Guava Chilli Sorbet, Hot Malpua Rabri',
            ],
            entertainmentIdeas: [
              'Day 1 Arrival: Live Barmer Manganiyar kamaicha and dholak folk welcome',
              'Day 1 Evening: Acoustic Sufi & Bollywood unplugged Sangeet under fairy-lit courtyard',
              'Day 2 Pheras: Live classical bansuri and santoor recital synchronized with Vedic chants explainers',
            ],
          },
          shoppingList: [
            { item: '450 Handcrafted Terracotta Kulhads & Brass Return Gift Boxes', quantity: '450 units', estimatedCostInr: 68000 },
            { item: 'Organic Rose Petal Cones & Sandalwood Tilak Trays', quantity: '350 sets', estimatedCostInr: 24000 },
            { item: 'Pashmina Shawls for Senior Guests (December Evening Warmth)', quantity: '60 shawls', estimatedCostInr: 90000 },
          ],
          eventDaySchedule: [
            { timeSlot: 'Day 1 · 10:30 AM', activity: 'Manganiyar Folk Welcome & Check-in with Kesariya Thandai', owner: 'Hospitality Team' },
            { timeSlot: 'Day 1 · 01:30 PM', activity: 'Courtyard Marigold Haldi Carnival & Rajasthani Folk Lunch', owner: 'Ritual Coordinator' },
            { timeSlot: 'Day 1 · 07:30 PM', activity: 'Starlight Sangeet & Acoustic Qawwali (Indoor transition at 10 PM)', owner: 'Stage Manager' },
            { timeSlot: 'Day 2 · 04:00 PM', activity: 'Vintage Car Baraat Procession & Safa Tying Ceremony', owner: 'Groom Squad' },
            { timeSlot: 'Day 2 · 05:15 PM', activity: 'Sunset Lake Terrace Varmala & Bilingual Vedic Pheras', owner: 'Mandap Coordinator' },
          ],
          riskAndContingency: [
            {
              risk: 'Unseasonal December Evening Chill or Light Drizzle on Lake Terrace',
              mitigation: 'Pre-rigged transparent waterproof sailcloth canopy + 18 mushroom patio heaters on standby.',
            },
            {
              risk: 'Outdoor Sound Curfew Strictness after 10:00 PM',
              mitigation: 'Pre-configured indoor Durbar Hall console for seamless after-party shift at 9:50 PM.',
            },
          ],
          budgetSavingAlternatives: [
            {
              originalItem: 'Imported Dutch Hydrangeas & Orchids for Mandap',
              alternative: 'Locally sourced Udaipur Genda (Marigold), Rajnigandha & Handloom Pichwai Tapestries',
              estimatedSavingsInr: 145000,
            },
            {
              originalItem: 'Printed Acrylic Box Invitations with Courier Shipping',
              alternative: 'Interactive Bilingual Digital Microsite + 40 Heirloom Brass Invites for Elders Only',
              estimatedSavingsInr: 85000,
            },
          ],
          followUpQuestions: [
            'Would you like to allocate 2 dedicated golf-cart attendants exclusively for the 14 senior guests across all three venues?',
            'Should the Sangeet dinner include a late-night coffee and jalebi counter inside the Durbar Hall after 10:30 PM?',
          ],
        },
        estimatedInputTokens: 640,
        estimatedOutputTokens: 1420,
        latencyMs: 1840,
        errorMessage: '',
        appliedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    notifications: [
      {
        _id: newObjectId(),
        userId: priyaId,
        eventId: weddingEventId,
        title: 'AI Blueprint Approved & Synced',
        message: 'Your Royal Mewar Courtyard Wedding AI plan has been linked to your budget categories and checklist.',
        severity: 'info',
        read: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    auditLogs: [
      {
        _id: newObjectId(),
        actorUserId: priyaId,
        actorRole: 'customer',
        action: 'EVENT_CREATED',
        targetType: 'Event',
        targetId: weddingEventId,
        ipAddress: '127.0.0.1',
        requestId: 'seed-init-001',
        metadata: { title: 'Aarav & Priya — Royal Mewar Courtyard Wedding' },
        createdAt: now,
      },
      {
        _id: newObjectId(),
        actorUserId: priyaId,
        actorRole: 'customer',
        action: 'AI_PLAN_APPLIED',
        targetType: 'AiPlanGeneration',
        targetId: '671400000000000000000901',
        ipAddress: '127.0.0.1',
        requestId: 'seed-init-002',
        metadata: { modelName: 'gemini-3.8-flash' },
        createdAt: now,
      },
    ],
    abuseReports: [
      {
        _id: '671400000000000000000801',
        reporterUserId: priyaId,
        reporterEmail: 'priya.sharma@aarambh-events.in',
        targetType: 'vendor',
        targetId: '671400000000000000000504',
        reason: 'Quotation attachment had mismatched GST number; requested vendor verification before advance payment.',
        status: 'open',
        resolutionNotes: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    platformConfig: {
      _id: 'platform-config-singleton',
      aiDailyQuotaPerUser: 25,
      maintenanceMode: false,
      allowNewRegistrations: true,
      enableCollaboratorModule: true,
      enableVendorModule: false,
      supportedEventCategories: [
        { slug: 'wedding', label: 'Weddings & Sangeet', defaultCurrency: 'INR', active: true },
        { slug: 'corporate', label: 'Corporate Summits & Offsites', defaultCurrency: 'INR', active: true },
        { slug: 'birthday', label: 'Milestone Birthdays', defaultCurrency: 'INR', active: true },
        { slug: 'anniversary', label: 'Anniversary & Jubilee Galas', defaultCurrency: 'INR', active: true },
        { slug: 'cultural', label: 'Cultural & Festive Programs', defaultCurrency: 'INR', active: true },
        { slug: 'community', label: 'Community & Charity Gatherings', defaultCurrency: 'INR', active: true },
      ],
      updatedAt: now,
    },
  };
}

class DurableStore {
  private data: DatabaseCollections;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseCollections {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseCollections;
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seed initialization if file is corrupted
    }
    const seeded = createInitialSeedData();
    this.persistToDisk(seeded);
    return seeded;
  }

  private persistToDisk(collections: DatabaseCollections = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(collections, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch {
      // In read-only environments, keep in-memory state consistent
    }
  }

  public get collections(): DatabaseCollections {
    return this.data;
  }

  public save(): void {
    this.persistToDisk(this.data);
  }

  /**
   * Executes a multi-collection mutation atomically.
   * Rolls back in-memory state if an error is thrown inside the transaction callback.
   */
  public transaction<T>(fn: (collections: DatabaseCollections) => T): T {
    const snapshot = JSON.parse(JSON.stringify(this.data)) as DatabaseCollections;
    try {
      const result = fn(this.data);
      this.persistToDisk(this.data);
      return result;
    } catch (error) {
      this.data = snapshot;
      throw error;
    }
  }

  public logAudit(entry: Omit<AuditLogDoc, '_id' | 'createdAt'>): AuditLogDoc {
    const doc: AuditLogDoc = {
      _id: newObjectId(),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(doc);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.length = 1000;
    }
    this.save();
    return doc;
  }
}

export const dbStore = new DurableStore();
