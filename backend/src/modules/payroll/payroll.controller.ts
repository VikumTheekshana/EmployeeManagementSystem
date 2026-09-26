import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';
import { PayrollRunModel, PayslipModel } from './payroll.model';

export class PayrollController {
  /**
   * Executes monthly payroll calculation
   */
  public static async execute(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({ success: false, error: 'Month and year are required' });
      }

      const run = await PayrollService.executePayrollRun(
        tenantId,
        parseInt(month, 10),
        parseInt(year, 10),
        req.user!
      );

      return res.status(200).json({
        success: true,
        message: `Payroll for ${month}/${year} executed and approved successfully.`,
        data: run,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Gets list of payroll runs
   */
  public static async getRuns(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const runs = await PayrollRunModel.find({ tenantId }).sort({ year: -1, month: -1 }).lean();

      return res.status(200).json({ success: true, count: runs.length, data: runs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Gets payslips for a given payroll run
   */
  public static async getRunPayslips(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const payslips = await PayslipModel.find({ tenantId, payrollRunId: id })
        .populate('employeeId', 'fullName employeeCode department designation')
        .lean();

      return res.status(200).json({ success: true, count: payslips.length, data: payslips });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Gets authenticated employee's payslip history
   */
  public static async getMyPayslips(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const user = req.user!;

      if (!user.employeeProfileId) {
        return res.status(400).json({ success: false, error: 'Employee profile not linked' });
      }

      const payslips = await PayslipModel.find({
        tenantId,
        employeeId: user.employeeProfileId,
      })
        .sort({ year: -1, month: -1 })
        .lean();

      return res.status(200).json({ success: true, data: payslips });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Streams PDF payslip
   */
  public static async downloadPDF(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const pdfBuffer = await PayrollService.generatePayslipPDF(tenantId, id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=payslip-${id}.pdf`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  /**
   * Exports SLIPS payment CSV file
   */
  public static async exportSLIPS(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const csvContent = await PayrollService.exportSLIPSBankFile(tenantId, id);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=slips-payroll-${id}.csv`);
      return res.send(csvContent);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
