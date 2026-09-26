import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'SuperAdmin' | 'HRAdmin' | 'Manager' | 'Employee';

export interface IUser extends Document {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  employeeProfileId?: Types.ObjectId;
  refreshToken?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: String, required: true, index: true, lowercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SuperAdmin', 'HRAdmin', 'Manager', 'Employee'],
      default: 'Employee',
      required: true,
    },
    employeeProfileId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    refreshToken: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound tenant index: email unique per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

export const UserModel = model<IUser>('User', UserSchema);
