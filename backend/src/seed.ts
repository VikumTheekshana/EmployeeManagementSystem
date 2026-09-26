import bcrypt from 'bcryptjs';
import { connectToDatabase, disconnectDatabase } from './core/database/connection';
import { OrganizationModel } from './modules/org/org.model';
import { UserModel } from './modules/auth/user.model';
import { EmployeeModel } from './modules/employee/employee.model';
import { LeaveService } from './modules/leave/leave.service';
import { AttendanceService } from './modules/attendance/attendance.service';
import { PayrollService } from './modules/payroll/payroll.service';
import { LifecycleService } from './modules/lifecycle/lifecycle.service';
import { AssetModel } from './modules/lifecycle/lifecycle.model';

export async function seedDemoDatabase() {
  console.log('🌱 [Seeder] Initializing Demo Organization: apex-ceylon...');
  await connectToDatabase();

  const tenantId = 'apex-ceylon';

  // 1. Create Organization
  await OrganizationModel.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      name: 'Apex Ceylon Global Technologies (Pvt) Ltd',
      country: 'Sri Lanka',
      currency: 'LKR',
      taxRegistrationNumber: 'VAT-987654321-7000',
      departments: ['Executive', 'Engineering', 'Human Resources', 'Finance & Accounting', 'Operations'],
      designations: ['Chief Executive Officer', 'VP of Engineering', 'Lead Cloud Architect', 'Senior HR Manager', 'Financial Controller', 'Accountant'],
    },
    { upsert: true, new: true }
  );

  // 2. Create Employees with FLE Encrypted Data
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@123', 10);
  const employeePasswordHash = await bcrypt.hash('Employee@123', 10);

  // CEO
  let ceo = await EmployeeModel.findOne({ tenantId, employeeCode: 'EMP-001' });
  if (!ceo) {
    ceo = new EmployeeModel({
      tenantId,
      employeeCode: 'EMP-001',
      firstName: 'Kavinda',
      lastName: 'Perera',
      fullName: 'Kavinda Perera',
      email: 'admin@apexceylon.com',
      phone: '+94 77 111 2222',
      department: 'Executive',
      designation: 'Chief Executive Officer',
      nationalId: '198012345678',
      basicSalary: '850000.00',
      bankName: 'Commercial Bank of Ceylon',
      bankBranch: 'Colombo Main',
      bankAccountNumber: '8001122334455',
      bankAccountHolder: 'Kavinda Perera',
      employmentType: 'Permanent',
      status: 'Active',
      documents: [
        {
          id: 'doc-nic-01',
          documentType: 'National_ID',
          title: 'National Identity Card (Verified)',
          fileUrl: 'https://docs.apexceylon.lk/vault/nic-kavinda.pdf',
          isVerified: true,
          uploadedAt: new Date(),
        },
      ],
    });
    await ceo.save();
  }

  // SuperAdmin User
  await UserModel.findOneAndUpdate(
    { tenantId, email: 'admin@apexceylon.com' },
    {
      tenantId,
      email: 'admin@apexceylon.com',
      passwordHash: defaultPasswordHash,
      role: 'SuperAdmin',
      employeeProfileId: ceo._id,
      isActive: true,
    },
    { upsert: true }
  );

  // VP Engineering (Manager)
  let manager = await EmployeeModel.findOne({ tenantId, employeeCode: 'EMP-002' });
  if (!manager) {
    manager = new EmployeeModel({
      tenantId,
      employeeCode: 'EMP-002',
      firstName: 'Dulari',
      lastName: 'Fernando',
      fullName: 'Dulari Fernando',
      email: 'dulari@apexceylon.com',
      phone: '+94 71 333 4444',
      department: 'Engineering',
      designation: 'VP of Engineering',
      reportsTo: ceo._id,
      nationalId: '198855667788',
      basicSalary: '520000.00',
      bankName: 'Hatton National Bank',
      bankBranch: 'Head Office',
      bankAccountNumber: '003010998877',
      bankAccountHolder: 'Dulari Fernando',
      employmentType: 'Permanent',
      status: 'Active',
    });
    await manager.save();
  }

  await UserModel.findOneAndUpdate(
    { tenantId, email: 'dulari@apexceylon.com' },
    {
      tenantId,
      email: 'dulari@apexceylon.com',
      passwordHash: managerPasswordHash,
      role: 'Manager',
      employeeProfileId: manager._id,
      isActive: true,
    },
    { upsert: true }
  );

  // Senior Architect (Employee)
  let staff = await EmployeeModel.findOne({ tenantId, employeeCode: 'EMP-003' });
  if (!staff) {
    staff = new EmployeeModel({
      tenantId,
      employeeCode: 'EMP-003',
      firstName: 'Roshan',
      lastName: 'Silva',
      fullName: 'Roshan Silva',
      email: 'roshan@apexceylon.com',
      phone: '+94 76 555 6666',
      department: 'Engineering',
      designation: 'Lead Cloud Architect',
      reportsTo: manager._id,
      nationalId: '199488990011',
      basicSalary: '380000.00',
      bankName: 'Sampath Bank',
      bankBranch: 'Kollupitiya',
      bankAccountNumber: '100522334455',
      bankAccountHolder: 'Roshan Silva',
      employmentType: 'Permanent',
      status: 'Active',
    });
    await staff.save();
  }

  await UserModel.findOneAndUpdate(
    { tenantId, email: 'roshan@apexceylon.com' },
    {
      tenantId,
      email: 'roshan@apexceylon.com',
      passwordHash: employeePasswordHash,
      role: 'Employee',
      employeeProfileId: staff._id,
      isActive: true,
    },
    { upsert: true }
  );

  // 3. Seed Statutory Leave Policies & Balances
  await LeaveService.seedDefaultPolicies(tenantId);
  await LeaveService.initializeEmployeeBalances(tenantId, staff._id.toString());
  await LeaveService.initializeEmployeeBalances(tenantId, manager._id.toString());

  // 4. Seed Hardware Assets
  const assets = [
    {
      assetTag: 'AST-LP-1001',
      serialNumber: 'SN-MAC-M3-9901',
      name: 'Apple MacBook Pro 16" (M3 Max 64GB)',
      category: 'Laptop' as const,
      assignedTo: staff._id,
      status: 'Allocated' as const,
      estimatedValueLKR: 920000,
    },
    {
      assetTag: 'AST-LP-1002',
      serialNumber: 'SN-DELL-XPS-4432',
      name: 'Dell XPS 15 9530 (i9 32GB)',
      category: 'Laptop' as const,
      assignedTo: manager._id,
      status: 'Allocated' as const,
      estimatedValueLKR: 780000,
    },
    {
      assetTag: 'AST-MN-2001',
      serialNumber: 'SN-LG-4K-27-01',
      name: 'LG UltraFine 27" 4K Ergo Display',
      category: 'Monitor' as const,
      status: 'Available' as const,
      estimatedValueLKR: 185000,
    },
  ];

  for (const ast of assets) {
    await AssetModel.findOneAndUpdate({ tenantId, assetTag: ast.assetTag }, { ...ast, tenantId }, { upsert: true });
  }

  // 5. Run Initial Statutory Payroll
  const adminActor = {
    userId: ceo._id.toString(),
    tenantId,
    email: ceo.email,
    role: 'SuperAdmin',
  };
  await PayrollService.executePayrollRun(tenantId, 9, 2026, adminActor);

  console.log('✅ [Seeder] Demo organization seeded successfully!');
  console.log('   Admin credentials: admin@apexceylon.com / Admin@12345 (Tenant: apex-ceylon)');
  console.log('   Manager credentials: dulari@apexceylon.com / Manager@123');
  console.log('   Employee credentials: roshan@apexceylon.com / Employee@123');
}

if (require.main === module) {
  seedDemoDatabase()
    .then(() => disconnectDatabase())
    .catch((err) => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}
