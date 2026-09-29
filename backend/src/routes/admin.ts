import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Assign Captain (Admin only) ──────────────────────────────────────────────
router.post('/captain/assign', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { playerId } = z.object({ playerId: z.string() }).parse(req.body);

    const newCaptain = await prisma.user.findUnique({ where: { id: playerId } });
    if (!newCaptain) return res.status(404).json({ success: false, message: 'Player not found.' });
    if (newCaptain.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Only active players can be assigned as Captain.' });

    // Use transaction: demote old captain, promote new
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { role: 'CAPTAIN' }, data: { role: 'PLAYER' } });
      await tx.user.update({ where: { id: playerId }, data: { role: 'CAPTAIN' } });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'CAPTAIN_ASSIGNED', entityType: 'USER', entityId: playerId, metadata: { captainName: newCaptain.name } },
      });
    });

    res.json({ success: true, message: `${newCaptain.name} is now the Captain.` });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Remove Captain ───────────────────────────────────────────────────────────
router.post('/captain/remove', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const captains = await tx.user.findMany({ where: { role: 'CAPTAIN' } });
      await tx.user.updateMany({ where: { role: 'CAPTAIN' }, data: { role: 'PLAYER' } });
      for (const c of captains) {
        await tx.auditLog.create({ data: { userId: req.user.id, action: 'CAPTAIN_REMOVED', entityType: 'USER', entityId: c.id, metadata: { captainName: c.name } } });
      }
    });
    res.json({ success: true, message: 'Captain role removed.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── CSV Bulk import (Admin only) ─────────────────────────────────────────────
router.post('/players/import', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { players } = z.object({
      players: z.array(z.object({
        name: z.string().min(1),
        jerseyNumber: z.string().min(1),
        position: z.enum(['RAIDER', 'DEFENDER', 'ALL_ROUNDER']).optional(),
        year: z.string().optional(),
        course: z.string().optional(),
        phone: z.string().optional(),
      })),
    }).parse(req.body);

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const p of players) {
      const exists = await prisma.user.findFirst({ where: { jerseyNumber: p.jerseyNumber } });
      if (exists) { results.skipped++; results.errors.push(`Jersey #${p.jerseyNumber} (${p.name}) already exists.`); continue; }
      await prisma.user.create({ data: { ...p, role: 'PLAYER', status: 'ACTIVE' } });
      results.created++;
    }

    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAYERS_IMPORTED', entityType: 'USER', metadata: results } });
    res.json({ success: true, data: results });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

export default router;
