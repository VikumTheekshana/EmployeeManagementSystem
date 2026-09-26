import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';
import { AttendanceModel } from './attendance.model';
import { EmployeeModel } from '../employee/employee.model';

export class AttendanceController {
  /**
   * Generates live dynamic rotating QR code token
   */
  public static async generateQR(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const qrData = AttendanceService.generateDynamicQRToken(tenantId);
      return res.status(200).json({ success: true, data: qrData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Records Check-In
   */
  public static async checkIn(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const { source = 'DynamicQR', location, qrToken, employeeId } = req.body;

      const targetEmpId = employeeId || user.employeeProfileId;
      if (!targetEmpId) {
        return res.status(400).json({ success: false, error: 'Employee Profile ID required' });
      }

      const record = await AttendanceService.recordCheckIn({
        tenantId,
        employeeId: targetEmpId,
        source,
        location,
        qrToken,
      });

      return res.status(200).json({
        success: true,
        message: 'Checked in successfully!',
        data: record,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Records Check-Out
   */
  public static async checkOut(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const { source = 'DynamicQR', location, employeeId } = req.body;

      const targetEmpId = employeeId || user.employeeProfileId;
      if (!targetEmpId) {
        return res.status(400).json({ success: false, error: 'Employee Profile ID required' });
      }

      const record = await AttendanceService.recordCheckOut({
        tenantId,
        employeeId: targetEmpId,
        source,
        location,
      });

      return res.status(200).json({
        success: true,
        message: 'Checked out successfully!',
        data: record,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Retrieves today's attendance status for caller
   */
  public static async getToday(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const employeeId = req.query.employeeId || user.employeeProfileId;

      if (!employeeId) {
        return res.status(400).json({ success: false, error: 'Employee ID required' });
      }

      const today = new Date().toISOString().split('T')[0];
      const record = await AttendanceModel.findOne({ tenantId, employeeId, date: today });

      return res.status(200).json({
        success: true,
        date: today,
        data: record || null,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Attendance history report with filters
   */
  public static async getHistory(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;
      const { startDate, endDate, department } = req.query;

      let query: any = { tenantId };

      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      if (user.role === 'Employee') {
        query.employeeId = user.employeeProfileId;
      } else if (user.role === 'Manager') {
        const team = await EmployeeModel.find({ reportsTo: user.employeeProfileId, tenantId }).select('_id');
        const teamIds = team.map((t) => t._id);
        query.$or = [{ employeeId: user.employeeProfileId }, { employeeId: { $in: teamIds } }];
      }

      const records = await AttendanceModel.find(query)
        .populate('employeeId', 'fullName employeeCode department designation')
        .sort({ date: -1, checkInTime: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Webhook endpoint for physical biometric punch machines
   */
  public static async biometricWebhook(req: Request, res: Response) {
    try {
      const { tenantId, punches } = req.body;
      if (!tenantId || !Array.isArray(punches)) {
        return res.status(400).json({ success: false, error: 'tenantId and punches array are required' });
      }

      const syncResult = await AttendanceService.processBiometricSync({ tenantId, punches });
      return res.status(200).json({
        success: true,
        message: 'Biometric punches processed successfully.',
        data: syncResult,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
