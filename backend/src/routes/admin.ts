import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Assign Captain (Admin only) — now squad-scoped ──────────────────────────
// Note: squad-level captain assignment is also in /api/sports/squads/:squadId/captain/assign
// This legacy endpoint remains for backward compat but requires squadId
router.post('/captain/assign', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { playerId, squadId } = z.object({ 
      playerId: z.string(),
      squadId: z.string().optional(),
    }).parse(req.body);

    const newCaptain = await prisma.user.findUnique({ where: { id: playerId } });
    if (!newCaptain) return res.status(404).json({ success: false, message: 'Player not found.' });
    if (newCaptain.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Only active players can be assigned as Captain.' });

    // Use the player's own squad if no squadId provided
    const targetSquadId = squadId || newCaptain.squadId;
    if (!targetSquadId) return res.status(400).json({ success: false, message: 'Player has no squad. Assign to a squad first.' });

    const squad = await prisma.squad.findUnique({ where: { id: targetSquadId } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found.' });

    await prisma.$transaction(async (tx) => {
      // Demote existing captain in this squad only
      await tx.user.updateMany({ where: { squadId: targetSquadId, role: 'CAPTAIN' }, data: { role: 'PLAYER' } });
      await tx.user.update({ where: { id: playerId }, data: { role: 'CAPTAIN' } });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'CAPTAIN_ASSIGNED', entityType: 'USER', entityId: playerId, metadata: { captainName: newCaptain.name, squadId: targetSquadId, squadName: squad.name } },
      });
    });

    res.json({ success: true, message: `${newCaptain.name} is now the Captain of ${squad.name}.` });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Remove Captain (Admin only) — squad-scoped ────────────────────────────────
router.post('/captain/remove', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { squadId } = z.object({ squadId: z.string().optional() }).parse(req.body);

    const whereClause: any = { role: 'CAPTAIN' };
    if (squadId) whereClause.squadId = squadId;

    await prisma.$transaction(async (tx) => {
      const captains = await tx.user.findMany({ where: whereClause });
      await tx.user.updateMany({ where: whereClause, data: { role: 'PLAYER' } });
      for (const c of captains) {
        await tx.auditLog.create({ data: { userId: req.user.id, action: 'CAPTAIN_REMOVED', entityType: 'USER', entityId: c.id, metadata: { captainName: c.name, squadId: c.squadId } } });
      }
    });
    res.json({ success: true, message: 'Captain role removed.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── CSV Bulk import (Admin only) — squad required ─────────────────────────────
router.post('/players/import', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { players, squadId } = z.object({
      squadId: z.string().min(1, 'squadId is required for import'),
      players: z.array(z.object({
        name: z.string().min(1),
        systemId: z.string().min(1),
        jerseyNumber: z.string().nullable().optional(),
        position: z.string().optional(),
        year: z.string().optional(),
        course: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })),
    }).parse(req.body);

    const squad = await prisma.squad.findUnique({ where: { id: squadId } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found.' });

    const results = { imported: 0, matched: 0, skipped: 0, rejected: [] as string[] };

    for (const p of players) {
      // Check systemId uniqueness (global)
      const existingBySystemId = await prisma.user.findUnique({ where: { systemId: p.systemId } });
      if (existingBySystemId) {
        if (existingBySystemId.squadId === squadId) {
          results.matched++;
        } else if (existingBySystemId.squadId !== null) {
          results.rejected.push(`${p.name} (${p.systemId}): already in another squad.`);
        } else {
          await prisma.user.update({ where: { id: existingBySystemId.id }, data: { squadId } });
          results.matched++;
        }
        continue;
      }

      try {
        await prisma.user.create({
          data: {
            name: p.name,
            systemId: p.systemId,
            jerseyNumber: p.jerseyNumber ?? null,
            position: p.position ?? null,
            year: p.year ?? null,
            course: p.course ?? null,
            email: p.email ?? null,
            phone: p.phone ?? null,
            role: 'PLAYER',
            status: 'ACTIVE',
            squadId,
          },
        });
        results.imported++;
      } catch (err: any) {
        results.rejected.push(`${p.name} (${p.systemId}): ${err.message}`);
      }
    }

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'PLAYERS_IMPORTED', entityType: 'SQUAD', entityId: squadId, metadata: { squadName: squad.name, ...results } },
    });

    res.json({ success: true, data: results });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

export default router;
