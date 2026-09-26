import { Request, Response } from 'express';
import { LifecycleService } from './lifecycle.service';
import { AssetModel, OnboardingChecklistModel, OffboardingClearanceModel } from './lifecycle.model';

export class LifecycleController {
  // --- ASSETS ---
  public static async listAssets(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { category, status } = req.query;

      const query: any = { tenantId };
      if (category) query.category = category;
      if (status) query.status = status;

      const assets = await AssetModel.find(query)
        .populate('assignedTo', 'fullName employeeCode designation department')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({ success: true, count: assets.length, data: assets });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async registerAsset(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const asset = await LifecycleService.registerAsset({
        ...req.body,
        tenantId,
      });
      return res.status(201).json({ success: true, data: asset });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async allocateAsset(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { employeeId } = req.body;

      const asset = await LifecycleService.allocateAsset(tenantId, id, employeeId, req.user);
      return res.status(200).json({ success: true, message: 'Asset allocated', data: asset });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async returnAsset(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { condition = 'Good' } = req.body;

      const asset = await LifecycleService.returnAsset(tenantId, id, condition, req.user);
      return res.status(200).json({ success: true, message: 'Asset returned to inventory', data: asset });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // --- ONBOARDING ---
  public static async getOnboarding(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { employeeId } = req.params;

      const checklist = await LifecycleService.generateOnboardingChecklist(tenantId, employeeId);
      return res.status(200).json({ success: true, data: checklist });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async completeTask(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { employeeId } = req.params;
      const { taskId } = req.body;

      const updated = await LifecycleService.completeOnboardingTask(tenantId, employeeId, taskId);
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // --- OFFBOARDING ---
  public static async resign(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { employeeId, resignationDate, lastWorkingDate, reason } = req.body;

      const result = await LifecycleService.initiateResignation({
        tenantId,
        employeeId: employeeId || req.user!.employeeProfileId,
        resignationDate: new Date(resignationDate || Date.now()),
        lastWorkingDate: new Date(lastWorkingDate || Date.now()),
        reason: reason || 'Personal career progression',
        actor: req.user,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async listOffboardings(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const clearances = await OffboardingClearanceModel.find({ tenantId })
        .populate('employeeId', 'fullName employeeCode designation department email')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({ success: true, count: clearances.length, data: clearances });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async clearIT(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { notes } = req.body;

      const updated = await LifecycleService.clearITGate(tenantId, id, req.user, notes);
      return res.status(200).json({ success: true, message: 'IT clearance approved', data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async clearFinance(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { notes } = req.body;

      const updated = await LifecycleService.clearFinanceGate(tenantId, id, req.user, notes);
      return res.status(200).json({ success: true, message: 'Finance clearance approved with statutory gratuity', data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async clearHR(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { notes } = req.body;

      const updated = await LifecycleService.clearHRGate(tenantId, id, req.user, notes);
      return res.status(200).json({ success: true, message: 'HR exit completed and employee account closed', data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
