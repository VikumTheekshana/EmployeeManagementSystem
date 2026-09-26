import { Router } from 'express';
import { LeaveController } from './leave.controller';
import { authenticate, authorize } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/apply', LeaveController.apply);
router.get('/my-balances', LeaveController.getMyBalances);
router.get('/requests', LeaveController.listRequests);
router.post('/requests/:id/review', authorize('SuperAdmin', 'HRAdmin', 'Manager'), LeaveController.review);

export default router;
