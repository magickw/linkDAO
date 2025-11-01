import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { ldaoSupportService } from '../services/ldaoSupportService';

const router = Router();

router.get('/search',
  [
    query('q').isLength({ min: 2, max: 100 }).withMessage('Query must be 2-100 characters'),
    query('type').optional().isIn(['faq', 'tickets', 'all']).withMessage('Invalid type'),
    query('category').optional().isString(),
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { q, type = 'all', category } = req.query;
      const results: any = { faq: [], tickets: [] };

      if (type === 'faq' || type === 'all') {
        results.faq = await ldaoSupportService.searchFAQ(q, category);
      }

      if (type === 'tickets' || type === 'all') {
        if (req.user) {
          const tickets = await ldaoSupportService.getTicketsByUser(req.user.id);
          results.tickets = tickets.filter(t => 
            t.subject.toLowerCase().includes(q.toLowerCase()) ||
            t.description.toLowerCase().includes(q.toLowerCase())
          );
        }
      }

      res.json({
        success: true,
        data: results,
        query: q,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Search failed' });
    }
  }
);

export default router;
