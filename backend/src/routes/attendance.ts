import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Helper: parse a YYYY-MM-DD string into a UTC midnight Date
// This ensures date stored in Neon (@db.Date) matches what the frontend sends
function parseDate(dateStr: string): Date {
  // dateStr like "2026-09-29" → 2026-09-29T00:00:00.000Z
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Helper to get today's date as a YYYY-MM-DD string in the local/server time
// Then parse it as UTC midnight so it matches Neon @db.Date storage
function todayDate(): Date {
  const now = new Date();
  // Format as local YYYY-MM-DD
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return parseDate(`${y}-${m}-${d}`);
}

// ─── Get today's session ──────────────────────────────────────────────────────
router.get('/session/today', requireAuth, async (req, res) => {
  try {
    const today = todayDate();
    const session = await prisma.attendanceSession.findFirst({
      where: { date: today },
      include: {
        records: {
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, position: true, role: true, status: true } },
            markedBy: { select: { id: true, name: true, role: true } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
      },
    });
    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create session (explicit) ────────────────────────────────────────────────
router.post('/sessions', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, sessionType, title, notes, location, startTime } = z.object({
      date: z.string().optional(),
      sessionType: z.enum(['PRACTICE', 'MATCH', 'TOURNAMENT', 'FITNESS', 'MEETING', 'OTHER']).default('PRACTICE'),
      title: z.string().optional(),
      notes: z.string().optional(),
      location: z.string().optional(),
      startTime: z.string().optional(),
    }).parse(req.body);

    const sessionDate = date ? parseDate(date) : todayDate();

    const existing = await prisma.attendanceSession.findFirst({ where: { date: sessionDate } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A session already exists for this date.', data: existing });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        date: sessionDate,
        sessionType,
        title: title || undefined,
        notes: notes || undefined,
        location: location || undefined,
        startTime: startTime || undefined,
        status: 'OPEN',
        createdById: req.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        records: true,
      },
    });

    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Get all sessions ─────────────────────────────────────────────────────────
router.get('/sessions', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      orderBy: { date: 'desc' },
      include: {
        records: true,
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
      },
    });
    const result = sessions.map((s) => ({
      ...s,
      presentCount: s.records.filter(r => r.status === 'PRESENT').length,
      absentCount: s.records.filter(r => r.status === 'ABSENT').length,
      totalMarked: s.records.length,
      attendancePct: s.records.length > 0
        ? Math.round((s.records.filter(r => r.status === 'PRESENT').length / s.records.length) * 100)
        : null,
    }));
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get single session ───────────────────────────────────────────────────────
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    // Players can only check own attendance; staff can see all
    const session = await prisma.attendanceSession.findUnique({
      where: { id: req.params.id },
      include: {
        records: {
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, position: true, role: true, status: true } },
            markedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { player: { jerseyNumber: 'asc' } },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
      },
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // If player role, filter to own record
    if (req.user.role === 'PLAYER') {
      const ownRecord = session.records.filter(r => r.playerId === req.user.id);
      return res.json({ success: true, data: { ...session, records: ownRecord } });
    }

    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Mark/update attendance ───────────────────────────────────────────────────
router.post('/mark', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, sessionId, records, finalize } = z.object({
      date: z.string().optional(),
      sessionId: z.string().optional(),
      finalize: z.boolean().default(false),
      records: z.array(z.object({
        playerId: z.string(),
        status: z.enum(['PRESENT', 'ABSENT']),
      })),
    }).parse(req.body);

    let session;

    if (sessionId) {
      session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    } else {
      const sessionDate = date ? parseDate(date) : todayDate();
      session = await prisma.attendanceSession.findFirst({ where: { date: sessionDate } });

      if (!session) {
        session = await prisma.attendanceSession.create({
          data: { date: sessionDate, status: 'OPEN', createdById: req.user.id },
        });
      }
    }

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.status === 'DAY_OFF') return res.status(400).json({ success: false, message: 'Cannot mark attendance for a Day Off session.' });
    // Finalized sessions: only ADMIN can update
    if (session.status === 'FINALIZED' && req.user.role !== 'ADMIN' && req.user.role !== 'COACH' && req.user.role !== 'SPORTS_OFFICER') {
      return res.status(403).json({ success: false, message: 'Session is finalized. Only Admin/Coach/Sports Officer can update.' });
    }

    // Upsert all records
    await prisma.$transaction(
      records.map(r =>
        prisma.attendanceRecord.upsert({
          where: { sessionId_playerId: { sessionId: session!.id, playerId: r.playerId } },
          create: { sessionId: session!.id, playerId: r.playerId, status: r.status, markedById: req.user.id },
          update: { status: r.status, markedById: req.user.id, markedAt: new Date() },
        })
      )
    );

    // Finalize if requested
    const newStatus = finalize ? 'FINALIZED' : (session.status === 'FINALIZED' ? 'FINALIZED' : 'OPEN');
    const updatedSession = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: newStatus,
        ...(finalize ? { finalizedById: req.user.id, finalizedAt: new Date() } : {}),
      },
      include: {
        records: {
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, position: true, role: true, status: true } },
            markedBy: { select: { id: true, name: true, role: true } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: finalize ? 'ATTENDANCE_FINALIZED' : 'ATTENDANCE_MARKED',
        entityType: 'SESSION',
        entityId: session.id,
        metadata: { date: session.date, count: records.length, finalized: finalize },
      },
    });

    res.json({ success: true, data: updatedSession, message: finalize ? 'Attendance finalized.' : 'Attendance saved.' });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Finalize session ─────────────────────────────────────────────────────────
router.post('/sessions/:id/finalize', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const session = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { status: 'FINALIZED', finalizedById: req.user.id, finalizedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'ATTENDANCE_FINALIZED', entityType: 'SESSION', entityId: session.id },
    });
    res.json({ success: true, message: 'Session finalized.', data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Reopen session (for updates) ────────────────────────────────────────────
router.post('/sessions/:id/reopen', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const session = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { status: 'OPEN' },
    });
    res.json({ success: true, message: 'Session reopened for update.', data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Mark Day Off ─────────────────────────────────────────────────────────────
router.post('/sessions/:id/dayoff', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { reason } = z.object({
      reason: z.string().min(1, 'Day off reason is required'),
    }).parse(req.body);

    const session = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { status: 'DAY_OFF', dayOffReason: reason, finalizedById: req.user.id, finalizedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DAY_OFF_MARKED', entityType: 'SESSION', entityId: session.id, metadata: { reason } },
    });

    res.json({ success: true, message: 'Marked as Day Off.', data: session });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Create Day Off (without existing session) ────────────────────────────────
router.post('/dayoff', requireAuth, requireRole('COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, reason } = z.object({
      date: z.string().optional(),
      reason: z.string().min(1, 'Reason is required'),
    }).parse(req.body);

    const sessionDate = date ? parseDate(date) : todayDate();

    const existing = await prisma.attendanceSession.findFirst({ where: { date: sessionDate } });
    if (existing) {
      // Update existing to DAY_OFF
      const updated = await prisma.attendanceSession.update({
        where: { id: existing.id },
        data: { status: 'DAY_OFF', dayOffReason: reason, finalizedById: req.user.id, finalizedAt: new Date() },
      });
      return res.json({ success: true, data: updated, message: 'Day Off recorded.' });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        date: sessionDate,
        status: 'DAY_OFF',
        dayOffReason: reason,
        createdById: req.user.id,
        finalizedById: req.user.id,
        finalizedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DAY_OFF_MARKED', entityType: 'SESSION', entityId: session.id, metadata: { reason, date: sessionDate } },
    });

    res.json({ success: true, data: session, message: 'Day Off recorded.' });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

export default router;
