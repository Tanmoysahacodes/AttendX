import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Helper: parse a YYYY-MM-DD string into a UTC midnight Date
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Helper to get today as UTC midnight
function todayDate(): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return parseDate(`${y}-${m}-${d}`);
}

// Helper: resolve squadId from request context
// - Players and Captains are always scoped to their own squad
// - Coaches with assigned squad are scoped to their squad
// - Admin/Sports Officer use query param or x-squad-id header
async function resolveSquadId(req: any): Promise<string | undefined> {
  const role = req.user.role;
  if (role === 'PLAYER' || role === 'CAPTAIN') {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
    return me?.squadId ?? undefined;
  }
  if (role === 'COACH') {
    const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
    if (coach?.squadId) return coach.squadId;
  }
  const squadId = (req.query.squadId || req.headers['x-squad-id']) as string | undefined;
  return squadId;
}

// ─── Get today's session (squad-scoped) ──────────────────────────────────────
router.get('/session/today', requireAuth, async (req, res) => {
  try {
    const today = todayDate();
    const squadId = await resolveSquadId(req);

    const session = await prisma.attendanceSession.findFirst({
      where: { date: today, squadId: squadId ?? undefined },
      include: {
        records: {
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, position: true, role: true, status: true } },
            markedBy: { select: { id: true, name: true, role: true } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
        squad: { include: { category: { include: { sport: true } } } },
      },
    });

    if (session && req.user.role === 'PLAYER') {
      session.records = session.records.filter((r: any) => r.playerId === req.user.id);
    }

    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create session (squad-scoped) ────────────────────────────────────────────
router.post('/sessions', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, sessionType, title, notes, location, startTime, squadId: bodySquadId } = z.object({
      date: z.string().optional(),
      sessionType: z.enum(['PRACTICE', 'MATCH', 'TOURNAMENT', 'FITNESS', 'MEETING', 'OTHER']).default('PRACTICE'),
      title: z.string().optional(),
      notes: z.string().optional(),
      location: z.string().optional(),
      startTime: z.string().optional(),
      squadId: z.string().optional(),
    }).parse(req.body);

    const resolvedSquadId = await resolveSquadId(req);
    const squadId = resolvedSquadId ?? bodySquadId;

    if (!squadId) {
      return res.status(400).json({ success: false, message: 'squadId is required. Select a squad first.' });
    }

    // Validate squad and permissions
    const squad = await prisma.squad.findUnique({ where: { id: squadId }, include: { category: { include: { sport: true } } } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found.' });
    if (!squad.isActive) return res.status(400).json({ success: false, message: 'Cannot create a session for an inactive squad.' });

    // Captain can only create sessions in their own squad
    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== squadId) return res.status(403).json({ success: false, message: 'Captains can only manage their own squad.' });
    }

    const sessionDate = date ? parseDate(date) : todayDate();

    const existing = await prisma.attendanceSession.findFirst({ where: { date: sessionDate, squadId } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A session already exists for this squad on this date.', data: existing });
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
        squadId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        records: true,
        squad: { include: { category: { include: { sport: true } } } },
      },
    });

    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Get all sessions (squad-scoped) ─────────────────────────────────────────
router.get('/sessions', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const squadId = await resolveSquadId(req);

    const sessions = await prisma.attendanceSession.findMany({
      where: { squadId: squadId ?? undefined },
      orderBy: { date: 'desc' },
      include: {
        records: true,
        createdBy: { select: { id: true, name: true, role: true } },
        finalizedBy: { select: { id: true, name: true, role: true } },
        squad: { include: { category: { include: { sport: true } } } },
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
        squad: { include: { category: { include: { sport: true } } } },
      },
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Captain access check
    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== session.squadId) return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Coach access check (if coach is assigned to a squad)
    if (req.user.role === 'COACH') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (coach?.squadId && session.squadId && coach.squadId !== session.squadId) {
        return res.status(403).json({ success: false, message: 'Access denied. Session belongs to another squad.' });
      }
    }

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

// ─── Mark/update attendance (squad-scoped) ────────────────────────────────────
router.post('/mark', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, sessionId, records, finalize, squadId: bodySquadId } = z.object({
      date: z.string().optional(),
      sessionId: z.string().optional(),
      finalize: z.boolean().default(false),
      squadId: z.string().optional(),
      records: z.array(z.object({
        playerId: z.string(),
        status: z.enum(['PRESENT', 'ABSENT']),
      })),
    }).parse(req.body);

    let session: any;

    if (sessionId) {
      session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    } else {
      const resolvedSquadId = await resolveSquadId(req);
      const squadId = resolvedSquadId ?? bodySquadId;

      if (!squadId) {
        return res.status(400).json({ success: false, message: 'squadId is required. Select a squad first.' });
      }

      const sessionDate = date ? parseDate(date) : todayDate();
      session = await prisma.attendanceSession.findFirst({ where: { date: sessionDate, squadId } });

      if (!session) {
        session = await prisma.attendanceSession.create({
          data: { date: sessionDate, status: 'OPEN', createdById: req.user.id, squadId },
        });
      }
    }

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    // Captain access check
    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== session.squadId) return res.status(403).json({ success: false, message: 'Captains can only manage their own squad.' });
    }

    if (session.status === 'DAY_OFF') return res.status(400).json({ success: false, message: 'Cannot mark attendance for a Day Off session.' });
    if (session.status === 'FINALIZED' && req.user.role !== 'ADMIN' && req.user.role !== 'COACH' && req.user.role !== 'SPORTS_OFFICER') {
      return res.status(403).json({ success: false, message: 'Session is finalized. Only Admin/Coach/Sports Officer can update.' });
    }

    // Validate all players belong to the session's squad
    for (const r of records) {
      const player = await prisma.user.findUnique({ where: { id: r.playerId }, select: { squadId: true } });
      if (!player) return res.status(400).json({ success: false, message: `Player ${r.playerId} not found.` });
      if (session.squadId && player.squadId !== session.squadId) {
        return res.status(400).json({ success: false, message: `Player ${r.playerId} does not belong to this squad.` });
      }
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
        squad: { include: { category: { include: { sport: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: finalize ? 'ATTENDANCE_FINALIZED' : 'ATTENDANCE_MARKED',
        entityType: 'SESSION',
        entityId: session.id,
        metadata: { date: session.date, count: records.length, finalized: finalize, squadId: session.squadId },
      },
    });

    res.json({ success: true, data: updatedSession, message: finalize ? 'Attendance finalized.' : 'Attendance saved.' });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Finalize session ─────────────────────────────────────────────────────────
router.post('/sessions/:id/finalize', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.attendanceSession.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Session not found.' });

    // Captain access check
    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== existing.squadId) return res.status(403).json({ success: false, message: 'Captains can only manage their own squad.' });
    }

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

// ─── Reopen session ────────────────────────────────────────────────────────────
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

// ─── Mark Day Off (on existing session) ──────────────────────────────────────
router.post('/sessions/:id/dayoff', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { reason } = z.object({
      reason: z.string().min(1, 'Day off reason is required'),
    }).parse(req.body);

    const existing = await prisma.attendanceSession.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Session not found.' });

    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== existing.squadId) return res.status(403).json({ success: false, message: 'Captains can only manage their own squad.' });
    }

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
router.post('/dayoff', requireAuth, requireRole('CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { date, reason, squadId: bodySquadId } = z.object({
      date: z.string().optional(),
      reason: z.string().min(1, 'Reason is required'),
      squadId: z.string().optional(),
    }).parse(req.body);

    const resolvedSquadId = await resolveSquadId(req);
    const squadId = resolvedSquadId ?? bodySquadId;

    if (!squadId) {
      return res.status(400).json({ success: false, message: 'squadId is required.' });
    }

    // Captain access check
    if (req.user.role === 'CAPTAIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (me?.squadId !== squadId) return res.status(403).json({ success: false, message: 'Captains can only manage their own squad.' });
    }

    const sessionDate = date ? parseDate(date) : todayDate();

    const existing = await prisma.attendanceSession.findFirst({ where: { date: sessionDate, squadId } });
    if (existing) {
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
        squadId,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DAY_OFF_MARKED', entityType: 'SESSION', entityId: session.id, metadata: { reason, date: sessionDate, squadId } },
    });

    res.json({ success: true, data: session, message: 'Day Off recorded.' });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

export default router;
