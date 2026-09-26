import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/security/rbac.middleware';

const router = Router();

router.post('/register-org', AuthController.registerOrganization);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.get('/me', authenticate, AuthController.me);
router.post('/logout', authenticate, AuthController.logout);

export default router;
