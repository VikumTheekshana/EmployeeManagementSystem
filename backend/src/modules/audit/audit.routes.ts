import { Router, Request, Response } from 'express';
import { AuditService } from '../../core/audit/audit.service';
import { authenticate, authorize } from '../../core/security/rbac.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('SuperAdmin', 'HRAdmin'));

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { action, limit, skip } = req.query;

    const result = await AuditService.query(tenantId, {
      action: action as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      skip: skip ? parseInt(skip as string, 10) : 0,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
