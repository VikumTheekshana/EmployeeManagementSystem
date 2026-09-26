import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from './jwt';
import { UserRole } from '../../modules/auth/user.model';
import { AuditService } from '../audit/audit.service';
import { maskSensitive, maskSalary, decryptAES256GCM } from './encryption';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: string;
    }
  }
}

/**
 * Middleware: Enforces authentication via Bearer token or HttpOnly Cookie
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication token is required.',
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    req.tenantId = decoded.tenantId;

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token has expired or is invalid.',
      details: err.message,
    });
  }
}

/**
 * Middleware: Role-Based Access Control (RBAC) gate
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized attempt to audit trail for Zero-Trust monitoring
      AuditService.log({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        userName: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'SECURITY_ACCESS_DENIED',
        resource: req.originalUrl,
        details: {
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      }).catch((e) => console.error('Audit error:', e.message));

      return res.status(403).json({
        success: false,
        error: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

/**
 * Sanitizes an employee object applying dynamic data masking.
 * Unmasks ONLY if:
 * 1. Actor is SuperAdmin or HRAdmin AND explicitly requested reveal (or configured)
 * 2. Actor is the Employee themselves AND requested reveal
 * Whenever unmasked data is delivered, a security audit log is triggered!
 */
export async function sanitizeEmployeeResponse(
  employeeDoc: any,
  requester: TokenPayload,
  revealRequested = false,
  ipAddress = '127.0.0.1'
) {
  const emp = employeeDoc.toObject ? employeeDoc.toObject() : { ...employeeDoc };
  const canUnmask =
    requester.role === 'SuperAdmin' ||
    requester.role === 'HRAdmin' ||
    (requester.employeeProfileId && requester.employeeProfileId.toString() === emp._id.toString());

  if (revealRequested && canUnmask) {
    // Audit trigger for unmasking sensitive data
    await AuditService.log({
      tenantId: requester.tenantId,
      userId: requester.userId,
      userName: requester.email,
      userRole: requester.role,
      ipAddress,
      action: 'DATA_MASKING_UNMASK_SENSITIVE',
      resource: 'Employee',
      resourceId: emp._id.toString(),
      details: {
        employeeCode: emp.employeeCode,
        unmaskedFields: ['nationalId', 'basicSalary', 'bankAccountNumber'],
      },
    });

    const decryptedSal = typeof emp.basicSalary === 'string' && emp.basicSalary.startsWith('enc:v1:')
      ? decryptAES256GCM(emp.basicSalary)
      : emp.basicSalary;
    const decryptedBank = typeof emp.bankAccountNumber === 'string' && emp.bankAccountNumber.startsWith('enc:v1:')
      ? decryptAES256GCM(emp.bankAccountNumber)
      : emp.bankAccountNumber;
    const decryptedNic = typeof emp.nationalId === 'string' && emp.nationalId.startsWith('enc:v1:')
      ? decryptAES256GCM(emp.nationalId)
      : emp.nationalId;

    return {
      ...emp,
      isMasked: false,
      basicSalary: decryptedSal,
      bankAccountNumber: decryptedBank,
      nationalId: decryptedNic,
    };
  }

  // Apply zero-trust masking
  return {
    ...emp,
    isMasked: true,
    nationalId: maskSensitive(emp.nationalId, 3, 2),
    basicSalary: maskSalary(emp.basicSalary),
    bankAccountNumber: maskSensitive(emp.bankAccountNumber, 4),
  };
}
