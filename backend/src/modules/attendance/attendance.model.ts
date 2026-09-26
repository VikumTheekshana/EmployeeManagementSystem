import { Schema, model, Document, Types } from 'mongoose';

export type AttendanceSource = 'DynamicQR' | 'GeofencedMobile' | 'BiometricDevice';
export type AttendanceStatus = 'Present' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave';

export interface IAttendance extends Document {
  tenantId: string;
  employeeId: Types.ObjectId;
  date: string; // YYYY-MM-DD format
  checkInTime?: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  source: AttendanceSource;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  isWithinGeofence: boolean;
  workHours: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // e.g. "2026-09-26"
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ['Present', 'Late', 'HalfDay', 'Absent', 'OnLeave'],
      default: 'Present',
    },
    source: {
      type: String,
      enum: ['DynamicQR', 'GeofencedMobile', 'BiometricDevice'],
      default: 'DynamicQR',
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      address: { type: String },
    },
    isWithinGeofence: { type: Boolean, default: true },
    workHours: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ tenantId: 1, date: 1 });
AttendanceSchema.index({ tenantId: 1, status: 1 });

export const AttendanceModel = model<IAttendance>('Attendance', AttendanceSchema);
