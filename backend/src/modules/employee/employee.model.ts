import { Schema, model, Document, Types } from 'mongoose';
import { fieldLevelEncryptionPlugin } from '../../core/security/encryption';

export interface IDocumentItem {
  id: string;
  documentType: 'National_ID' | 'Passport' | 'Degree_Certificate' | 'Contract_Agreement' | 'Police_Clearance' | 'Other';
  title: string;
  fileUrl: string;
  expiryDate?: Date;
  isVerified: boolean;
  uploadedAt: Date;
}

export interface IEmployee extends Document {
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: Date;
  dateOfJoining: Date;
  department: string;
  designation: string;
  reportsTo?: Types.ObjectId | IEmployee | null; // Manager reference for hierarchy tree
  employmentType: 'Permanent' | 'Probation' | 'Contract' | 'Intern';
  status: 'Active' | 'OnLeave' | 'Resigned' | 'Terminated';

  // Secure Field-Level Encrypted Fields (FLE via AES-256-GCM)
  nationalId: string; // NIC or Passport
  basicSalary: string; // Stored encrypted as string
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string; // Stored encrypted
  bankAccountHolder: string;

  // Statutory Compliance
  epfNumber?: string;
  tinNumber?: string;

  // Document Vault
  documents: IDocumentItem[];

  createdAt: Date;
  updatedAt: Date;
}

const DocumentItemSchema = new Schema<IDocumentItem>(
  {
    id: { type: String, required: true },
    documentType: {
      type: String,
      enum: ['National_ID', 'Passport', 'Degree_Certificate', 'Contract_Agreement', 'Police_Clearance', 'Other'],
      default: 'Other',
    },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    expiryDate: { type: Date },
    isVerified: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EmployeeSchema = new Schema<IEmployee>(
  {
    tenantId: { type: String, required: true, index: true, lowercase: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    dateOfBirth: { type: Date },
    dateOfJoining: { type: Date, default: Date.now },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    reportsTo: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    employmentType: {
      type: String,
      enum: ['Permanent', 'Probation', 'Contract', 'Intern'],
      default: 'Permanent',
    },
    status: {
      type: String,
      enum: ['Active', 'OnLeave', 'Resigned', 'Terminated'],
      default: 'Active',
    },

    // Sensitive Fields to be encrypted with AES-256-GCM
    nationalId: { type: String, required: true },
    basicSalary: { type: String, required: true },
    bankName: { type: String, default: 'Commercial Bank of Ceylon' },
    bankBranch: { type: String, default: 'Head Office - Colombo' },
    bankAccountNumber: { type: String, required: true },
    bankAccountHolder: { type: String, required: true },

    epfNumber: { type: String, trim: true },
    tinNumber: { type: String, trim: true },

    documents: [DocumentItemSchema],
  },
  {
    timestamps: true,
  }
);

// Compound indexes on tenantId for multi-tenancy isolation and performance
EmployeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ tenantId: 1, reportsTo: 1 });
EmployeeSchema.index({ tenantId: 1, department: 1 });
EmployeeSchema.index({ tenantId: 1, status: 1 });

// Apply AES-256-GCM Field-Level Encryption plugin to sensitive fields
EmployeeSchema.plugin(fieldLevelEncryptionPlugin, {
  fields: ['nationalId', 'basicSalary', 'bankAccountNumber'],
});

export const EmployeeModel = model<IEmployee>('Employee', EmployeeSchema);
