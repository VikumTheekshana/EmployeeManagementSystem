import { Router } from 'express';
import { LifecycleController } from './lifecycle.controller';
import { authenticate, authorize } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);

// Assets
router.get('/assets', LifecycleController.listAssets);
router.post('/assets', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.registerAsset);
router.post('/assets/:id/allocate', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.allocateAsset);
router.post('/assets/:id/return', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.returnAsset);

// Onboarding
router.get('/onboarding/:employeeId', LifecycleController.getOnboarding);
router.post('/onboarding/:employeeId/complete-task', LifecycleController.completeTask);

// Offboarding
router.post('/offboarding/resign', LifecycleController.resign);
router.get('/offboarding', authorize('SuperAdmin', 'HRAdmin', 'Manager'), LifecycleController.listOffboardings);
router.post('/offboarding/:id/it-gate', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.clearIT);
router.post('/offboarding/:id/finance-gate', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.clearFinance);
router.post('/offboarding/:id/hr-gate', authorize('SuperAdmin', 'HRAdmin'), LifecycleController.clearHR);

export default router;
