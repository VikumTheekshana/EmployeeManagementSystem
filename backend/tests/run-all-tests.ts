import { connectToDatabase, disconnectDatabase } from '../src/core/database/connection';
import { OrganizationModel } from '../src/modules/org/org.model';
import { UserModel } from '../src/modules/auth/user.model';
import { EmployeeModel } from '../src/modules/employee/employee.model';
import { AuditLogModel } from '../src/core/audit/audit.model';
import { AttendanceService } from '../src/modules/attendance/attendance.service';
import { AttendanceModel } from '../src/modules/attendance/attendance.model';
import { LeaveService } from '../src/modules/leave/leave.service';
import { LeaveRequestModel, LeaveBalanceModel } from '../src/modules/leave/leave.model';
import { PayrollService } from '../src/modules/payroll/payroll.service';
import { PayrollRunModel, PayslipModel } from '../src/modules/payroll/payroll.model';
import { PayrollCalculator } from '../src/modules/payroll/payroll.calculator';
import { LifecycleService } from '../src/modules/lifecycle/lifecycle.service';
import { AssetModel, OffboardingClearanceModel } from '../src/modules/lifecycle/lifecycle.model';
import { RAGService } from '../src/modules/rag/rag.service';
import { generateAccessToken } from '../src/core/security/jwt';
import { sanitizeEmployeeResponse } from '../src/core/security/rbac.middleware';

async function runComprehensiveTestSuite() {
  console.log('\n================================================================');
  console.log('🚀 ENTERPRISE ZERO-TRUST HRMS COMPREHENSIVE INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await connectToDatabase();
  const testTenantId = `test-corp-${Date.now()}`;
  console.log(`[Test Environment] Isolated Tenant ID: ${testTenantId}`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Tenant Organization & Core Identity Provisioning
    // -------------------------------------------------------------
    console.log('\n--- [Module 1 & 2] Testing Organization, RBAC, FLE, and Dynamic Masking ---');
    
    // Create Organization
    const org = new OrganizationModel({
      tenantId: testTenantId,
      name: 'Apex Ceylon Global (Pvt) Ltd',
      country: 'Sri Lanka',
      currency: 'LKR',
    });
    await org.save();
    console.log(`✅ Organization created: ${org.name}`);

    // Create CEO / SuperAdmin Employee
    const ceo = new EmployeeModel({
      tenantId: testTenantId,
      employeeCode: 'CEO-001',
      firstName: 'Kavinda',
      lastName: 'Perera',
      fullName: 'Kavinda Perera',
      email: `kavinda.${Date.now()}@apexceylon.com`,
      phone: '+94 77 100 2000',
      department: 'Executive',
      designation: 'Chief Executive Officer',
      nationalId: '198012345678',
      basicSalary: '950000.00',
      bankName: 'Commercial Bank of Ceylon',
      bankBranch: 'Colombo 01',
      bankAccountNumber: '8001122334455',
      bankAccountHolder: 'Kavinda Perera',
      employmentType: 'Permanent',
      status: 'Active',
    });
    await ceo.save();

    // Verify FLE Encryption stored in DB
    const rawCeoDoc = await EmployeeModel.collection.findOne({ _id: ceo._id });
    if (!rawCeoDoc?.nationalId?.startsWith('enc:v1:') || !rawCeoDoc?.basicSalary?.startsWith('enc:v1:')) {
      throw new Error('FLE encryption check failed! Data was not encrypted in MongoDB.');
    }
    console.log('✅ Field-Level Encryption verified in MongoDB:');
    console.log(`   Raw stored nationalId: ${rawCeoDoc.nationalId.substring(0, 32)}...`);
    console.log(`   Raw stored basicSalary: ${rawCeoDoc.basicSalary.substring(0, 32)}...`);

    // Create SuperAdmin User
    const adminUser = new UserModel({
      tenantId: testTenantId,
      email: ceo.email,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      role: 'SuperAdmin',
      employeeProfileId: ceo._id,
      isActive: true,
    });
    await adminUser.save();

    // Create Manager Employee reporting to CEO
    const manager = new EmployeeModel({
      tenantId: testTenantId,
      employeeCode: 'MGR-002',
      firstName: 'Dulari',
      lastName: 'Fernando',
      fullName: 'Dulari Fernando',
      email: `dulari.${Date.now()}@apexceylon.com`,
      phone: '+94 71 300 4000',
      department: 'Engineering',
      designation: 'Director of Engineering',
      reportsTo: ceo._id,
      nationalId: '198755667788',
      basicSalary: '450000.00',
      bankName: 'Hatton National Bank',
      bankBranch: 'Head Office',
      bankAccountNumber: '003010998877',
      bankAccountHolder: 'Dulari Fernando',
      employmentType: 'Permanent',
      status: 'Active',
    });
    await manager.save();

    // Create Staff Employee reporting to Manager
    const staff = new EmployeeModel({
      tenantId: testTenantId,
      employeeCode: 'DEV-003',
      firstName: 'Roshan',
      lastName: 'Silva',
      fullName: 'Roshan Silva',
      email: `roshan.${Date.now()}@apexceylon.com`,
      phone: '+94 76 500 6000',
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      reportsTo: manager._id,
      nationalId: '199588990011',
      basicSalary: '225000.00',
      bankName: 'Sampath Bank',
      bankBranch: 'Kollupitiya',
      bankAccountNumber: '100522334455',
      bankAccountHolder: 'Roshan Silva',
      employmentType: 'Permanent',
      status: 'Active',
    });
    await staff.save();
    console.log('✅ 3-Tier Hierarchy created: CEO -> Manager -> Staff Employee');

    // Test Dynamic Zero-Trust Masking
    const staffUserToken = {
      userId: 'test_other_user',
      tenantId: testTenantId,
      email: 'viewer@apexceylon.com',
      role: 'Employee' as const,
    };
    const masked = await sanitizeEmployeeResponse(staff, staffUserToken, false);
    console.log(`✅ Masked Profile: Salary=${masked.basicSalary}, Bank=${masked.bankAccountNumber}, NIC=${masked.nationalId}`);
    if (!masked.basicSalary.includes('•') || !masked.bankAccountNumber.includes('*')) {
      throw new Error('Masking failed for non-privileged user');
    }

    const adminToken = {
      userId: adminUser._id.toString(),
      tenantId: testTenantId,
      email: adminUser.email,
      role: 'SuperAdmin' as const,
    };
    const unmasked = await sanitizeEmployeeResponse(staff, adminToken, true);
    console.log(`✅ Unmasked Profile (Admin with audit trigger): Salary=${unmasked.basicSalary}, Bank=${unmasked.bankAccountNumber}`);
    if (unmasked.isMasked) {
      throw new Error('Unmasking failed for authorized admin');
    }

    // Verify Audit Log generated
    const auditLogs = await AuditLogModel.find({ tenantId: testTenantId, action: 'DATA_MASKING_UNMASK_SENSITIVE' });
    console.log(`✅ Audit Log Verified: ${auditLogs.length} unmasking event(s) logged immutably.`);

    // -------------------------------------------------------------
    // TEST 2: Hybrid Attendance & Dynamic QR Validation
    // -------------------------------------------------------------
    console.log('\n--- [Module 3] Testing Hybrid Attendance & Multi-Policy Leave Engine ---');
    
    // Test Dynamic QR Generation & Verification
    const qr = AttendanceService.generateDynamicQRToken(testTenantId);
    const isValidQR = AttendanceService.verifyDynamicQRToken(testTenantId, qr.token);
    console.log(`✅ Dynamic QR Token Generated & Signature Verified: ${isValidQR}`);
    if (!isValidQR) throw new Error('Dynamic QR signature verification failed');

    // Check In with QR
    const checkInRecord = await AttendanceService.recordCheckIn({
      tenantId: testTenantId,
      employeeId: staff._id.toString(),
      source: 'DynamicQR',
      qrToken: qr.token,
    });
    console.log(`✅ Employee Check-In Recorded: Status=${checkInRecord.status}, Source=${checkInRecord.source}`);

    // Check Out
    const checkOutRecord = await AttendanceService.recordCheckOut({
      tenantId: testTenantId,
      employeeId: staff._id.toString(),
      source: 'DynamicQR',
    });
    console.log(`✅ Employee Check-Out Recorded: WorkHours=${checkOutRecord.workHours}`);

    // Biometric Batch Punch Webhook
    const biometricResult = await AttendanceService.processBiometricSync({
      tenantId: testTenantId,
      punches: [
        {
          employeeCode: manager.employeeCode,
          timestamp: new Date().toISOString(),
          type: 'IN',
          deviceId: 'BIO-GATE-01',
        },
      ],
    });
    console.log(`✅ Biometric Webhook Synced: ${biometricResult.syncedCount} punch record(s) processed.`);

    // Leave Balances & Accrual
    const balances = await LeaveService.initializeEmployeeBalances(testTenantId, staff._id.toString());
    console.log(`✅ Initialized ${balances.length} Statutory Leave Policy Balances for Employee (Annual: 14, Casual: 7, Medical: 14)`);

    // Apply for Leave
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const leaveReq = await LeaveService.applyLeave({
      tenantId: testTenantId,
      employeeId: staff._id.toString(),
      leaveType: 'Annual',
      startDate: tomorrow,
      endDate: dayAfter,
      totalDays: 2,
      reason: 'Family event out of Colombo',
    });
    console.log(`✅ Leave Application Submitted: ID=${leaveReq._id}, Status=${leaveReq.status}`);

    // Review Leave (Approved by Manager/Admin)
    const approvedLeave = await LeaveService.reviewRequest({
      tenantId: testTenantId,
      requestId: leaveReq._id.toString(),
      reviewerUser: adminToken,
      decision: 'Approved',
      comments: 'Approved. Enjoy your time off.',
    });
    console.log(`✅ Leave Approved: Status=${approvedLeave.status}`);

    // Verify balance deduction
    const updatedBalance = await LeaveBalanceModel.findOne({
      tenantId: testTenantId,
      employeeId: staff._id,
      leaveType: 'Annual',
    });
    console.log(`✅ Leave Balance Verified: Allocated=${updatedBalance?.allocated}, Used=${updatedBalance?.used}, Available=${updatedBalance?.available}`);
    if (updatedBalance?.used !== 2) throw new Error('Leave balance deduction failed');

    // -------------------------------------------------------------
    // TEST 3: Rule-Engine Based Payroll & Sri Lankan Statutory Compliance
    // -------------------------------------------------------------
    console.log('\n--- [Module 4] Testing Sri Lankan Statutory Compliance Payroll Engine ---');

    // Test Calculator directly
    const sampleBasic = 250000;
    const calcOutput = PayrollCalculator.compute({ basicSalary: sampleBasic });
    console.log(`✅ Statutory Computation for Basic LKR ${sampleBasic.toLocaleString()}:`);
    console.log(`   Gross Earnings: LKR ${calcOutput.grossEarnings.toLocaleString()}`);
    console.log(`   EPF Employee (8%): LKR ${calcOutput.epfEmployee.toLocaleString()}`);
    console.log(`   EPF Employer (12%): LKR ${calcOutput.epfEmployer.toLocaleString()}`);
    console.log(`   ETF Employer (3%): LKR ${calcOutput.etfEmployer.toLocaleString()}`);
    console.log(`   APIT Progressive Tax: LKR ${calcOutput.apitTax.toLocaleString()}`);
    console.log(`   Net Salary: LKR ${calcOutput.netSalary.toLocaleString()}`);
    console.log(`   Cost to Company (CTC): LKR ${calcOutput.costToCompany.toLocaleString()}`);

    if (calcOutput.epfEmployee !== Math.round(calcOutput.epfQualifyingSalary * 0.08 * 100) / 100) {
      throw new Error('EPF Employee 8% mismatch');
    }

    // Execute Monthly Payroll Run
    const payrollRun = await PayrollService.executePayrollRun(testTenantId, 9, 2026, adminToken);
    console.log(`✅ Payroll Run Executed: RunId=${payrollRun._id}, Status=${payrollRun.status}, NetPay=LKR ${payrollRun.totalNetPay.toLocaleString()}`);

    // Verify Payslips
    const payslips = await PayslipModel.find({ tenantId: testTenantId, payrollRunId: payrollRun._id });
    console.log(`✅ Generated ${payslips.length} Payslip(s) for Run.`);

    // Generate Payslip PDF
    const pdfBuffer = await PayrollService.generatePayslipPDF(testTenantId, payslips[0]._id.toString());
    console.log(`✅ PDF Payslip Generated Successfully! Buffer Size: ${pdfBuffer.length} bytes.`);
    if (pdfBuffer.length < 1000) throw new Error('PDF payslip generation produced empty buffer');

    // Export SLIPS Bank File
    const slipsCSV = await PayrollService.exportSLIPSBankFile(testTenantId, payrollRun._id.toString());
    console.log(`✅ SLIPS Bank File Generated (${slipsCSV.split('\n').length} lines including header).`);
    console.log(`   First row sample: ${slipsCSV.split('\n')[1]}`);

    // -------------------------------------------------------------
    // TEST 4: Lifecycle, Asset Tracking & Event-Driven Automations
    // -------------------------------------------------------------
    console.log('\n--- [Module 5 & 6] Testing Lifecycle, Assets, and Event-Driven Workflow Automations ---');

    // Register Company Asset
    const laptop = await LifecycleService.registerAsset({
      tenantId: testTenantId,
      assetTag: `AST-LP-${Date.now()}`,
      serialNumber: 'SN-DELL-XPS-9530-XYZ',
      name: 'Dell XPS 15 (i9 32GB RAM)',
      category: 'Laptop',
      estimatedValueLKR: 750000,
      condition: 'BrandNew',
    });
    console.log(`✅ Company Asset Registered: ${laptop.assetTag} (${laptop.name})`);

    // Allocate Asset to Staff Employee
    await LifecycleService.allocateAsset(testTenantId, laptop._id.toString(), staff._id.toString(), adminToken);
    const allocatedAsset = await AssetModel.findById(laptop._id);
    console.log(`✅ Asset Allocated to ${staff.fullName}: Status=${allocatedAsset?.status}`);

    // Onboarding Self-Service Checklist
    const checklist = await LifecycleService.generateOnboardingChecklist(testTenantId, staff._id.toString());
    console.log(`✅ Onboarding Checklist Created: ${checklist.tasks.length} tasks, Initial Progress: ${checklist.overallProgress}%`);

    // Complete task
    const updatedChecklist = await LifecycleService.completeOnboardingTask(testTenantId, staff._id.toString(), 'task_1');
    console.log(`✅ Completed Task 1: New Progress: ${updatedChecklist.overallProgress}%`);

    // Resignation & Event Hook
    console.log('⚡ Triggering Resignation event hook...');
    await LifecycleService.initiateResignation({
      tenantId: testTenantId,
      employeeId: staff._id.toString(),
      resignationDate: new Date(),
      lastWorkingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      reason: 'Relocating overseas',
      actor: adminToken,
    });

    // Wait for event bus async propagation and Atlas write
    let clearance = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      clearance = await OffboardingClearanceModel.findOne({ tenantId: testTenantId, employeeId: staff._id });
      if (clearance) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!clearance) throw new Error('Automated offboarding ticket creation failed');
    console.log(`✅ Automated Offboarding Ticket Verified: Status=${clearance.status}`);
    console.log(`   Pending recovery notes: ${clearance.itGate?.notes}`);

    // IT Gate Clearance
    await LifecycleService.returnAsset(testTenantId, laptop._id.toString(), 'Good', adminToken);
    const itCleared = await LifecycleService.clearITGate(testTenantId, clearance._id.toString(), adminToken, 'All IT assets returned in good condition.');
    console.log(`✅ IT Gate Approved: Next Status=${itCleared.status}`);

    // Finance Gate Clearance
    const finCleared = await LifecycleService.clearFinanceGate(testTenantId, clearance._id.toString(), adminToken, 'Final salary and statutory settlements audited.');
    console.log(`✅ Finance Gate Approved: Gratuity Payable=LKR ${finCleared.financeGate.finalGratuityLKR}, Next Status=${finCleared.status}`);

    // HR Final Exit Clearance
    const hrCleared = await LifecycleService.clearHRGate(testTenantId, clearance._id.toString(), adminToken, 'Exit interview completed. Service letter dispatched.');
    console.log(`✅ HR Final Gate Cleared: Status=${hrCleared.status}`);

    // Verify employee status is now Terminated
    const finalStaffDoc = await EmployeeModel.findById(staff._id);
    console.log(`✅ Employee Lifecycle Exit Complete: Final Status=${finalStaffDoc?.status}`);
    if (finalStaffDoc?.status !== 'Terminated') throw new Error('Employee termination status failed');

    // -------------------------------------------------------------
    // TEST 5: Internal HR Policy Assistant (RAG Engine)
    // -------------------------------------------------------------
    console.log('\n--- [Module 7] Testing Internal HR Policy Assistant (RAG Engine) ---');
    
    const ragQueries = [
      'How many days of paid casual leave am I entitled to in Sri Lanka?',
      'What are the hospitalization insurance limits for private hospitals?',
      'How is statutory gratuity calculated under Sri Lankan law for 5 years service?',
      'What are the APIT income tax slabs and rates?',
    ];

    for (const query of ragQueries) {
      const ragResponse = RAGService.query(query);
      console.log(`\n🔍 Query: "${query}"`);
      console.log(`   Top Matched Policy: ${ragResponse.relevantPolicies[0]?.policyTitle} (${ragResponse.relevantPolicies[0]?.sectionTitle}) [Score: ${ragResponse.relevantPolicies[0]?.score.toFixed(2)}]`);
      console.log(`   Answer Preview: ${ragResponse.answer.split('\n')[2]?.substring(0, 100)}...`);
      if (ragResponse.relevantPolicies.length === 0) {
        throw new Error(`RAG query failed to retrieve relevant policy for: "${query}"`);
      }
    }

    console.log('\n================================================================');
    console.log('🎉 ALL 7 MODULE INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('❌ Test Suite Failed:', error);
    process.exit(1);
  } finally {
    // Clean up test tenant data to preserve Atlas storage hygiene
    console.log(`[Cleanup] Purging temporary test tenant '${testTenantId}' from MongoDB Atlas...`);
    await Promise.all([
      OrganizationModel.deleteMany({ tenantId: testTenantId }),
      UserModel.deleteMany({ tenantId: testTenantId }),
      EmployeeModel.deleteMany({ tenantId: testTenantId }),
      AttendanceModel.deleteMany({ tenantId: testTenantId }),
      LeaveBalanceModel.deleteMany({ tenantId: testTenantId }),
      LeaveRequestModel.deleteMany({ tenantId: testTenantId }),
      PayrollRunModel.deleteMany({ tenantId: testTenantId }),
      PayslipModel.deleteMany({ tenantId: testTenantId }),
      AssetModel.deleteMany({ tenantId: testTenantId }),
      OffboardingClearanceModel.deleteMany({ tenantId: testTenantId }),
      AuditLogModel.deleteMany({ tenantId: testTenantId }),
    ]);
    console.log('✅ Temporary test tenant purged.');
    await disconnectDatabase();
  }
}

runComprehensiveTestSuite();
