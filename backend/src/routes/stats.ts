import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Helper: resolve squadId from request
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
  return (req.query.squadId || req.headers['x-squad-id']) as string | undefined;
}

// ─── Overall Sports Society stats (Admin only) ────────────────────────────────
router.get('/overall', requireAuth, requireRole('ADMIN', 'SPORTS_OFFICER'), async (req, res) => {
  try {
    const sports = await prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        categories: {
          where: { isActive: true },
          include: {
            squads: {
              where: { isActive: true },
              include: {
                _count: { select: { players: { where: { status: 'ACTIVE', role: { in: ['PLAYER', 'CAPTAIN'] } } } } },
                sessions: { where: { status: 'FINALIZED' }, select: { id: true, records: { select: { status: true } } } },
              },
            },
          },
        },
      },
    });

    const totalSports = sports.length;
    const totalSquads = sports.reduce((a, s) => a + s.categories.reduce((b, c) => b + c.squads.length, 0), 0);
    const totalPlayers = sports.reduce((a, s) => a + s.categories.reduce((b, c) => b + c.squads.reduce((d, sq) => d + sq._count.players, 0), 0), 0);

    let totalFinalizedSessions = 0;
    let totalPresent = 0;
    let totalPossible = 0;

    const sportSummaries = sports.map(sport => {
      const sportPlayers = sport.categories.reduce((a, c) => a + c.squads.reduce((b, sq) => b + sq._count.players, 0), 0);
      let sportPresent = 0;
      let sportFinalized = 0;

      const categorySummaries = sport.categories.map(cat => {
        return {
          id: cat.id,
          name: cat.name,
          squads: cat.squads.map(sq => {
            const finalSessions = sq.sessions.length;
            const present = sq.sessions.reduce((a, sess) => a + sess.records.filter(r => r.status === 'PRESENT').length, 0);
            const pct = finalSessions > 0 && sq._count.players > 0
              ? Math.round((present / (finalSessions * sq._count.players)) * 100)
              : null;
            sportPresent += present;
            sportFinalized += finalSessions;
            totalFinalizedSessions += finalSessions;
            totalPresent += present;
            if (finalSessions > 0) totalPossible += finalSessions * sq._count.players;
            return { id: sq.id, name: sq.name, playerCount: sq._count.players, finalizedSessions: finalSessions, attendancePct: pct };
          }),
        };
      });

      return {
        id: sport.id,
        name: sport.name,
        accentColor: sport.accentColor,
        playerCount: sportPlayers,
        categories: categorySummaries,
      };
    });

    const overallPct = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : null;

    res.json({
      success: true,
      data: {
        totalSports,
        totalSquads,
        totalPlayers,
        totalFinalizedSessions,
        overallAttendancePct: overallPct,
        sports: sportSummaries,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Squad/team stats ─────────────────────────────────────────────────────────
router.get('/team', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const squadId = await resolveSquadId(req);

    const playerWhere: any = {
      OR: [
        { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' },
        { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }, { status: 'ACTIVE' }] }
      ]
    };
    if (squadId) playerWhere.squadId = squadId;

    const sessionWhere: any = {};
    if (squadId) sessionWhere.squadId = squadId;

    const [totalPlayers, activePlayers, todaySession] = await Promise.all([
      prisma.user.count({ where: { ...playerWhere } }),
      prisma.user.count({ where: { ...playerWhere } }),
      prisma.attendanceSession.findFirst({
        where: { date: today, ...sessionWhere },
        include: { records: true },
      }),
    ]);

    const finalizedSessions = await prisma.attendanceSession.count({
      where: { status: 'FINALIZED', ...sessionWhere }
    });

    const dayOffCount = await prisma.attendanceSession.count({
      where: { status: 'DAY_OFF', ...sessionWhere }
    });

    const todayPresent = todaySession?.records.filter(r => r.status === 'PRESENT').length ?? 0;
    const todayAbsent = todaySession?.records.filter(r => r.status === 'ABSENT').length ?? 0;
    const todayTotal = todaySession?.records.length ?? 0;

    const todayPct = activePlayers > 0 && todayTotal > 0
      ? Math.round((todayPresent / activePlayers) * 100)
      : null;

    let teamAttendancePct: number | null = null;
    if (finalizedSessions > 0 && activePlayers > 0) {
      const recordWhere: any = { status: 'PRESENT', session: { status: 'FINALIZED' } };
      if (squadId) recordWhere.session.squadId = squadId;
      const totalPresent = await prisma.attendanceRecord.count({ where: recordWhere });
      const totalPossible = finalizedSessions * activePlayers;
      teamAttendancePct = Math.round((totalPresent / totalPossible) * 100);
    }

    // Squad info
    let squadInfo = null;
    if (squadId) {
      squadInfo = await prisma.squad.findUnique({
        where: { id: squadId },
        include: { category: { include: { sport: true } } },
      });
    }

    res.json({
      success: true,
      data: {
        totalPlayers,
        activePlayers,
        finalizedSessions,
        dayOffCount,
        todayPresent,
        todayAbsent,
        todayTotal,
        todayPct,
        todaySessionStatus: todaySession?.status ?? null,
        todaySessionId: todaySession?.id ?? null,
        teamAttendancePct,
        squadId: squadId ?? null,
        squadInfo,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Attendance trend (calendar-based or last N FINALIZED sessions) ───────────
router.get('/trend', requireAuth, async (req, res) => {
  try {
    const squadId = await resolveSquadId(req);
    const sessionWhere: any = { status: 'FINALIZED' };
    if (squadId) sessionWhere.squadId = squadId;

    // Calendar-based mode: ?days=14 returns the last N calendar days with per-day data
    // Session-based mode (legacy): ?limit=N returns last N finalized sessions
    const daysParam = req.query.days ? Number(req.query.days) : null;

    if (daysParam && daysParam > 0) {
      // Build a list of the last N calendar days (UTC midnight)
      const today = new Date();
      const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const startUtc = new Date(todayUtc);
      startUtc.setUTCDate(startUtc.getUTCDate() - (daysParam - 1));

      // Fetch all finalized sessions in that window
      const windowWhere: any = { ...sessionWhere, date: { gte: startUtc, lte: todayUtc } };
      const sessions = await prisma.attendanceSession.findMany({
        where: windowWhere,
        orderBy: { date: 'asc' },
        include: { records: true },
      });

      // Map sessions by their UTC date string for O(1) lookup
      const sessionByDate = new Map<string, typeof sessions[0]>();
      for (const s of sessions) {
        const key = s.date.toISOString().slice(0, 10);
        sessionByDate.set(key, s);
      }

      // Build calendar array — null pct on days without a finalized session
      const data: any[] = [];
      for (let i = 0; i < daysParam; i++) {
        const d = new Date(startUtc);
        d.setUTCDate(d.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        const session = sessionByDate.get(key);
        if (session) {
          const present = session.records.filter(r => r.status === 'PRESENT').length;
          const absent = session.records.filter(r => r.status === 'ABSENT').length;
          const total = session.records.length;
          data.push({
            date: d.toISOString(),
            sessionType: session.sessionType,
            present,
            absent,
            total,
            pct: total > 0 ? Math.round((present / total) * 100) : 0,
          });
        } else {
          data.push({
            date: d.toISOString(),
            sessionType: null,
            present: null,
            absent: null,
            total: null,
            pct: null,
          });
        }
      }
      return res.json({ success: true, data });
    }

    // Legacy: return last N finalized sessions (no gaps for missing days)
    const limit = Number(req.query.limit) || 30;
    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      orderBy: { date: 'desc' },
      take: limit,
      include: { records: true },
    });
    const data = sessions.reverse().map(s => ({
      date: s.date,
      sessionType: s.sessionType,
      present: s.records.filter(r => r.status === 'PRESENT').length,
      absent: s.records.filter(r => r.status === 'ABSENT').length,
      total: s.records.length,
      pct: s.records.length > 0
        ? Math.round((s.records.filter(r => r.status === 'PRESENT').length / s.records.length) * 100)
        : 0,
    }));
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Player analytics (squad-scoped) ─────────────────────────────────────────
router.get('/player-analytics', requireAuth, requireRole('ADMIN', 'COACH', 'SPORTS_OFFICER', 'CAPTAIN'), async (req, res) => {
  try {
    const squadId = await resolveSquadId(req);

    const playerWhere: any = {
      OR: [
        { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' },
        { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }, { status: 'ACTIVE' }] }
      ]
    };
    if (squadId) playerWhere.squadId = squadId;

    const players = await prisma.user.findMany({
      where: playerWhere,
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    });

    const sessionWhere: any = { status: 'FINALIZED' };
    if (squadId) sessionWhere.squadId = squadId;

    const finalizedSessions = await prisma.attendanceSession.count({ where: sessionWhere });

    const result = await Promise.all(players.map(async (p) => {
      const recordWhere: any = { playerId: p.id, status: 'PRESENT', session: { status: 'FINALIZED' } };
      if (squadId) recordWhere.session.squadId = squadId;
      const presentCount = await prisma.attendanceRecord.count({ where: recordWhere });
      const absentWhere = { ...recordWhere, status: 'ABSENT' };
      const absentCount = await prisma.attendanceRecord.count({ where: absentWhere });
      const pct = finalizedSessions > 0 ? Math.round((presentCount / finalizedSessions) * 100) : null;
      return {
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        presentCount,
        absentCount,
        totalSessions: finalizedSessions,
        attendancePct: pct,
      };
    }));

    res.json({ success: true, data: result, totalSessions: finalizedSessions });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── CSV export (squad-scoped) ────────────────────────────────────────────────
router.get('/export/csv', requireAuth, requireRole('ADMIN', 'COACH', 'SPORTS_OFFICER'), async (req, res) => {
  try {
    const { sessionId } = req.query;
    const squadId = await resolveSquadId(req);

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { squad: { include: { category: { include: { sport: true } } } } },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Enforce squad scoping (non-admin can only export their squad's sessions)
    if (squadId && session.squadId !== squadId) {
      return res.status(403).json({ success: false, message: 'Access denied to this session.' });
    }

    const d = session.date;
    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const squadLabel = session.squad ? `${session.squad.category.sport.name}_${session.squad.category.name}` : 'unknown';

    let header = '';
    let rows: string[] = [];

    if (session.status === 'DAY_OFF') {
      header = 'Date,Squad,Session Status,Reason';
      const safeReason = session.dayOffReason ? `"${session.dayOffReason.replace(/"/g, '""')}"` : '';
      rows = [[dateStr, squadLabel, 'DAY_OFF', safeReason].join(',')];
    } else {
      const records = await prisma.attendanceRecord.findMany({
        where: { sessionId: session.id },
        include: {
          player: { select: { name: true, jerseyNumber: true, systemId: true } },
          markedBy: { select: { name: true } },
        },
      });

      header = 'Date,Squad,Session Status,Player Name,System ID,Jersey Number,Attendance Status,Marked By';
      rows = records.map(r => {
        return [
          dateStr,
          squadLabel,
          session.status,
          `"${r.player.name.replace(/"/g, '""')}"`,
          r.player.systemId || '',
          r.player.jerseyNumber || '',
          r.status,
          `"${r.markedBy.name.replace(/"/g, '""')}"`,
        ].join(',');
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${squadLabel}_${dateStr}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
