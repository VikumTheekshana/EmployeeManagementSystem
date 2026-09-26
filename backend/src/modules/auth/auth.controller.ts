import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from './user.model';
import { OrganizationModel } from '../org/org.model';
import { EmployeeModel } from '../employee/employee.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../core/security/jwt';
import { AuditService } from '../../core/audit/audit.service';

export class AuthController {
  /**
   * Initializes Tenant Organization & Root SuperAdmin
   */
  public static async registerOrganization(req: Request, res: Response) {
    try {
      const { tenantId, organizationName, adminEmail, adminPassword, adminFullName } = req.body;

      if (!tenantId || !organizationName || !adminEmail || !adminPassword) {
        return res.status(400).json({
          success: false,
          error: 'tenantId, organizationName, adminEmail, and adminPassword are required.',
        });
      }

      const normalizedTenantId = tenantId.toLowerCase().trim();
      const existingOrg = await OrganizationModel.findOne({ tenantId: normalizedTenantId });
      if (existingOrg) {
        return res.status(409).json({
          success: false,
          error: `Organization with tenantId '${normalizedTenantId}' already exists.`,
        });
      }

      // Create Organization
      const org = new OrganizationModel({
        tenantId: normalizedTenantId,
        name: organizationName,
      });
      await org.save();

      // Create Admin Employee Record
      const nameParts = (adminFullName || 'System Administrator').split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Admin';

      const adminEmployee = new EmployeeModel({
        tenantId: normalizedTenantId,
        employeeCode: 'EMP-0001',
        firstName,
        lastName,
        fullName: adminFullName || 'System Administrator',
        email: adminEmail.toLowerCase().trim(),
        phone: '+94 11 234 5678',
        department: 'Executive',
        designation: 'Chief Executive Officer',
        nationalId: '198501234567',
        basicSalary: '850000.00',
        bankName: 'Commercial Bank of Ceylon',
        bankBranch: 'Colombo Main',
        bankAccountNumber: '8009988776655',
        bankAccountHolder: adminFullName || 'System Administrator',
        employmentType: 'Permanent',
        status: 'Active',
      });
      await adminEmployee.save();

      // Create User
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      const user = new UserModel({
        tenantId: normalizedTenantId,
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        role: 'SuperAdmin',
        employeeProfileId: adminEmployee._id,
        isActive: true,
      });
      await user.save();

      const tokens = {
        accessToken: generateAccessToken({
          userId: user._id.toString(),
          tenantId: user.tenantId,
          email: user.email,
          role: user.role,
          employeeProfileId: adminEmployee._id.toString(),
        }),
        refreshToken: generateRefreshToken({
          userId: user._id.toString(),
          tenantId: user.tenantId,
          email: user.email,
          role: user.role,
          employeeProfileId: adminEmployee._id.toString(),
        }),
      };

      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Audit Log
      await AuditService.log({
        tenantId: normalizedTenantId,
        userId: user._id.toString(),
        userName: user.email,
        userRole: user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'TENANT_ORGANIZATION_INITIALIZED',
        resource: 'Organization',
        resourceId: org._id.toString(),
        details: { organizationName, tenantId: normalizedTenantId },
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        success: true,
        message: 'Organization and SuperAdmin successfully created.',
        data: {
          tenantId: org.tenantId,
          organization: org,
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            employeeProfileId: user.employeeProfileId,
          },
          tokens,
        },
      });
    } catch (err: any) {
      console.error('Registration failed:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * User Login
   */
  public static async login(req: Request, res: Response) {
    try {
      const { tenantId, email, password } = req.body;

      if (!tenantId || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'tenantId, email, and password are required.',
        });
      }

      const normalizedTenantId = tenantId.toLowerCase().trim();
      const normalizedEmail = email.toLowerCase().trim();

      const user = await UserModel.findOne({
        tenantId: normalizedTenantId,
        email: normalizedEmail,
      });

      if (!user || !user.isActive) {
        // Record security audit on failed login
        await AuditService.log({
          tenantId: normalizedTenantId,
          ipAddress: req.ip || req.socket.remoteAddress,
          action: 'AUTH_LOGIN_FAILED',
          resource: 'User',
          details: { email: normalizedEmail, reason: 'User not found or inactive' },
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid credentials or account is deactivated.',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        await AuditService.log({
          tenantId: normalizedTenantId,
          userId: user._id.toString(),
          userName: user.email,
          ipAddress: req.ip || req.socket.remoteAddress,
          action: 'AUTH_LOGIN_FAILED',
          resource: 'User',
          details: { email: normalizedEmail, reason: 'Incorrect password' },
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid credentials or account is deactivated.',
        });
      }

      const tokenPayload = {
        userId: user._id.toString(),
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        employeeProfileId: user.employeeProfileId?.toString(),
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      user.refreshToken = refreshToken;
      user.lastLoginAt = new Date();
      await user.save();

      await AuditService.log({
        tenantId: user.tenantId,
        userId: user._id.toString(),
        userName: user.email,
        userRole: user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'User',
        resourceId: user._id.toString(),
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            employeeProfileId: user.employeeProfileId,
          },
          accessToken,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Refresh Token Endpoint
   */
  public static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token required' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken || !user.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid or revoked refresh token' });
      }

      const tokenPayload = {
        userId: user._id.toString(),
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        employeeProfileId: user.employeeProfileId?.toString(),
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      user.refreshToken = newRefreshToken;
      await user.save();

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (err: any) {
      return res.status(401).json({ success: false, error: 'Refresh token expired or invalid' });
    }
  }

  /**
   * Current Authenticated User Details
   */
  public static async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const user = await UserModel.findById(req.user.userId).select('-passwordHash -refreshToken');
      let employeeProfile: any = null;

      if (user?.employeeProfileId) {
        employeeProfile = await EmployeeModel.findById(user.employeeProfileId);
      }

      const organization = await OrganizationModel.findOne({ tenantId: req.user.tenantId });

      return res.status(200).json({
        success: true,
        data: {
          user,
          employeeProfile,
          organization,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Logout
   */
  public static async logout(req: Request, res: Response) {
    try {
      if (req.user) {
        await UserModel.findByIdAndUpdate(req.user.userId, { refreshToken: null });
        await AuditService.log({
          tenantId: req.user.tenantId,
          userId: req.user.userId,
          userName: req.user.email,
          userRole: req.user.role,
          ipAddress: req.ip || req.socket.remoteAddress,
          action: 'AUTH_LOGOUT',
          resource: 'User',
          resourceId: req.user.userId,
        });
      }

      res.clearCookie('refreshToken');
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
