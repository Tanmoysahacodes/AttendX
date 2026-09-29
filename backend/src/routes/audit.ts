import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, role: true } } },
    });
    const total = await prisma.auditLog.count();
    res.json({ success: true, data: logs, total, page, limit });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
