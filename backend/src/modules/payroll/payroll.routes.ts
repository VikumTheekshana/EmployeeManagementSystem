import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authenticate, authorize } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);

// Employee payslip history
router.get('/my-payslips', PayrollController.getMyPayslips);
router.get('/payslips/:id/pdf', PayrollController.downloadPDF);

// Admin / HR routes
router.post('/run', authorize('SuperAdmin', 'HRAdmin'), PayrollController.execute);
router.get('/runs', authorize('SuperAdmin', 'HRAdmin'), PayrollController.getRuns);
router.get('/runs/:id/payslips', authorize('SuperAdmin', 'HRAdmin'), PayrollController.getRunPayslips);
router.get('/runs/:id/slips-export', authorize('SuperAdmin', 'HRAdmin'), PayrollController.exportSLIPS);

export default router;
