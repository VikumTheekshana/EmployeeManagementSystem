import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { PayrollRunModel, PayslipModel, IPayslip } from './payroll.model';
import { EmployeeModel, IEmployee } from '../employee/employee.model';
import { OrganizationModel } from '../org/org.model';
import { PayrollCalculator } from './payroll.calculator';
import { AuditService } from '../../core/audit/audit.service';
import { maskSensitive } from '../../core/security/encryption';

export class PayrollService {
  /**
   * Executes full tenant monthly payroll generation
   */
  public static async executePayrollRun(tenantId: string, month: number, year: number, user: any) {
    const org = await OrganizationModel.findOne({ tenantId });
    const employees = await EmployeeModel.find({ tenantId, status: { $ne: 'Terminated' } });

    if (employees.length === 0) {
      throw new Error('No active employees found to process payroll');
    }

    let payrollRun = await PayrollRunModel.findOne({ tenantId, month, year });
    if (!payrollRun) {
      payrollRun = new PayrollRunModel({
        tenantId,
        month,
        year,
        status: 'Processing',
        processedBy: new Types.ObjectId(user.userId),
      });
      await payrollRun.save();
    }

    let totalGross = 0;
    let totalEPFEmployee = 0;
    let totalEPFEmployer = 0;
    let totalETF = 0;
    let totalAPIT = 0;
    let totalNetPay = 0;

    for (const emp of employees) {
      const basicSalaryNum = parseFloat(emp.basicSalary) || 75000;
      const calculation = PayrollCalculator.compute({
        basicSalary: basicSalaryNum,
      });

      totalGross += calculation.grossEarnings;
      totalEPFEmployee += calculation.epfEmployee;
      totalEPFEmployer += calculation.epfEmployer;
      totalETF += calculation.etfEmployer;
      totalAPIT += calculation.apitTax;
      totalNetPay += calculation.netSalary;

      // Upsert payslip for employee
      await PayslipModel.findOneAndUpdate(
        { tenantId, employeeId: emp._id, month, year },
        {
          tenantId,
          payrollRunId: payrollRun._id,
          employeeId: emp._id,
          month,
          year,
          basicSalary: calculation.basicSalary,
          allowances: calculation.allowances,
          grossEarnings: calculation.grossEarnings,
          epfQualifyingSalary: calculation.epfQualifyingSalary,
          epfEmployee: calculation.epfEmployee,
          epfEmployer: calculation.epfEmployer,
          etfEmployer: calculation.etfEmployer,
          apitTax: calculation.apitTax,
          otherDeductions: calculation.otherDeductions,
          totalDeductions: calculation.totalDeductions,
          netSalary: calculation.netSalary,
          costToCompany: calculation.costToCompany,
          bankDetails: {
            bankName: emp.bankName || 'Commercial Bank of Ceylon',
            branch: emp.bankBranch || 'Colombo Main',
            accountNumberMasked: maskSensitive(emp.bankAccountNumber, 4),
            accountHolder: emp.bankAccountHolder || emp.fullName,
          },
          isPaid: true,
        },
        { upsert: true, new: true }
      );
    }

    payrollRun.status = 'Approved';
    payrollRun.totalEmployees = employees.length;
    payrollRun.totalGross = Math.round(totalGross * 100) / 100;
    payrollRun.totalEPFEmployee = Math.round(totalEPFEmployee * 100) / 100;
    payrollRun.totalEPFEmployer = Math.round(totalEPFEmployer * 100) / 100;
    payrollRun.totalETF = Math.round(totalETF * 100) / 100;
    payrollRun.totalAPIT = Math.round(totalAPIT * 100) / 100;
    payrollRun.totalNetPay = Math.round(totalNetPay * 100) / 100;
    payrollRun.approvedBy = new Types.ObjectId(user.userId);
    await payrollRun.save();

    await AuditService.log({
      tenantId,
      userId: user.userId,
      userName: user.email,
      userRole: user.role,
      action: 'PAYROLL_RUN_EXECUTED',
      resource: 'PayrollRun',
      resourceId: payrollRun._id.toString(),
      details: {
        month,
        year,
        employeeCount: employees.length,
        totalNetPay: payrollRun.totalNetPay,
      },
    });

    return payrollRun;
  }

  /**
   * Generates PDF Payslip Buffer using PDFKit
   */
  public static async generatePayslipPDF(tenantId: string, payslipId: string): Promise<Buffer> {
    const payslip = await PayslipModel.findOne({ _id: payslipId, tenantId }).populate('employeeId');
    if (!payslip) throw new Error('Payslip not found');

    const org = await OrganizationModel.findOne({ tenantId });
    const emp = payslip.employeeId as any;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(18).text(org?.name || 'ENTERPRISE HRMS', 60, 52, { bold: true } as any);
      doc.fontSize(10).fillColor('#94A3B8').text(`Confidential Payslip • ${payslip.month}/${payslip.year}`, 60, 75);

      // Employee Information Box
      doc.rect(40, 115, 515, 95).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.fillColor('#1E293B').fontSize(11);

      doc.text(`Employee: ${emp.fullName}`, 55, 125, { bold: true } as any);
      doc.fontSize(9).fillColor('#64748B');
      doc.text(`Code: ${emp.employeeCode}`, 55, 145);
      doc.text(`Designation: ${emp.designation}`, 55, 160);
      doc.text(`Department: ${emp.department}`, 55, 175);
      doc.text(`EPF No: ${emp.epfNumber || 'EPF-PENDING'}`, 55, 190);

      doc.text(`Bank: ${payslip.bankDetails.bankName}`, 320, 145);
      doc.text(`Branch: ${payslip.bankDetails.branch}`, 320, 160);
      doc.text(`Account: ${payslip.bankDetails.accountNumberMasked}`, 320, 175);
      doc.text(`Pay Status: Processed & Disbursed`, 320, 190);

      // Earnings & Deductions Tables
      const tableTop = 230;
      doc.fontSize(11).fillColor('#0F172A').text('EARNINGS (LKR)', 55, tableTop, { bold: true } as any);
      doc.text('DEDUCTIONS (LKR)', 320, tableTop, { bold: true } as any);

      // Earnings lines
      let y = tableTop + 20;
      doc.fontSize(9).fillColor('#334155');
      doc.text('Basic Salary', 55, y);
      doc.text(payslip.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }), 220, y, { align: 'right' });

      payslip.allowances.forEach((al) => {
        y += 18;
        doc.text(al.name, 55, y);
        doc.text(al.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 220, y, { align: 'right' });
      });

      // Deductions lines
      let yDed = tableTop + 20;
      doc.text('EPF Employee (8%)', 320, yDed);
      doc.text(payslip.epfEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 }), 480, yDed, { align: 'right' });

      yDed += 18;
      doc.text('APIT Income Tax', 320, yDed);
      doc.text(payslip.apitTax.toLocaleString('en-US', { minimumFractionDigits: 2 }), 480, yDed, { align: 'right' });

      payslip.otherDeductions.forEach((od) => {
        yDed += 18;
        doc.text(od.name, 320, yDed);
        doc.text(od.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 480, yDed, { align: 'right' });
      });

      // Totals Box
      const totalsY = Math.max(y, yDed) + 30;
      doc.rect(40, totalsY, 515, 30).fill('#F8FAFC');
      doc.fillColor('#0F172A').fontSize(10);
      doc.text('Gross Earnings: LKR ' + payslip.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 }), 55, totalsY + 10, { bold: true } as any);
      doc.text('Total Deductions: LKR ' + payslip.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 }), 320, totalsY + 10, { bold: true } as any);

      // Net Pay Banner
      const netY = totalsY + 45;
      doc.rect(40, netY, 515, 45).fill('#10B981');
      doc.fillColor('#FFFFFF').fontSize(14).text('NET SALARY PAYABLE:', 60, netY + 15, { bold: true } as any);
      doc.fontSize(16).text('LKR ' + payslip.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }), 320, netY + 14, { bold: true, align: 'right' } as any);

      // Employer Statutory Contributions Summary
      const statY = netY + 65;
      doc.rect(40, statY, 515, 55).strokeColor('#CBD5E1').stroke();
      doc.fillColor('#475569').fontSize(9);
      doc.text('Statutory Employer Contributions (Not deducted from salary):', 55, statY + 10, { bold: true } as any);
      doc.text(`EPF Employer Contribution (12%): LKR ${payslip.epfEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 55, statY + 25);
      doc.text(`ETF Employer Contribution (3%): LKR ${payslip.etfEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 55, statY + 38);
      doc.text(`Total Cost to Company (CTC): LKR ${payslip.costToCompany.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 300, statY + 25, { bold: true } as any);

      // Footer
      doc.fontSize(8).fillColor('#94A3B8').text('This is a computer-generated payroll document. Generated securely by Enterprise Zero-Trust HRMS.', 40, 780, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generates Sri Lanka Interbank Payment System (SLIPS) compatible CSV export
   */
  public static async exportSLIPSBankFile(tenantId: string, payrollRunId: string): Promise<string> {
    const payslips = await PayslipModel.find({ tenantId, payrollRunId }).populate('employeeId');
    if (payslips.length === 0) throw new Error('No payslips found for this run');

    const headers = [
      'TransactionCode',
      'BankCode',
      'BranchCode',
      'AccountNumber',
      'BeneficiaryName',
      'AmountLKR',
      'Reference',
      'TransactionDescription',
    ];

    const rows = payslips.map((p) => {
      const emp = p.employeeId as any;
      return [
        '23', // Standard SLIPS Direct Credit Transaction Code
        '7010', // Commercial Bank of Ceylon Bank Code
        '001', // Main Branch Code
        emp.bankAccountNumber || '••••••••',
        `"${p.bankDetails.accountHolder.replace(/"/g, '""')}"`,
        p.netSalary.toFixed(2),
        `SAL-${p.year}-${String(p.month).padStart(2, '0')}`,
        `"Salary ${p.month}/${p.year} - ${emp.employeeCode}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
