import { Schema, model, Document } from 'mongoose';

export interface IOrganization extends Document {
  tenantId: string;
  name: string;
  taxRegistrationNumber?: string;
  country: string;
  currency: string;
  statutorySettings: {
    epfEmployerRate: number; // 12%
    epfEmployeeRate: number; // 8%
    etfRate: number; // 3%
    apitTaxEnabled: boolean;
  };
  departments: string[];
  designations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    tenantId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    country: { type: String, default: 'Sri Lanka' },
    currency: { type: String, default: 'LKR' },
    statutorySettings: {
      epfEmployerRate: { type: Number, default: 0.12 },
      epfEmployeeRate: { type: Number, default: 0.08 },
      etfRate: { type: Number, default: 0.03 },
      apitTaxEnabled: { type: Boolean, default: true },
    },
    departments: {
      type: [String],
      default: ['Executive', 'Human Resources', 'Engineering', 'Finance', 'Operations', 'Sales & Marketing'],
    },
    designations: {
      type: [String],
      default: ['Chief Executive Officer', 'VP of Engineering', 'Senior HR Manager', 'Lead Architect', 'Software Engineer', 'Financial Controller', 'Accountant', 'Product Specialist'],
    },
  },
  {
    timestamps: true,
  }
);

OrganizationSchema.index({ tenantId: 1, name: 1 });

export const OrganizationModel = model<IOrganization>('Organization', OrganizationSchema);
