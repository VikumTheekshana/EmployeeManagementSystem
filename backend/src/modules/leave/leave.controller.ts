import { Request, Response } from 'express';
import { LeaveService } from './leave.service';
import { LeaveBalanceModel, LeaveRequestModel } from './leave.model';
import { EmployeeModel } from '../employee/employee.model';

export class LeaveController {
  /**
   * Applies for employee leave
   */
  public static async apply(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const { leaveType, startDate, endDate, totalDays, reason, employeeId } = req.body;

      const targetEmployeeId = employeeId || user.employeeProfileId;
      if (!targetEmployeeId) {
        return res.status(400).json({ success: false, error: 'Employee profile ID is required' });
      }

      if (!leaveType || !startDate || !endDate || !totalDays || !reason) {
        return res.status(400).json({ success: false, error: 'All leave details are required' });
      }

      const request = await LeaveService.applyLeave({
        tenantId,
        employeeId: targetEmployeeId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: Number(totalDays),
        reason,
      });

      return res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully.',
        data: request,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Gets leave balances for the authenticated employee
   */
  public static async getMyBalances(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

      const employeeId = req.query.employeeId || user.employeeProfileId;
      if (!employeeId) {
        return res.status(400).json({ success: false, error: 'Employee ID is required' });
      }

      const balances = await LeaveService.initializeEmployeeBalances(tenantId, employeeId as string, year);

      return res.status(200).json({
        success: true,
        year,
        data: balances,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Lists leave requests based on user role (Employee: self, Manager: team, HR: all)
   */
  public static async listRequests(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const { status } = req.query;

      let query: any = { tenantId };
      if (status) query.status = status;

      if (user.role === 'Employee') {
        query.employeeId = user.employeeProfileId;
      } else if (user.role === 'Manager') {
        const teamEmployees = await EmployeeModel.find({ reportsTo: user.employeeProfileId, tenantId }).select('_id');
        const teamIds = teamEmployees.map((e) => e._id);
        query.$or = [{ employeeId: user.employeeProfileId }, { employeeId: { $in: teamIds } }];
      }

      const requests = await LeaveRequestModel.find(query)
        .populate('employeeId', 'fullName employeeCode department designation email')
        .populate('reviewedBy', 'email role')
        .sort({ appliedAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: requests.length,
        data: requests,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Approves or rejects a leave request
   */
  public static async review(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { decision, comments } = req.body;

      if (!decision || !['Approved', 'Rejected'].includes(decision)) {
        return res.status(400).json({ success: false, error: "Decision must be 'Approved' or 'Rejected'" });
      }

      const updated = await LeaveService.reviewRequest({
        tenantId,
        requestId: id,
        reviewerUser: req.user,
        decision,
        comments,
      });

      return res.status(200).json({
        success: true,
        message: `Leave request ${decision.toLowerCase()} successfully.`,
        data: updated,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
