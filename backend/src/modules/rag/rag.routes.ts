import { Router } from 'express';
import { RAGController } from './rag.controller';
import { authenticate } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/ask', RAGController.ask);
router.get('/policies', RAGController.listPolicies);

export default router;
