import { Request, Response } from 'express';
import { RAGService } from './rag.service';

export class RAGController {
  /**
   * Queries internal HR policy knowledge base
   */
  public static async ask(req: Request, res: Response) {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: 'Question is required' });
      }

      const response = RAGService.query(question);
      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Lists indexed policies
   */
  public static async listPolicies(req: Request, res: Response) {
    try {
      const policies = RAGService.listPolicies();
      return res.status(200).json({
        success: true,
        data: policies,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
