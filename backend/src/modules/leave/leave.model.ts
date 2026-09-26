import { Schema, model, Document, Types } from 'mongoose';

export type LeaveType = 'Annual' | 'Casual' | 'Medical' | 'Maternity' | 'No-Pay';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ILeavePolicy extends Document {
  tenantId: string;
  leaveType: LeaveType;
  annualAllocation: number;
  accrualFrequency: 'Annual' | 'Monthly' | 'Quarterly';
  carryForwardLimit: number;
  isPaid: boolean;
  requiresMedicalCertificateAfterDays: number;
}

const LeavePolicySchema = new Schema<ILeavePolicy>(
  {
    tenantId: { type: String, required: true, index: true },
    leaveType: {
      type: String,
      enum: ['Annual', 'Casual', 'Medical', 'Maternity', 'No-Pay'],
      required: true,
    },
    annualAllocation: { type: Number, required: true },
    accrualFrequency: { type: String, enum: ['Annual', 'Monthly', 'Quarterly'], default: 'Monthly' },
    carryForwardLimit: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: true },
    requiresMedicalCertificateAfterDays: { type: Number, default: 2 },
  },
  { timestamps: true }
);

LeavePolicySchema.index({ tenantId: 1, leaveType: 1 }, { unique: true });

export const LeavePolicyModel = model<ILeavePolicy>('LeavePolicy', LeavePolicySchema);

export interface ILeaveBalance extends Document {
  tenantId: string;
  employeeId: Types.ObjectId;
  year: number;
  leaveType: LeaveType;
  allocated: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    year: { type: Number, required: true },
    leaveType: {
      type: String,
      enum: ['Annual', 'Casual', 'Medical', 'Maternity', 'No-Pay'],
      required: true,
    },
    allocated: { type: Number, default: 0 },
    accrued: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ tenantId: 1, employeeId: 1, year: 1, leaveType: 1 }, { unique: true });

export const LeaveBalanceModel = model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);

export interface ILeaveRequest extends Document {
  tenantId: string;
  employeeId: Types.ObjectId;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: Types.ObjectId;
  reviewerComments?: string;
  medicalCertUrl?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: {
      type: String,
      enum: ['Annual', 'Casual', 'Medical', 'Maternity', 'No-Pay'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerComments: { type: String },
    medicalCertUrl: { type: String },
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });

export const LeaveRequestModel = model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
