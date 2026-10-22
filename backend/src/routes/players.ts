import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const safe = (u: any) => { const { passwordHash: _, ...rest } = u; return rest; };

// Helper: get squadId to use for this request, with permission checks
async function resolveSquadId(req: any, res: any): Promise<string | null | undefined> {
  const role = req.user.role;

  if (role === 'PLAYER') {
    // Players are always scoped to their own squad
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
    return me?.squadId;
  }

  if (role === 'CAPTAIN') {
    // Captains can only access their own squad
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
    return me?.squadId;
  }

  if (role === 'COACH') {
    // Coach: access only to their assigned squad's players
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
    if (me?.squadId) {
      return me.squadId;
    }
    const squadId = (req.query.squadId || req.headers['x-squad-id']) as string | undefined;
    return squadId || undefined;
  }

  // Admin and Sports Officer — use squadId from query param or header
  const squadId = (req.query.squadId || req.headers['x-squad-id']) as string | undefined;
  return squadId || undefined; // undefined means no filter (show all for admin / sports officer)
}

// ─── Get all players (strictly scoped by role) ──────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const role = req.user.role;

    // Strict RBAC: Players can ONLY access their own player profile
    if (role === 'PLAYER') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          squad: { include: { category: { include: { sport: true } } } },
        },
      });
      if (!me) return res.json({ success: true, data: [] });

      const squadFilter = me.squadId ? { squadId: me.squadId } : {};
      const sessionCount = await prisma.attendanceSession.count({ where: { status: 'FINALIZED', ...squadFilter } });
      const recordWhere: any = { playerId: me.id, status: 'PRESENT', session: { status: 'FINALIZED' } };
      if (me.squadId) recordWhere.session.squadId = me.squadId;
      const presentCount = sessionCount > 0 ? await prisma.attendanceRecord.count({ where: recordWhere }) : 0;
      const attendancePct = sessionCount > 0 ? Math.round((presentCount / sessionCount) * 100) : null;

      return res.json({
        success: true,
        data: [{ ...safe(me), attendancePct, presentCount, totalSessions: sessionCount }],
      });
    }

    const squadId = await resolveSquadId(req, res);

    // For ADMIN / SPORTS_OFFICER without a squadId filter, return all players
    const whereClause: any = {
      OR: [
        { role: { in: ['PLAYER', 'CAPTAIN'] } },
        { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }] }
      ]
    };

    if (squadId !== undefined) {
      whereClause.squadId = squadId;
    }

    const players = await prisma.user.findMany({
      where: whereClause,
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      include: {
        squad: { include: { category: { include: { sport: true } } } },
      },
    });

    // Scope session counts to the squad
    const sessionWhere: any = { status: 'FINALIZED' };
    if (squadId !== undefined) sessionWhere.squadId = squadId;
    const sessionCount = await prisma.attendanceSession.count({ where: sessionWhere });

    const result = await Promise.all(players.map(async (p) => {
      const recordWhere: any = { playerId: p.id, status: 'PRESENT', session: { status: 'FINALIZED' } };
      if (squadId !== undefined) recordWhere.session.squadId = squadId;
      const presentCount = sessionCount > 0
        ? await prisma.attendanceRecord.count({ where: recordWhere })
        : 0;
      const attendancePct = sessionCount > 0 ? Math.round((presentCount / sessionCount) * 100) : null;
      return { ...safe(p), attendancePct, presentCount, totalSessions: sessionCount };
    }));

    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get single player ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const player = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { squad: { include: { category: { include: { sport: true } } } } },
    });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    // Players can only view their own profile
    if (req.user.role === 'PLAYER' && req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own profile.' });
    }

    // Captains can only view players in their own squad
    if (req.user.role === 'CAPTAIN') {
      const captain = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (captain?.squadId && player.squadId !== captain.squadId) {
        return res.status(403).json({ success: false, message: 'Access denied. Player belongs to another squad.' });
      }
    }

    // Coaches can only view players in their assigned squad
    if (req.user.role === 'COACH') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (coach?.squadId && player.squadId !== coach.squadId) {
        return res.status(403).json({ success: false, message: 'Access denied. Player belongs to another squad.' });
      }
    }

    const squadFilter = player.squadId ? { squadId: player.squadId } : {};
    const sessionCount = await prisma.attendanceSession.count({ where: { status: 'FINALIZED', ...squadFilter } });
    const presentCount = await prisma.attendanceRecord.count({ where: { playerId: player.id, status: 'PRESENT', session: { status: 'FINALIZED' } } });
    const absentCount = await prisma.attendanceRecord.count({ where: { playerId: player.id, status: 'ABSENT', session: { status: 'FINALIZED' } } });
    const attendancePct = sessionCount > 0 ? Math.round((presentCount / sessionCount) * 100) : null;

    // Streak
    const records = await prisma.attendanceRecord.findMany({
      where: { playerId: player.id, session: { status: 'FINALIZED' } },
      include: { session: true },
      orderBy: { session: { date: 'desc' } },
    });
    let currentStreak = 0, bestStreak = 0, streak = 0;
    for (const r of records) {
      if (r.status === 'PRESENT') { streak++; bestStreak = Math.max(bestStreak, streak); }
      else streak = 0;
    }
    currentStreak = 0;
    for (const r of records) {
      if (r.status === 'PRESENT') { currentStreak++; } else break;
    }

    res.json({ success: true, data: { ...safe(player), presentCount, absentCount, totalSessions: sessionCount, attendancePct, currentStreak, bestStreak } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Add player (Admin only) ──────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      systemId: z.string().min(1),
      squadId: z.string().optional(),
      jerseyNumber: z.string().nullable().optional(), // optional, not required
      position: z.string().optional(),
      description: z.string().optional(),
      year: z.string().optional(),
      course: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }).parse(req.body);

    const targetSquadId = data.squadId || (req.headers['x-squad-id'] as string) || (req.query.squadId as string);

    // Check systemId uniqueness (globally unique)
    if (data.systemId) {
      const existing = await prisma.user.findUnique({ where: { systemId: data.systemId } });
      if (existing) return res.status(400).json({ success: false, message: `System ID ${data.systemId} is already registered to ${existing.name}.` });
    }

    // Validate squad exists if provided
    if (targetSquadId) {
      const squad = await prisma.squad.findUnique({ where: { id: targetSquadId } });
      if (!squad) return res.status(400).json({ success: false, message: 'Invalid squad selected.' });
    }

    const player = await prisma.user.create({
      data: {
        ...data,
        squadId: targetSquadId || null,
        jerseyNumber: data.jerseyNumber || null,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PLAYER_ADDED',
        entityType: 'USER',
        entityId: player.id,
        metadata: { name: player.name, systemId: player.systemId, squadId: targetSquadId },
      },
    });
    res.json({ success: true, data: safe(player) });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Edit player (Admin only) ─────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      systemId: z.string().nullable().optional(),
      jerseyNumber: z.string().nullable().optional(), // optional, can be cleared
      position: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      year: z.string().nullable().optional(),
      course: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      squadId: z.string().nullable().optional(),
    }).parse(req.body);

    if (data.systemId) {
      const existing = await prisma.user.findFirst({
        where: { systemId: data.systemId, id: { not: req.params.id } }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `System ID ${data.systemId} is already in use by ${existing.name}.` });
      }
    }

    const player = await prisma.user.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAYER_UPDATED', entityType: 'USER', entityId: player.id } });
    res.json({ success: true, data: safe(player) });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Deactivate player ────────────────────────────────────────────────────────
router.post('/:id/deactivate', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const player = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAYER_DEACTIVATED', entityType: 'USER', entityId: player.id } });
    res.json({ success: true, message: `${player.name} has been deactivated.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Reactivate player ────────────────────────────────────────────────────────
router.post('/:id/reactivate', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const player = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAYER_REACTIVATED', entityType: 'USER', entityId: player.id } });
    res.json({ success: true, message: `${player.name} has been reactivated.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Hard delete player (Admin only) ─────────────────────────────────────────
// Removes player and ALL their attendance records permanently.
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const player = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    if (['ADMIN', 'SPORTS_OFFICER'].includes(player.role)) {
      return res.status(400).json({ success: false, message: 'Staff accounts cannot be deleted from this endpoint.' });
    }

    // Delete attendance records first (FK constraint)
    await prisma.attendanceRecord.deleteMany({ where: { playerId: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'PLAYER_DELETED', entityType: 'USER', entityId: req.params.id, metadata: { name: player.name, systemId: player.systemId } },
    });
    res.json({ success: true, message: `${player.name} has been permanently deleted.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get own attendance (for any authenticated user) ─────────────────────────
router.get('/:id/attendance', requireAuth, async (req, res) => {
  try {
    // Players can only view their own
    if (req.user.role === 'PLAYER' && req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own attendance.' });
    }

    // Get player's squad to scope DAY_OFF sessions
    const player = await prisma.user.findUnique({ where: { id: req.params.id }, select: { squadId: true } });

    // Captains can only view attendance for players in their own squad
    if (req.user.role === 'CAPTAIN') {
      const captain = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (captain?.squadId && player?.squadId !== captain.squadId) {
        return res.status(403).json({ success: false, message: 'Access denied. Player belongs to another squad.' });
      }
    }

    // Coaches can only view attendance for players in their assigned squad
    if (req.user.role === 'COACH') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (coach?.squadId && player?.squadId !== coach.squadId) {
        return res.status(403).json({ success: false, message: 'Access denied. Player belongs to another squad.' });
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { playerId: req.params.id },
      include: { session: { select: { id: true, date: true, sessionType: true, status: true, dayOffReason: true, squadId: true } }, markedBy: { select: { name: true, role: true } } },
    });

    const dayOffWhere: any = { status: 'DAY_OFF' };
    if (player?.squadId) dayOffWhere.squadId = player.squadId;

    const dayOffSessions = await prisma.attendanceSession.findMany({
      where: dayOffWhere,
      select: { id: true, date: true, sessionType: true, status: true, dayOffReason: true, finalizedBy: { select: { name: true, role: true } } }
    });

    const combined = [
      ...records,
      ...dayOffSessions.map(session => ({
        id: `dayoff-${session.id}`,
        playerId: req.params.id,
        status: 'DAY_OFF',
        session: { id: session.id, date: session.date, sessionType: session.sessionType, status: session.status, dayOffReason: session.dayOffReason },
        markedBy: session.finalizedBy || { name: 'System', role: 'ADMIN' }
      }))
    ];
    combined.sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());
    res.json({ success: true, data: combined });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── CSV export for players (squad-scoped) ────────────────────────────────────
router.get('/export/csv', requireAuth, requireRole('ADMIN', 'COACH', 'SPORTS_OFFICER'), async (req, res) => {
  try {
    let squadId = req.query.squadId as string | undefined;

    // Coaches can only export players in their assigned squad
    if (req.user.role === 'COACH') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { squadId: true } });
      if (coach?.squadId) squadId = coach.squadId;
    }

    const whereClause: any = { role: { in: ['PLAYER', 'CAPTAIN'] } };
    if (squadId) whereClause.squadId = squadId;

    const playersList = await prisma.user.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: { squad: { include: { category: { include: { sport: true } } } } },
    });

    const header = 'Name,System ID,Jersey Number,Position,Year,Course,Email,Phone,Role,Status,Squad,Sport';
    const rows = playersList.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.systemId || '',
      p.jerseyNumber || '',
      p.position || '',
      p.year || '',
      p.course || '',
      p.email || '',
      p.phone || '',
      p.role,
      p.status,
      p.squad?.name || '',
      p.squad?.category?.sport?.name || '',
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="players${squadId ? '-' + squadId : ''}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
