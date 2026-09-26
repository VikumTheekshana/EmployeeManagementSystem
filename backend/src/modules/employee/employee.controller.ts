import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { EmployeeModel, IEmployee } from './employee.model';
import { UserModel } from '../auth/user.model';
import { AuditService } from '../../core/audit/audit.service';
import { sanitizeEmployeeResponse } from '../../core/security/rbac.middleware';

export class EmployeeController {
  /**
   * Retrieves all employees for the tenant with dynamic Zero-Trust masking
   */
  public static async getAll(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { department, status, reveal } = req.query;

      const query: any = { tenantId };
      if (department) query.department = department;
      if (status) query.status = status;

      const employees = await EmployeeModel.find(query).populate('reportsTo', 'fullName email employeeCode designation').lean();

      const revealRequested = reveal === 'true';
      const sanitized = await Promise.all(
        employees.map((emp) =>
          sanitizeEmployeeResponse(emp, req.user!, revealRequested, req.ip || req.socket.remoteAddress)
        )
      );

      return res.status(200).json({
        success: true,
        count: sanitized.length,
        data: sanitized,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Employee 360 view with manager details, direct reports, and document vault
   */
  public static async getById(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { reveal } = req.query;

      const employee = await EmployeeModel.findOne({ _id: id, tenantId })
        .populate('reportsTo', 'fullName email employeeCode designation department')
        .lean();

      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      // Fetch direct reports
      const directReports = await EmployeeModel.find({ reportsTo: id, tenantId })
        .select('fullName email employeeCode designation department status')
        .lean();

      const revealRequested = reveal === 'true';
      const sanitized = await sanitizeEmployeeResponse(
        employee,
        req.user!,
        revealRequested,
        req.ip || req.socket.remoteAddress
      );

      return res.status(200).json({
        success: true,
        data: {
          ...sanitized,
          directReports,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Onboards a new employee with Zero-Trust FLE encryption
   */
  public static async create(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        gender,
        dateOfBirth,
        dateOfJoining,
        department,
        designation,
        reportsTo,
        employmentType,
        nationalId,
        basicSalary,
        bankName,
        bankBranch,
        bankAccountNumber,
        bankAccountHolder,
        epfNumber,
        tinNumber,
        createUserAccount,
        userRole,
        initialPassword,
      } = req.body;

      if (!employeeCode || !firstName || !lastName || !email || !department || !designation || !nationalId || !basicSalary || !bankAccountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Missing required employee fields: code, name, email, department, designation, nationalId, basicSalary, bank details.',
        });
      }

      const existingEmp = await EmployeeModel.findOne({
        tenantId,
        $or: [{ employeeCode }, { email: email.toLowerCase().trim() }],
      });

      if (existingEmp) {
        return res.status(409).json({
          success: false,
          error: `Employee with code '${employeeCode}' or email '${email}' already exists in organization.`,
        });
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const employee = new EmployeeModel({
        tenantId,
        employeeCode: employeeCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        email: email.toLowerCase().trim(),
        phone: phone || '+94 77 123 4567',
        gender: gender || 'Other',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        department,
        designation,
        reportsTo: reportsTo || null,
        employmentType: employmentType || 'Permanent',
        status: 'Active',
        nationalId,
        basicSalary: String(basicSalary),
        bankName: bankName || 'Commercial Bank of Ceylon',
        bankBranch: bankBranch || 'Colombo Main Branch',
        bankAccountNumber: String(bankAccountNumber),
        bankAccountHolder: bankAccountHolder || fullName,
        epfNumber,
        tinNumber,
        documents: [],
      });

      await employee.save();

      // Optionally create system User login credentials
      let createdUser = null;
      if (createUserAccount) {
        const passwordToHash = initialPassword || 'Welcome@123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordToHash, salt);

        const newUser = new UserModel({
          tenantId,
          email: employee.email,
          passwordHash,
          role: userRole || 'Employee',
          employeeProfileId: employee._id,
          isActive: true,
        });
        await newUser.save();
        createdUser = { id: newUser._id, role: newUser.role, email: newUser.email };
      }

      // Record Audit
      await AuditService.log({
        tenantId,
        userId: req.user!.userId,
        userName: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'EMPLOYEE_ONBOARDED',
        resource: 'Employee',
        resourceId: employee._id.toString(),
        details: { employeeCode: employee.employeeCode, fullName: employee.fullName, department: employee.department },
      });

      return res.status(201).json({
        success: true,
        message: 'Employee onboarded successfully with Field-Level Encryption.',
        data: {
          employee,
          userAccount: createdUser,
        },
      });
    } catch (err: any) {
      console.error('Error creating employee:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Updates an existing employee profile
   */
  public static async update(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const employee = await EmployeeModel.findOne({ _id: id, tenantId });
      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      const beforeState = employee.toObject();

      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'gender',
        'department',
        'designation',
        'reportsTo',
        'employmentType',
        'status',
        'basicSalary',
        'nationalId',
        'bankName',
        'bankBranch',
        'bankAccountNumber',
        'bankAccountHolder',
        'epfNumber',
        'tinNumber',
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          (employee as any)[field] = req.body[field];
        }
      }

      if (req.body.firstName || req.body.lastName) {
        employee.fullName = `${employee.firstName} ${employee.lastName}`;
      }

      await employee.save();

      // Record audit diff
      await AuditService.log({
        tenantId,
        userId: req.user!.userId,
        userName: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'EMPLOYEE_PROFILE_UPDATED',
        resource: 'Employee',
        resourceId: employee._id.toString(),
        diff: {
          before: { department: beforeState.department, designation: beforeState.designation, status: beforeState.status },
          after: { department: employee.department, designation: employee.designation, status: employee.status },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Employee profile updated.',
        data: employee,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Generates dynamic Organization Hierarchy Tree
   */
  public static async getHierarchyTree(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const allEmployees = await EmployeeModel.find({ tenantId, status: { $ne: 'Terminated' } })
        .select('fullName employeeCode designation department reportsTo email')
        .lean();

      // Map employees to tree structure
      const empMap = new Map<string, any>();
      const rootEmployees: any[] = [];

      allEmployees.forEach((emp) => {
        empMap.set(emp._id.toString(), { ...emp, subordinates: [] });
      });

      allEmployees.forEach((emp) => {
        const mapped = empMap.get(emp._id.toString());
        if (emp.reportsTo && empMap.has(emp.reportsTo.toString())) {
          empMap.get(emp.reportsTo.toString()).subordinates.push(mapped);
        } else {
          rootEmployees.push(mapped);
        }
      });

      return res.status(200).json({
        success: true,
        data: rootEmployees,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Adds a document to the employee document vault
   */
  public static async addDocumentVaultItem(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { documentType, title, fileUrl, expiryDate } = req.body;

      if (!title || !fileUrl) {
        return res.status(400).json({ success: false, error: 'Title and fileUrl are required' });
      }

      const employee = await EmployeeModel.findOne({ _id: id, tenantId });
      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        documentType: documentType || 'Other',
        title,
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        isVerified: true,
        uploadedAt: new Date(),
      };

      employee.documents.push(newDoc as any);
      await employee.save();

      await AuditService.log({
        tenantId,
        userId: req.user!.userId,
        userName: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        action: 'DOCUMENT_VAULT_UPLOAD',
        resource: 'Employee',
        resourceId: employee._id.toString(),
        details: { documentTitle: title, documentType },
      });

      return res.status(201).json({
        success: true,
        message: 'Document vaulted securely.',
        data: employee.documents,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retrieves documents expiring within the next 30 days
   */
  public static async getExpiringDocuments(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

      const employees = await EmployeeModel.find({
        tenantId,
        'documents.expiryDate': {
          $gte: new Date(),
          $lte: thirtyDaysAhead,
        },
      }).select('fullName employeeCode department email documents');

      const expiringList: any[] = [];
      employees.forEach((emp) => {
        emp.documents.forEach((doc) => {
          if (doc.expiryDate && doc.expiryDate >= new Date() && doc.expiryDate <= thirtyDaysAhead) {
            expiringList.push({
              employeeId: emp._id,
              employeeCode: emp.employeeCode,
              fullName: emp.fullName,
              department: emp.department,
              email: emp.email,
              document: doc,
              daysLeft: Math.ceil((doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            });
          }
        });
      });

      return res.status(200).json({
        success: true,
        count: expiringList.length,
        data: expiringList,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
