import { Schema, model, Document, Types } from 'mongoose';

export interface IPayrollItem {
  name: string;
  amount: number;
}

export interface IPayslip extends Document {
  tenantId: string;
  payrollRunId: Types.ObjectId;
  employeeId: Types.ObjectId;
  month: number;
  year: number;

  basicSalary: number;
  allowances: IPayrollItem[];
  grossEarnings: number;

  // Sri Lankan Statutory Deductions & Contributions
  epfQualifyingSalary: number;
  epfEmployee: number; // 8%
  epfEmployer: number; // 12%
  etfEmployer: number; // 3%
  apitTax: number; // Progressive APIT

  otherDeductions: IPayrollItem[];
  totalDeductions: number;

  netSalary: number;
  costToCompany: number;

  bankDetails: {
    bankName: string;
    branch: string;
    accountNumberMasked: string;
    accountHolder: string;
  };

  isPaid: boolean;
  createdAt: Date;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    tenantId: { type: String, required: true, index: true },
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true },
    allowances: [{ name: String, amount: Number }],
    grossEarnings: { type: Number, required: true },
    epfQualifyingSalary: { type: Number, required: true },
    epfEmployee: { type: Number, required: true },
    epfEmployer: { type: Number, required: true },
    etfEmployer: { type: Number, required: true },
    apitTax: { type: Number, required: true },
    otherDeductions: [{ name: String, amount: Number }],
    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    costToCompany: { type: Number, required: true },
    bankDetails: {
      bankName: { type: String, default: 'Commercial Bank of Ceylon' },
      branch: { type: String, default: 'Colombo' },
      accountNumberMasked: { type: String, default: '••••••••' },
      accountHolder: { type: String, default: '' },
    },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PayslipSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });
PayslipSchema.index({ tenantId: 1, payrollRunId: 1 });

export const PayslipModel = model<IPayslip>('Payslip', PayslipSchema);

export interface IPayrollRun extends Document {
  tenantId: string;
  month: number;
  year: number;
  status: 'Draft' | 'Processing' | 'Approved' | 'Disbursed';
  totalEmployees: number;
  totalGross: number;
  totalEPFEmployee: number;
  totalEPFEmployer: number;
  totalETF: number;
  totalAPIT: number;
  totalNetPay: number;
  processedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    tenantId: { type: String, required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Draft', 'Processing', 'Approved', 'Disbursed'],
      default: 'Draft',
    },
    totalEmployees: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalEPFEmployee: { type: Number, default: 0 },
    totalEPFEmployer: { type: Number, default: 0 },
    totalETF: { type: Number, default: 0 },
    totalAPIT: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PayrollRunSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

export const PayrollRunModel = model<IPayrollRun>('PayrollRun', PayrollRunSchema);
