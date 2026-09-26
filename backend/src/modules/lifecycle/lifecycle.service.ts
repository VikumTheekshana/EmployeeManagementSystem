import { Types } from 'mongoose';
import {
  AssetModel,
  OnboardingChecklistModel,
  OffboardingClearanceModel,
  IAsset,
  AssetCategory,
} from './lifecycle.model';
import { EmployeeModel } from '../employee/employee.model';
import { UserModel } from '../auth/user.model';
import { eventBus } from '../../workers/event.bus';
import { AuditService } from '../../core/audit/audit.service';

export class LifecycleService {
  /**
   * Initializes event listeners for automated event-driven workflows
   */
  public static initEventListeners() {
    // Event: When an employee resigns, auto-trigger offboarding pipeline & asset recovery
    eventBus.on('EMPLOYEE_RESIGNED', async (event) => {
      try {
        const { tenantId, employeeId, resignationDate, lastWorkingDate, reason } = event.data;

        // 1. Locate all company assets assigned to this employee
        const allocatedAssets = await AssetModel.find({
          tenantId,
          assignedTo: new Types.ObjectId(employeeId),
        });

        // 2. Initialize Offboarding Clearance workflow
        const clearance = new OffboardingClearanceModel({
          tenantId,
          employeeId: new Types.ObjectId(employeeId),
          resignationDate: new Date(resignationDate),
          lastWorkingDate: new Date(lastWorkingDate),
          reason,
          status: 'IT_Pending',
          itGate: {
            cleared: false,
            assetsRecovered: allocatedAssets.length === 0,
            accountsRevoked: false,
            notes: `${allocatedAssets.length} asset(s) pending physical recovery: ${allocatedAssets
              .map((a) => a.assetTag)
              .join(', ')}`,
          },
        });
        await clearance.save();

        console.log(`⚡ [Automation] Auto-created Offboarding Clearance ticket for employee ${employeeId}.`);
      } catch (err: any) {
        console.error('Error handling EMPLOYEE_RESIGNED event:', err.message);
      }
    });

    // Event: When an employee is onboarded, auto-generate onboarding tasks
    eventBus.on('EMPLOYEE_ONBOARDED', async (event) => {
      try {
        const { tenantId, employeeId } = event.data;
        await this.generateOnboardingChecklist(tenantId, employeeId);
      } catch (err: any) {
        console.error('Error handling EMPLOYEE_ONBOARDED event:', err.message);
      }
    });
  }

  /**
   * Creates initial onboarding self-service checklist
   */
  public static async generateOnboardingChecklist(tenantId: string, employeeId: string) {
    const existing = await OnboardingChecklistModel.findOne({
      tenantId,
      employeeId: new Types.ObjectId(employeeId),
    });
    if (existing) return existing;

    const defaultTasks = [
      { id: 'task_1', title: 'Verify personal profile and emergency contact details', category: 'SelfService', isCompleted: false },
      { id: 'task_2', title: 'Submit Sri Lankan Bank account & EPF registration details', category: 'SelfService', isCompleted: false },
      { id: 'task_3', title: 'Upload National Identity Card (NIC) & Degree certificates to Document Vault', category: 'SelfService', isCompleted: false },
      { id: 'task_4', title: 'Acknowledge company code of conduct & data protection policies', category: 'SelfService', isCompleted: false },
      { id: 'task_5', title: 'IT equipment handover & system email account provisioning', category: 'IT', isCompleted: false },
      { id: 'task_6', title: 'HR orientation session and manager introduction', category: 'HR', isCompleted: false },
    ];

    const checklist = new OnboardingChecklistModel({
      tenantId,
      employeeId: new Types.ObjectId(employeeId),
      tasks: defaultTasks,
      overallProgress: 0,
      completed: false,
    });

    return await checklist.save();
  }

  /**
   * Completes a task in the onboarding checklist
   */
  public static async completeOnboardingTask(tenantId: string, employeeId: string, taskId: string) {
    let checklist = await OnboardingChecklistModel.findOne({
      tenantId,
      employeeId: new Types.ObjectId(employeeId),
    });

    if (!checklist) {
      checklist = await this.generateOnboardingChecklist(tenantId, employeeId);
    }

    const task = checklist.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Onboarding task not found');

    task.isCompleted = true;
    task.completedAt = new Date();

    const completedCount = checklist.tasks.filter((t) => t.isCompleted).length;
    checklist.overallProgress = Math.round((completedCount / checklist.tasks.length) * 100);
    checklist.completed = checklist.overallProgress === 100;

    await checklist.save();
    return checklist;
  }

  /**
   * Registers a new company asset
   */
  public static async registerAsset(params: {
    tenantId: string;
    assetTag: string;
    serialNumber: string;
    name: string;
    category: AssetCategory;
    estimatedValueLKR: number;
    condition?: 'BrandNew' | 'Good' | 'Fair' | 'Damaged';
  }) {
    const existing = await AssetModel.findOne({ tenantId: params.tenantId, assetTag: params.assetTag });
    if (existing) throw new Error(`Asset with tag '${params.assetTag}' already exists`);

    const asset = new AssetModel({
      ...params,
      status: 'Available',
    });
    return await asset.save();
  }

  /**
   * Allocates an asset to an employee
   */
  public static async allocateAsset(tenantId: string, assetId: string, employeeId: string, actor: any) {
    const asset = await AssetModel.findOne({ _id: assetId, tenantId });
    if (!asset) throw new Error('Asset not found');

    asset.assignedTo = new Types.ObjectId(employeeId);
    asset.status = 'Allocated';
    asset.allocatedAt = new Date();
    await asset.save();

    await AuditService.log({
      tenantId,
      userId: actor.userId,
      userName: actor.email,
      action: 'ASSET_ALLOCATED',
      resource: 'Asset',
      resourceId: asset._id.toString(),
      details: { assetTag: asset.assetTag, employeeId },
    });

    return asset;
  }

  /**
   * Returns an asset to company inventory
   */
  public static async returnAsset(tenantId: string, assetId: string, condition: 'Good' | 'Fair' | 'Damaged', actor: any) {
    const asset = await AssetModel.findOne({ _id: assetId, tenantId });
    if (!asset) throw new Error('Asset not found');

    const previousEmployeeId = asset.assignedTo;
    asset.assignedTo = undefined;
    asset.status = condition === 'Damaged' ? 'UnderRepair' : 'Available';
    asset.condition = condition;
    asset.returnedAt = new Date();
    await asset.save();

    await AuditService.log({
      tenantId,
      userId: actor.userId,
      userName: actor.email,
      action: 'ASSET_RETURNED',
      resource: 'Asset',
      resourceId: asset._id.toString(),
      details: { assetTag: asset.assetTag, returnedFrom: previousEmployeeId, condition },
    });

    return asset;
  }

  /**
   * Initiates employee resignation and triggers automated workflow event
   */
  public static async initiateResignation(params: {
    tenantId: string;
    employeeId: string;
    resignationDate: Date;
    lastWorkingDate: Date;
    reason: string;
    actor: any;
  }) {
    const employee = await EmployeeModel.findOne({ _id: params.employeeId, tenantId: params.tenantId });
    if (!employee) throw new Error('Employee not found');

    employee.status = 'Resigned';
    await employee.save();

    // Fire automated event hook
    eventBus.emitEvent({
      tenantId: params.tenantId,
      actorId: params.actor.userId,
      eventType: 'EMPLOYEE_RESIGNED',
      data: {
        tenantId: params.tenantId,
        employeeId: params.employeeId,
        resignationDate: params.resignationDate,
        lastWorkingDate: params.lastWorkingDate,
        reason: params.reason,
      },
      timestamp: new Date(),
    });

    return { success: true, message: 'Resignation logged; offboarding workflow automatically dispatched.' };
  }

  /**
   * Approves IT Clearance Gate
   */
  public static async clearITGate(tenantId: string, clearanceId: string, user: any, notes?: string) {
    const clearance = await OffboardingClearanceModel.findOne({ _id: clearanceId, tenantId });
    if (!clearance) throw new Error('Clearance record not found');

    clearance.itGate = {
      cleared: true,
      clearedBy: new Types.ObjectId(user.userId),
      clearedAt: new Date(),
      assetsRecovered: true,
      accountsRevoked: true,
      notes,
    };
    clearance.status = 'Finance_Pending';
    await clearance.save();

    return clearance;
  }

  /**
   * Approves Finance Clearance Gate with statutory gratuity calculation
   */
  public static async clearFinanceGate(tenantId: string, clearanceId: string, user: any, notes?: string) {
    const clearance = await OffboardingClearanceModel.findOne({ _id: clearanceId, tenantId });
    if (!clearance) throw new Error('Clearance record not found');

    const employee = await EmployeeModel.findOne({ _id: clearance.employeeId, tenantId });
    let gratuityLKR = 0;

    if (employee) {
      // Calculate years of service
      const joiningDate = employee.dateOfJoining || new Date();
      const lastDate = clearance.lastWorkingDate || new Date();
      const yearsOfService = (lastDate.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

      // Sri Lankan Gratuity Act: 5+ years earns 1/2 month basic salary per year
      if (yearsOfService >= 5) {
        const basicSalary = parseFloat(employee.basicSalary) || 0;
        gratuityLKR = Math.round(basicSalary * 0.5 * Math.floor(yearsOfService) * 100) / 100;
      }
    }

    clearance.financeGate = {
      cleared: true,
      clearedBy: new Types.ObjectId(user.userId),
      clearedAt: new Date(),
      outstandingLoansSettled: true,
      finalGratuityLKR: gratuityLKR,
      finalSalaryPayableLKR: employee ? parseFloat(employee.basicSalary) || 0 : 0,
      notes,
    };
    clearance.status = 'HR_Pending';
    await clearance.save();

    return clearance;
  }

  /**
   * Final HR Gate clearance, completing the employee exit
   */
  public static async clearHRGate(tenantId: string, clearanceId: string, user: any, notes?: string) {
    const clearance = await OffboardingClearanceModel.findOne({ _id: clearanceId, tenantId });
    if (!clearance) throw new Error('Clearance record not found');

    clearance.hrGate = {
      cleared: true,
      clearedBy: new Types.ObjectId(user.userId),
      clearedAt: new Date(),
      exitInterviewCompleted: true,
      serviceCertificateIssued: true,
      notes,
    };
    clearance.status = 'Completed';
    clearance.completedAt = new Date();
    await clearance.save();

    // Deactivate employee login user account
    await UserModel.findOneAndUpdate(
      { tenantId, employeeProfileId: clearance.employeeId },
      { isActive: false, refreshToken: null }
    );

    // Update employee status to Terminated/Exited
    await EmployeeModel.findByIdAndUpdate(clearance.employeeId, { status: 'Terminated' });

    return clearance;
  }
}

// Initialize listeners on load
LifecycleService.initEventListeners();
