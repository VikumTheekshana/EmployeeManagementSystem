import { Types } from 'mongoose';
import { LeavePolicyModel, LeaveBalanceModel, LeaveRequestModel, LeaveType, LeaveStatus } from './leave.model';
import { EmployeeModel } from '../employee/employee.model';
import { AuditService } from '../../core/audit/audit.service';

export class LeaveService {
  /**
   * Seeds default Sri Lankan statutory leave policies
   */
  public static async seedDefaultPolicies(tenantId: string) {
    const defaultPolicies = [
      { leaveType: 'Annual', annualAllocation: 14, accrualFrequency: 'Monthly', carryForwardLimit: 7, isPaid: true },
      { leaveType: 'Casual', annualAllocation: 7, accrualFrequency: 'Monthly', carryForwardLimit: 0, isPaid: true },
      { leaveType: 'Medical', annualAllocation: 14, accrualFrequency: 'Monthly', carryForwardLimit: 5, isPaid: true },
      { leaveType: 'Maternity', annualAllocation: 84, accrualFrequency: 'Annual', carryForwardLimit: 0, isPaid: true },
      { leaveType: 'No-Pay', annualAllocation: 30, accrualFrequency: 'Annual', carryForwardLimit: 0, isPaid: false },
    ];

    for (const policy of defaultPolicies) {
      await LeavePolicyModel.findOneAndUpdate(
        { tenantId, leaveType: policy.leaveType },
        { ...policy, tenantId },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Initializes leave balances for an employee for the year
   */
  public static async initializeEmployeeBalances(tenantId: string, employeeId: string, year = new Date().getFullYear()) {
    const policies = await LeavePolicyModel.find({ tenantId });
    if (policies.length === 0) {
      await this.seedDefaultPolicies(tenantId);
    }

    const currentPolicies = await LeavePolicyModel.find({ tenantId });
    const balances = [];

    for (const policy of currentPolicies) {
      let balance = await LeaveBalanceModel.findOne({
        tenantId,
        employeeId: new Types.ObjectId(employeeId),
        year,
        leaveType: policy.leaveType,
      });

      if (!balance) {
        balance = new LeaveBalanceModel({
          tenantId,
          employeeId: new Types.ObjectId(employeeId),
          year,
          leaveType: policy.leaveType,
          allocated: policy.annualAllocation,
          accrued: policy.annualAllocation, // Full allocation made available
          used: 0,
          pending: 0,
          available: policy.annualAllocation,
        });
        await balance.save();
      }
      balances.push(balance);
    }

    return balances;
  }

  /**
   * Applies for leave with balance deduction check
   */
  public static async applyLeave(params: {
    tenantId: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    medicalCertUrl?: string;
  }) {
    const year = new Date(params.startDate).getFullYear();

    // Check balance if paid leave
    let balance = await LeaveBalanceModel.findOne({
      tenantId: params.tenantId,
      employeeId: new Types.ObjectId(params.employeeId),
      year,
      leaveType: params.leaveType,
    });

    if (!balance) {
      await this.initializeEmployeeBalances(params.tenantId, params.employeeId, year);
      balance = await LeaveBalanceModel.findOne({
        tenantId: params.tenantId,
        employeeId: new Types.ObjectId(params.employeeId),
        year,
        leaveType: params.leaveType,
      });
    }

    if (balance && params.leaveType !== 'No-Pay') {
      if (balance.available < params.totalDays) {
        throw new Error(
          `Insufficient leave balance. Requested ${params.totalDays} day(s), but only ${balance.available} day(s) available for ${params.leaveType} leave.`
        );
      }

      // Hold pending days
      balance.pending += params.totalDays;
      balance.available -= params.totalDays;
      await balance.save();
    }

    const request = new LeaveRequestModel({
      tenantId: params.tenantId,
      employeeId: new Types.ObjectId(params.employeeId),
      leaveType: params.leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays,
      reason: params.reason,
      status: 'Pending',
      medicalCertUrl: params.medicalCertUrl,
      appliedAt: new Date(),
    });

    await request.save();

    await AuditService.log({
      tenantId: params.tenantId,
      action: 'LEAVE_APPLICATION_SUBMITTED',
      resource: 'LeaveRequest',
      resourceId: request._id.toString(),
      details: {
        employeeId: params.employeeId,
        leaveType: params.leaveType,
        totalDays: params.totalDays,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });

    return request;
  }

  /**
   * Reviews and decides on a leave request (Approve / Reject)
   */
  public static async reviewRequest(params: {
    tenantId: string;
    requestId: string;
    reviewerUser: any;
    decision: 'Approved' | 'Rejected';
    comments?: string;
  }) {
    const request = await LeaveRequestModel.findOne({
      _id: params.requestId,
      tenantId: params.tenantId,
    });

    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'Pending') {
      throw new Error(`Request has already been processed with status: ${request.status}`);
    }

    const year = new Date(request.startDate).getFullYear();
    const balance = await LeaveBalanceModel.findOne({
      tenantId: params.tenantId,
      employeeId: request.employeeId,
      year,
      leaveType: request.leaveType,
    });

    if (params.decision === 'Approved') {
      request.status = 'Approved';
      if (balance && request.leaveType !== 'No-Pay') {
        balance.pending = Math.max(0, balance.pending - request.totalDays);
        balance.used += request.totalDays;
        await balance.save();
      }
    } else {
      request.status = 'Rejected';
      if (balance && request.leaveType !== 'No-Pay') {
        balance.pending = Math.max(0, balance.pending - request.totalDays);
        balance.available += request.totalDays;
        await balance.save();
      }
    }

    request.reviewedBy = new Types.ObjectId(params.reviewerUser.userId);
    request.reviewerComments = params.comments;
    request.reviewedAt = new Date();
    await request.save();

    await AuditService.log({
      tenantId: params.tenantId,
      userId: params.reviewerUser.userId,
      userName: params.reviewerUser.email,
      userRole: params.reviewerUser.role,
      action: `LEAVE_REQUEST_${params.decision.toUpperCase()}`,
      resource: 'LeaveRequest',
      resourceId: request._id.toString(),
      details: {
        employeeId: request.employeeId.toString(),
        totalDays: request.totalDays,
        decision: params.decision,
        comments: params.comments,
      },
    });

    return request;
  }
}
