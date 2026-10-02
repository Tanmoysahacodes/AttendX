import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ─── Team stats ───────────────────────────────────────────────────────────────
router.get('/team', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const [totalPlayers, activePlayers, todaySession] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['PLAYER', 'CAPTAIN', 'ADMIN'] } } }),
      prisma.user.count({ 
        where: { 
          OR: [
            { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' },
            { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }, { status: 'ACTIVE' }] }
          ]
        } 
      }),
      prisma.attendanceSession.findFirst({
        where: { date: today },
        include: { records: true },
      }),
    ]);

    // Count only FINALIZED sessions (not DAY_OFF) for percentage calculations
    const finalizedSessions = await prisma.attendanceSession.count({
      where: { status: 'FINALIZED' }
    });

    const dayOffCount = await prisma.attendanceSession.count({
      where: { status: 'DAY_OFF' }
    });

    const todayPresent = todaySession?.records.filter(r => r.status === 'PRESENT').length ?? 0;
    const todayAbsent = todaySession?.records.filter(r => r.status === 'ABSENT').length ?? 0;
    const todayTotal = todaySession?.records.length ?? 0;

    // Today attendance % based on active players
    const todayPct = activePlayers > 0 && todayTotal > 0
      ? Math.round((todayPresent / activePlayers) * 100)
      : null;

    // Overall team attendance % - only from FINALIZED sessions
    let teamAttendancePct: number | null = null;
    if (finalizedSessions > 0 && activePlayers > 0) {
      const totalPresent = await prisma.attendanceRecord.count({
        where: {
          status: 'PRESENT',
          session: { status: 'FINALIZED' }
        }
      });
      const totalPossible = finalizedSessions * activePlayers;
      teamAttendancePct = Math.round((totalPresent / totalPossible) * 100);
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
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Attendance trend (last N FINALIZED sessions) ─────────────────────────────
router.get('/trend', requireAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const sessions = await prisma.attendanceSession.findMany({
      where: { status: 'FINALIZED' },
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

// ─── Player analytics (all players with attendance data) ─────────────────────
router.get('/player-analytics', requireAuth, requireRole('ADMIN', 'COACH', 'SPORTS_OFFICER', 'CAPTAIN'), async (req, res) => {
  try {
    const players = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' },
          { AND: [{ role: 'ADMIN' }, { jerseyNumber: { not: null } }, { status: 'ACTIVE' }] }
        ]
      },
      orderBy: { jerseyNumber: 'asc' },
    });

    const finalizedSessions = await prisma.attendanceSession.count({ where: { status: 'FINALIZED' } });

    const result = await Promise.all(players.map(async (p) => {
      const presentCount = await prisma.attendanceRecord.count({
        where: { playerId: p.id, status: 'PRESENT', session: { status: 'FINALIZED' } }
      });
      const absentCount = await prisma.attendanceRecord.count({
        where: { playerId: p.id, status: 'ABSENT', session: { status: 'FINALIZED' } }
      });
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

// ─── CSV export ───────────────────────────────────────────────────────────────
router.get('/export/csv', requireAuth, requireRole('ADMIN', 'COACH', 'SPORTS_OFFICER'), async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const d = session.date;
    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    let header = '';
    let rows: string[] = [];

    if (session.status === 'DAY_OFF') {
      header = 'Date,Session Status,Reason';
      // Quote the reason in case it contains commas
      const safeReason = session.dayOffReason ? `"${session.dayOffReason.replace(/"/g, '""')}"` : '';
      rows = [[dateStr, 'DAY_OFF', safeReason].join(',')];
    } else {
      const records = await prisma.attendanceRecord.findMany({
        where: { sessionId: session.id },
        include: {
          player: { select: { name: true, jerseyNumber: true } },
          markedBy: { select: { name: true } },
        },
      });

      header = 'Date,Session Status,Player Name,Jersey Number,Attendance Status,Marked By';
      rows = records.map(r => {
        return [
          dateStr,
          session.status,
          `"${r.player.name.replace(/"/g, '""')}"`,
          r.player.jerseyNumber || '',
          r.status,
          `"${r.markedBy.name.replace(/"/g, '""')}"`,
        ].join(',');
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${dateStr}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
