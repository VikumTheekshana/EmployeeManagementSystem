import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../core/security/rbac.middleware';

const router = Router();

// Biometric webhook does not require user cookie, uses API authentication/tenant payload
router.post('/biometric-webhook', AttendanceController.biometricWebhook);

// Protected routes
router.use(authenticate);

router.get('/generate-qr', AttendanceController.generateQR);
router.post('/check-in', AttendanceController.checkIn);
router.post('/check-out', AttendanceController.checkOut);
router.get('/today', AttendanceController.getToday);
router.get('/history', AttendanceController.getHistory);

export default router;
