import mongoose, { Schema, Model } from 'mongoose';

// 1. User Schema
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['customer', 'admin', 'vendor', 'collaborator'],
      default: 'customer',
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false, default: null },
    verificationExpiresAt: { type: Date, default: null },
    resetTokenHash: { type: String, select: false, default: null },
    resetExpiresAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active', index: true },
    phone: { type: String, default: '' },
    city: { type: String, default: 'Mumbai' },
    preferredCurrency: { type: String, default: 'INR' },
    privacySettings: {
      shareAnalytics: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      marketingOptIn: { type: Boolean, default: false },
    },
    aiDailyCount: { type: Number, default: 0 },
    aiLastResetDate: { type: String, default: '' },
  },
  { timestamps: true }
);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, status: 1 });

// 2. Event Schema
const EventSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    eventType: {
      type: String,
      enum: ['wedding', 'birthday', 'anniversary', 'corporate', 'cultural', 'community'],
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    venueName: { type: String, trim: true, default: '', maxlength: 140 },
    venueAddress: { type: String, trim: true, default: '', maxlength: 260 },
    indoorOutdoor: { type: String, enum: ['indoor', 'outdoor', 'hybrid'], default: 'hybrid' },
    estimatedGuests: { type: Number, required: true, min: 1, max: 50000 },
    totalBudgetPaise: { type: Number, required: true, min: 0 },
    emergencyReservePaise: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
    theme: { type: String, trim: true, default: '', maxlength: 120 },
    preferredStyle: { type: String, trim: true, default: 'Contemporary Royal', maxlength: 120 },
    dietaryRequirements: [{ type: String, trim: true }],
    accessibilityRequirements: [{ type: String, trim: true }],
    culturalPreferences: { type: String, trim: true, default: '', maxlength: 500 },
    specialInstructions: { type: String, trim: true, default: '', maxlength: 1200 },
    planningStatus: {
      type: String,
      enum: ['draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'planning',
      index: true,
    },
    approvedAiPlanId: { type: String, default: null },
  },
  { timestamps: true }
);
EventSchema.index({ ownerId: 1, startDate: 1 });
EventSchema.index({ ownerId: 1, planningStatus: 1 });

// 3. EventMembership Schema (Collaborator RBAC)
const EventMembershipSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
    permissions: [{ type: String, enum: ['read', 'tasks:write', 'guests:write', 'budget:write', 'vendors:write'] }],
    status: { type: String, enum: ['pending', 'active', 'revoked'], default: 'active' },
  },
  { timestamps: true }
);
EventMembershipSchema.index({ eventId: 1, userId: 1 }, { unique: true });

// 4. BudgetCategory Schema
const BudgetCategorySchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    plannedAmountPaise: { type: Number, required: true, min: 0 },
    isAiEstimated: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '', maxlength: 400 },
  },
  { timestamps: true }
);
BudgetCategorySchema.index({ eventId: 1, name: 1 }, { unique: true });

// 5. Expense Schema
const ExpenseSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    categoryName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    vendorName: { type: String, trim: true, default: '' },
    amountPaise: { type: Number, required: true, min: 0 },
    advancePaidPaise: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ['planned', 'advance_paid', 'paid', 'refunded'], default: 'planned' },
    priceType: { type: String, enum: ['ai_estimate', 'vendor_quotation', 'confirmed_invoice'], default: 'vendor_quotation' },
    expenseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '', maxlength: 400 },
  },
  { timestamps: true }
);
ExpenseSchema.index({ eventId: 1, categoryId: 1 });
ExpenseSchema.index({ eventId: 1, expenseDate: -1 });

// 6. Task Schema
const TaskSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: '', maxlength: 600 },
    category: {
      type: String,
      enum: ['venue', 'catering', 'decor', 'rituals', 'logistics', 'guests', 'entertainment', 'attire', 'documentation', 'run_sheet'],
      default: 'logistics',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    status: { type: String, enum: ['todo', 'in_progress', 'blocked', 'completed'], default: 'todo', index: true },
    dueDate: { type: Date, required: true, index: true },
    isEventDayRunSheet: { type: Boolean, default: false },
    runSheetTime: { type: String, default: '' },
    assignedToName: { type: String, default: 'Event Owner' },
    dependsOnTaskIds: [{ type: String }],
    reminderEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);
TaskSchema.index({ eventId: 1, status: 1, dueDate: 1 });

// 7. Vendor Schema (User-maintained or verified platform vendor record)
const VendorSchema = new Schema(
  {
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessName: { type: String, required: true, trim: true, maxlength: 140 },
    serviceCategory: {
      type: String,
      enum: ['venue', 'catering', 'decor_florals', 'photography_cinema', 'music_entertainment', 'makeup_mehendi', 'logistics_transport', 'invitations_gifting', 'lighting_sound'],
      required: true,
      index: true,
    },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    city: { type: String, trim: true, default: '' },
    isVerifiedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);
VendorSchema.index({ createdByUserId: 1, serviceCategory: 1 });

// 8. EventVendor / Quotation Schema
const EventVendorSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorName: { type: String, required: true, trim: true, maxlength: 140 },
    serviceCategory: {
      type: String,
      enum: ['venue', 'catering', 'decor_florals', 'photography_cinema', 'music_entertainment', 'makeup_mehendi', 'logistics_transport', 'invitations_gifting', 'lighting_sound'],
      required: true,
    },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    city: { type: String, trim: true, default: '' },
    quotedAmountPaise: { type: Number, required: true, min: 0 },
    advancePaidPaise: { type: Number, default: 0, min: 0 },
    isVerifiedQuotation: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['shortlisted', 'contacted', 'booked', 'completed', 'cancelled'],
      default: 'shortlisted',
      index: true,
    },
    followUpDate: { type: Date, default: null },
    deliverablesNotes: { type: String, trim: true, default: '', maxlength: 800 },
    documentReference: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);
EventVendorSchema.index({ eventId: 1, status: 1 });

// 9. Guest Schema
const GuestSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    groupName: {
      type: String,
      enum: ['family_bride', 'family_groom', 'friends', 'vip_dignitaries', 'colleagues', 'community', 'general'],
      default: 'general',
    },
    tags: [{ type: String, trim: true }],
    rsvpStatus: { type: String, enum: ['pending', 'confirmed', 'declined', 'tentative'], default: 'pending', index: true },
    invitationStatus: { type: String, enum: ['not_sent', 'sent', 'viewed'], default: 'not_sent' },
    headcount: { type: Number, default: 1, min: 1, max: 20 },
    dietaryPreference: {
      type: String,
      enum: ['standard_veg', 'jain_no_onion_garlic', 'non_veg', 'vegan', 'gluten_free', 'halal', 'kids_meal'],
      default: 'standard_veg',
    },
    tableOrSeatingNote: { type: String, trim: true, default: '', maxlength: 160 },
    requiresAccessibilitySupport: { type: Boolean, default: false },
  },
  { timestamps: true }
);
GuestSchema.index({ eventId: 1, rsvpStatus: 1 });
GuestSchema.index({ eventId: 1, groupName: 1 });

// 10. AI Planning Generation Schema
const AiPlanGenerationSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    modelName: { type: String, required: true },
    generationType: { type: String, enum: ['full_plan', 'personalized_ideas', 'budget_optimization'], default: 'full_plan' },
    status: { type: String, enum: ['succeeded', 'failed', 'applied'], default: 'succeeded', index: true },
    promptSummary: { type: String, maxlength: 300 },
    structuredPlan: { type: Schema.Types.Mixed, default: null },
    estimatedInputTokens: { type: Number, default: 0 },
    estimatedOutputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    errorMessage: { type: String, default: '' },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
AiPlanGenerationSchema.index({ eventId: 1, createdAt: -1 });
AiPlanGenerationSchema.index({ ownerId: 1, createdAt: -1 });

// 11. Notification Schema
const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: String, default: null },
    title: { type: String, required: true, maxlength: 140 },
    message: { type: String, required: true, maxlength: 500 },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// 12. AuditLog Schema
const AuditLogSchema = new Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    requestId: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const UserModel: Model<any> = mongoose.models.User || mongoose.model('User', UserSchema);
export const EventModel: Model<any> = mongoose.models.Event || mongoose.model('Event', EventSchema);
export const EventMembershipModel: Model<any> =
  mongoose.models.EventMembership || mongoose.model('EventMembership', EventMembershipSchema);
export const BudgetCategoryModel: Model<any> =
  mongoose.models.BudgetCategory || mongoose.model('BudgetCategory', BudgetCategorySchema);
export const ExpenseModel: Model<any> = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export const TaskModel: Model<any> = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export const VendorModel: Model<any> = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
export const EventVendorModel: Model<any> =
  mongoose.models.EventVendor || mongoose.model('EventVendor', EventVendorSchema);
export const GuestModel: Model<any> = mongoose.models.Guest || mongoose.model('Guest', GuestSchema);
export const AiPlanGenerationModel: Model<any> =
  mongoose.models.AiPlanGeneration || mongoose.model('AiPlanGeneration', AiPlanGenerationSchema);
export const NotificationModel: Model<any> =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const AuditLogModel: Model<any> = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

/**
 * Safe, repeatable index initialization procedure.
 * Never drops collections or deletes user data.
 */
export async function ensureDatabaseIndexes(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all([
    UserModel.createIndexes(),
    EventModel.createIndexes(),
    EventMembershipModel.createIndexes(),
    BudgetCategoryModel.createIndexes(),
    ExpenseModel.createIndexes(),
    TaskModel.createIndexes(),
    VendorModel.createIndexes(),
    EventVendorModel.createIndexes(),
    GuestModel.createIndexes(),
    AiPlanGenerationModel.createIndexes(),
    NotificationModel.createIndexes(),
    AuditLogModel.createIndexes(),
  ]);
}
