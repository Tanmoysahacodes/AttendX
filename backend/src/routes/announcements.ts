import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Get all announcements ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true, role: true } } },
    });
    res.json({ success: true, data: announcements });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create announcement (Coach/Admin) ────────────────────────────────────────
router.post('/', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    }).parse(req.body);

    const ann = await prisma.announcement.create({
      data: { ...data, createdById: req.user.id },
      include: { createdBy: { select: { name: true, role: true } } },
    });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'ANNOUNCEMENT_CREATED', entityType: 'ANNOUNCEMENT', entityId: ann.id } });
    res.json({ success: true, data: ann });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Delete announcement ──────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
