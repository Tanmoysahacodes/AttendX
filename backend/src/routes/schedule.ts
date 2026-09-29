import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Get all schedule events ──────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const events = await prisma.scheduleEvent.findMany({
      orderBy: { date: 'asc' },
      include: { createdBy: { select: { name: true, role: true } } },
    });
    res.json({ success: true, data: events });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get upcoming events ─────────────────────────────────────────────────────
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const events = await prisma.scheduleEvent.findMany({
      where: { date: { gte: today } },
      orderBy: { date: 'asc' },
      take: 5,
      include: { createdBy: { select: { name: true, role: true } } },
    });
    res.json({ success: true, data: events });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create event (Coach/Admin) ───────────────────────────────────────────────
router.post('/', requireAuth, requireRole('COACH', 'ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      type: z.enum(['PRACTICE', 'MATCH', 'TOURNAMENT', 'FITNESS', 'MEETING', 'OTHER']).default('PRACTICE'),
      date: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const event = await prisma.scheduleEvent.create({
      data: { ...data, date: new Date(data.date), createdById: req.user.id },
      include: { createdBy: { select: { name: true, role: true } } },
    });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'EVENT_CREATED', entityType: 'EVENT', entityId: event.id, metadata: { title: event.title } } });
    res.json({ success: true, data: event });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Delete event ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('COACH', 'ADMIN'), async (req, res) => {
  try {
    await prisma.scheduleEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
