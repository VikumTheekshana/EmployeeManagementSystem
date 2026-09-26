import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  diff?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String },
    userName: { type: String },
    userRole: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    diff: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only audit trail
  }
);

// Compound index for tenant-isolated time-range audit query performance
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, action: 1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
