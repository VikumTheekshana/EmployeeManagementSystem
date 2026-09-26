import { Schema, model, Document, Types } from 'mongoose';

// --- ASSET MANAGEMENT ---
export type AssetCategory = 'Laptop' | 'Monitor' | 'MobilePhone' | 'AccessCard' | 'Vehicle' | 'Peripheral';
export type AssetStatus = 'Available' | 'Allocated' | 'UnderRepair' | 'Decommissioned';

export interface IAsset extends Document {
  tenantId: string;
  assetTag: string; // e.g. "AST-LP-012"
  serialNumber: string;
  name: string;
  category: AssetCategory;
  assignedTo?: Types.ObjectId; // Employee ref
  status: AssetStatus;
  condition: 'BrandNew' | 'Good' | 'Fair' | 'Damaged';
  estimatedValueLKR: number;
  allocatedAt?: Date;
  returnedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    tenantId: { type: String, required: true, index: true },
    assetTag: { type: String, required: true, trim: true },
    serialNumber: { type: String, required: true, trim: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['Laptop', 'Monitor', 'MobilePhone', 'AccessCard', 'Vehicle', 'Peripheral'],
      required: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: {
      type: String,
      enum: ['Available', 'Allocated', 'UnderRepair', 'Decommissioned'],
      default: 'Available',
    },
    condition: {
      type: String,
      enum: ['BrandNew', 'Good', 'Fair', 'Damaged'],
      default: 'Good',
    },
    estimatedValueLKR: { type: Number, default: 0 },
    allocatedAt: { type: Date },
    returnedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

AssetSchema.index({ tenantId: 1, assetTag: 1 }, { unique: true });
AssetSchema.index({ tenantId: 1, assignedTo: 1 });

export const AssetModel = model<IAsset>('Asset', AssetSchema);

// --- ONBOARDING CHECKLIST ---
export interface IOnboardingTask {
  id: string;
  title: string;
  category: 'SelfService' | 'HR' | 'IT';
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IOnboardingChecklist extends Document {
  tenantId: string;
  employeeId: Types.ObjectId;
  tasks: IOnboardingTask[];
  overallProgress: number; // 0 - 100%
  completed: boolean;
}

const OnboardingChecklistSchema = new Schema<IOnboardingChecklist>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    tasks: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        category: { type: String, enum: ['SelfService', 'HR', 'IT'], required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    overallProgress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OnboardingChecklistSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

export const OnboardingChecklistModel = model<IOnboardingChecklist>('OnboardingChecklist', OnboardingChecklistSchema);

// --- OFFBOARDING & CLEARANCE GATES ---
export interface IOffboardingClearance extends Document {
  tenantId: string;
  employeeId: Types.ObjectId;
  resignationDate: Date;
  lastWorkingDate: Date;
  reason: string;
  status: 'Initiated' | 'IT_Pending' | 'Finance_Pending' | 'HR_Pending' | 'Completed';

  // IT Clearance Gate
  itGate: {
    cleared: boolean;
    clearedBy?: Types.ObjectId;
    clearedAt?: Date;
    assetsRecovered: boolean;
    accountsRevoked: boolean;
    notes?: string;
  };

  // Finance Clearance Gate
  financeGate: {
    cleared: boolean;
    clearedBy?: Types.ObjectId;
    clearedAt?: Date;
    outstandingLoansSettled: boolean;
    finalGratuityLKR: number;
    finalSalaryPayableLKR: number;
    notes?: string;
  };

  // HR Exit Gate
  hrGate: {
    cleared: boolean;
    clearedBy?: Types.ObjectId;
    clearedAt?: Date;
    exitInterviewCompleted: boolean;
    serviceCertificateIssued: boolean;
    notes?: string;
  };

  completedAt?: Date;
}

const OffboardingClearanceSchema = new Schema<IOffboardingClearance>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    resignationDate: { type: Date, required: true },
    lastWorkingDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['Initiated', 'IT_Pending', 'Finance_Pending', 'HR_Pending', 'Completed'],
      default: 'Initiated',
    },
    itGate: {
      cleared: { type: Boolean, default: false },
      clearedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      clearedAt: { type: Date },
      assetsRecovered: { type: Boolean, default: false },
      accountsRevoked: { type: Boolean, default: false },
      notes: { type: String },
    },
    financeGate: {
      cleared: { type: Boolean, default: false },
      clearedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      clearedAt: { type: Date },
      outstandingLoansSettled: { type: Boolean, default: false },
      finalGratuityLKR: { type: Number, default: 0 },
      finalSalaryPayableLKR: { type: Number, default: 0 },
      notes: { type: String },
    },
    hrGate: {
      cleared: { type: Boolean, default: false },
      clearedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      clearedAt: { type: Date },
      exitInterviewCompleted: { type: Boolean, default: false },
      serviceCertificateIssued: { type: Boolean, default: false },
      notes: { type: String },
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

OffboardingClearanceSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

export const OffboardingClearanceModel = model<IOffboardingClearance>('OffboardingClearance', OffboardingClearanceSchema);
