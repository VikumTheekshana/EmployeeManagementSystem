import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate, authorize } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/hierarchy/tree', EmployeeController.getHierarchyTree);
router.get('/documents/expiring', authorize('SuperAdmin', 'HRAdmin'), EmployeeController.getExpiringDocuments);
router.get('/', EmployeeController.getAll);
router.get('/:id', EmployeeController.getById);
router.post('/', authorize('SuperAdmin', 'HRAdmin'), EmployeeController.create);
router.put('/:id', authorize('SuperAdmin', 'HRAdmin'), EmployeeController.update);
router.post('/:id/documents', EmployeeController.addDocumentVaultItem);

export default router;
