import { AuditLogModel, IAuditLog } from './audit.model';

export interface CreateAuditLogParams {
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
}

export class AuditService {
  /**
   * Appends an immutable forensic record to the audit trail
   */
  public static async log(params: CreateAuditLogParams): Promise<IAuditLog> {
    try {
      const record = new AuditLogModel({
        tenantId: params.tenantId,
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        ipAddress: params.ipAddress || '127.0.0.1',
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details,
        diff: params.diff,
      });

      return await record.save();
    } catch (err: any) {
      console.error('CRITICAL: Failed to write audit log:', err.message);
      throw err;
    }
  }

  /**
   * Retrieves tenant-isolated audit logs with optional pagination and action filters
   */
  public static async query(tenantId: string, options: { action?: string; limit?: number; skip?: number } = {}) {
    const { action, limit = 50, skip = 0 } = options;
    const query: any = { tenantId };
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return { logs, total, limit, skip };
  }
}
