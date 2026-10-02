import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const safe = (u: any) => { const { passwordHash: _, ...rest } = u; return rest; };

// ─── Get all players ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const players = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { in: ['PLAYER', 'CAPTAIN'] } },
          { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }] }
        ]
      },
      orderBy: [{ jerseyNumber: 'asc' }],
    });
    // Only count FINALIZED sessions (not DAY_OFF) for %
    const sessionCount = await prisma.attendanceSession.count({ where: { status: 'FINALIZED' } });
    const result = await Promise.all(players.map(async (p) => {
      const presentCount = sessionCount > 0
        ? await prisma.attendanceRecord.count({ where: { playerId: p.id, status: 'PRESENT', session: { status: 'FINALIZED' } } })
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
    const player = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    // Only FINALIZED (not DAY_OFF) sessions count
    const sessionCount = await prisma.attendanceSession.count({ where: { status: 'FINALIZED' } });
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
      jerseyNumber: z.string().min(1),
      position: z.string().optional(),
      description: z.string().optional(),
      year: z.string().optional(),
      course: z.string().optional(),
      phone: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.user.findFirst({ where: { jerseyNumber: data.jerseyNumber } });
    if (existing) return res.status(400).json({ success: false, message: `Jersey number ${data.jerseyNumber} is already taken by ${existing.name}.` });

    const player = await prisma.user.create({ data: { ...data, role: 'PLAYER', status: 'ACTIVE' } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAYER_ADDED', entityType: 'USER', entityId: player.id, metadata: { name: player.name, jerseyNumber: player.jerseyNumber } } });
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
      jerseyNumber: z.string().min(1).optional(),
      position: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      year: z.string().nullable().optional(),
      course: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    }).parse(req.body);

    if (data.jerseyNumber) {
      const existing = await prisma.user.findFirst({ where: { jerseyNumber: data.jerseyNumber, NOT: { id: req.params.id } } });
      if (existing) return res.status(400).json({ success: false, message: `Jersey number ${data.jerseyNumber} is already taken.` });
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

// ─── Get own attendance (for any authenticated user) ─────────────────────────
router.get('/:id/attendance', requireAuth, async (req, res) => {
  try {
    // Players can only view their own
    if (req.user.role === 'PLAYER' && req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const records = await prisma.attendanceRecord.findMany({
      where: { playerId: req.params.id },
      include: { session: { select: { id: true, date: true, sessionType: true, status: true, dayOffReason: true } }, markedBy: { select: { name: true, role: true } } },
    });
    const dayOffSessions = await prisma.attendanceSession.findMany({
      where: { status: 'DAY_OFF' },
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


// ─── CSV export for players ──────────────────────────────────────────────────
router.get('/export/csv', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const playersList = await prisma.user.findMany({
      where: { role: { in: ['PLAYER', 'CAPTAIN'] } },
      orderBy: { name: 'asc' }
    });

    const header = 'Name,Jersey Number,Position,Year,Course,Phone,Role,Status,Attendance %';
    const rows = playersList.map(p => [
      p.name,
      p.jerseyNumber || '',
      p.position || '',
      p.year || '',
      p.course || '',
      p.phone || '',
      p.role,
      p.status,
      '' // we could fetch attendance % here, but omitting for speed/simplicity
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="players.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
