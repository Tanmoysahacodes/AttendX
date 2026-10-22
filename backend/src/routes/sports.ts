import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Get all sports (with categories and squads) ──────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const sports = await prisma.sport.findMany({
      where: req.user.role === 'PLAYER' ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: {
        categories: {
          where: req.user.role === 'PLAYER' ? { isActive: true } : undefined,
          orderBy: { displayOrder: 'asc' },
          include: {
            squads: {
              where: req.user.role === 'PLAYER' ? { isActive: true } : undefined,
              orderBy: { displayOrder: 'asc' },
              include: {
                _count: { select: { players: { where: { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' } } } },
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: sports });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get single sport ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { id: req.params.id },
      include: {
        categories: {
          orderBy: { displayOrder: 'asc' },
          include: {
            squads: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });
    res.json({ success: true, data: sport });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create sport (Admin only) ────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      accentColor: z.string().default('#f97316'),
      displayOrder: z.number().int().default(0),
    }).parse(req.body);

    const sport = await prisma.sport.create({ data });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SPORT_CREATED', entityType: 'SPORT', entityId: sport.id, metadata: { name: sport.name } },
    });
    res.json({ success: true, data: sport });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Update sport (Admin only) ────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      accentColor: z.string().optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    }).parse(req.body);

    const sport = await prisma.sport.update({ where: { id: req.params.id }, data: { ...data, updatedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SPORT_UPDATED', entityType: 'SPORT', entityId: sport.id, metadata: data },
    });
    res.json({ success: true, data: sport });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Get categories for a sport ───────────────────────────────────────────────
router.get('/:sportId/categories', requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { sportId: req.params.sportId },
      orderBy: { displayOrder: 'asc' },
      include: {
        squads: { orderBy: { displayOrder: 'asc' } },
      },
    });
    res.json({ success: true, data: categories });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create category for a sport (Admin only) ─────────────────────────────────
router.post('/:sportId/categories', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { sportId } = req.params;
    const data = z.object({
      name: z.string().min(1),
      displayOrder: z.number().int().default(0),
    }).parse(req.body);

    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });

    const category = await prisma.category.create({ data: { ...data, sportId } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'CATEGORY_CREATED', entityType: 'CATEGORY', entityId: category.id, metadata: { sport: sport.name, name: category.name } },
    });
    res.json({ success: true, data: category });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Update category (Admin only) ────────────────────────────────────────────
router.patch('/categories/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    }).parse(req.body);

    const category = await prisma.category.update({ where: { id: req.params.id }, data: { ...data, updatedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'CATEGORY_UPDATED', entityType: 'CATEGORY', entityId: category.id, metadata: data },
    });
    res.json({ success: true, data: category });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Get squads for a category ────────────────────────────────────────────────
router.get('/categories/:categoryId/squads', requireAuth, async (req, res) => {
  try {
    const squads = await prisma.squad.findMany({
      where: { categoryId: req.params.categoryId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { players: { where: { status: 'ACTIVE', role: { in: ['PLAYER', 'CAPTAIN'] } } } } },
        category: { include: { sport: true } },
      },
    });
    res.json({ success: true, data: squads });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Get single squad ─────────────────────────────────────────────────────────
router.get('/squads/:id', requireAuth, async (req, res) => {
  try {
    const squad = await prisma.squad.findUnique({
      where: { id: req.params.id },
      include: {
        category: { include: { sport: true } },
        _count: { select: { players: { where: { status: 'ACTIVE', role: { in: ['PLAYER', 'CAPTAIN'] } } } } },
      },
    });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });
    res.json({ success: true, data: squad });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Create squad for a category (Admin only) ────────────────────────────────
router.post('/categories/:categoryId/squads', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const data = z.object({
      name: z.string().min(1),
      displayOrder: z.number().int().default(0),
    }).parse(req.body);

    const category = await prisma.category.findUnique({ where: { id: categoryId }, include: { sport: true } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const squad = await prisma.squad.create({ data: { ...data, categoryId } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SQUAD_CREATED', entityType: 'SQUAD', entityId: squad.id, metadata: { sport: category.sport.name, category: category.name, name: squad.name } },
    });
    res.json({ success: true, data: squad });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Update squad (Admin only) ────────────────────────────────────────────────
router.patch('/squads/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    }).parse(req.body);

    const squad = await prisma.squad.update({ where: { id: req.params.id }, data: { ...data, updatedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SQUAD_UPDATED', entityType: 'SQUAD', entityId: squad.id, metadata: data },
    });
    res.json({ success: true, data: squad });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Delete sport (Admin only) ────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { id: req.params.id },
      include: {
        categories: {
          include: {
            squads: {
              include: { _count: { select: { players: { where: { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' } } } } }
            }
          }
        }
      }
    });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });

    const totalPlayers = sport.categories.reduce((acc, cat) =>
      acc + cat.squads.reduce((a, sq) => a + (sq._count?.players ?? 0), 0), 0);
    if (totalPlayers > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete "${sport.name}" — it has ${totalPlayers} active player(s). Deactivate all players first.` });
    }

    // Delete in order: records → sessions → squads → categories → sport
    for (const cat of sport.categories) {
      for (const sq of cat.squads) {
        await prisma.attendanceRecord.deleteMany({ where: { session: { squadId: sq.id } } });
        await prisma.attendanceSession.deleteMany({ where: { squadId: sq.id } });
        await prisma.squad.delete({ where: { id: sq.id } });
      }
      await prisma.category.delete({ where: { id: cat.id } });
    }
    await prisma.sport.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SPORT_DELETED', entityType: 'SPORT', entityId: req.params.id, metadata: { name: sport.name } },
    });
    res.json({ success: true, message: `Sport "${sport.name}" deleted.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Delete category (Admin only) ─────────────────────────────────────────────
router.delete('/categories/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        squads: {
          include: { _count: { select: { players: { where: { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' } } } } }
        },
        sport: true,
      }
    });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const totalPlayers = category.squads.reduce((a, sq) => a + (sq._count?.players ?? 0), 0);
    if (totalPlayers > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete "${category.name}" — it has ${totalPlayers} active player(s). Deactivate them first.` });
    }

    for (const sq of category.squads) {
      await prisma.attendanceRecord.deleteMany({ where: { session: { squadId: sq.id } } });
      await prisma.attendanceSession.deleteMany({ where: { squadId: sq.id } });
      await prisma.squad.delete({ where: { id: sq.id } });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'CATEGORY_DELETED', entityType: 'CATEGORY', entityId: req.params.id, metadata: { name: category.name, sport: category.sport.name } },
    });
    res.json({ success: true, message: `Category "${category.name}" deleted.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Delete squad (Admin only) ────────────────────────────────────────────────
router.delete('/squads/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const squad = await prisma.squad.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { players: { where: { role: { in: ['PLAYER', 'CAPTAIN'] }, status: 'ACTIVE' } } } },
        category: { include: { sport: true } },
      }
    });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });
    if ((squad._count?.players ?? 0) > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete "${squad.name}" — it has ${squad._count.players} active player(s). Deactivate or transfer them first.` });
    }

    await prisma.attendanceRecord.deleteMany({ where: { session: { squadId: squad.id } } });
    await prisma.attendanceSession.deleteMany({ where: { squadId: squad.id } });
    await prisma.squad.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SQUAD_DELETED', entityType: 'SQUAD', entityId: req.params.id, metadata: { name: squad.name } },
    });
    res.json({ success: true, message: `Squad "${squad.name}" deleted.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Assign Captain per squad (Admin only) ────────────────────────────────────
router.post('/squads/:squadId/captain/assign', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { squadId } = req.params;
    const { playerId } = z.object({ playerId: z.string() }).parse(req.body);

    const squad = await prisma.squad.findUnique({ where: { id: squadId } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });

    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    if (player.squadId !== squadId) return res.status(400).json({ success: false, message: 'Player does not belong to this squad' });
    if (player.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Only active players can be Captain' });

    await prisma.$transaction(async (tx) => {
      // Demote existing captain in this squad only
      await tx.user.updateMany({ where: { squadId, role: 'CAPTAIN' }, data: { role: 'PLAYER' } });
      // Promote new captain
      await tx.user.update({ where: { id: playerId }, data: { role: 'CAPTAIN' } });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'CAPTAIN_ASSIGNED', entityType: 'USER', entityId: playerId, metadata: { squadId, squadName: squad.name, captainName: player.name } },
      });
    });

    res.json({ success: true, message: `${player.name} is now Captain of ${squad.name}.` });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

// ─── Remove Captain from squad (Admin only) ────────────────────────────────────
router.post('/squads/:squadId/captain/remove', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { squadId } = req.params;

    const squad = await prisma.squad.findUnique({ where: { id: squadId } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });

    await prisma.$transaction(async (tx) => {
      const captains = await tx.user.findMany({ where: { squadId, role: 'CAPTAIN' } });
      await tx.user.updateMany({ where: { squadId, role: 'CAPTAIN' }, data: { role: 'PLAYER' } });
      for (const c of captains) {
        await tx.auditLog.create({ data: { userId: req.user.id, action: 'CAPTAIN_REMOVED', entityType: 'USER', entityId: c.id, metadata: { squadId, squadName: squad.name, captainName: c.name } } });
      }
    });

    res.json({ success: true, message: `Captain removed from ${squad.name}.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── CSV Import for a specific squad (Admin only) ─────────────────────────────
router.post('/squads/:squadId/import', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { squadId } = req.params;

    const squad = await prisma.squad.findUnique({ where: { id: squadId }, include: { category: { include: { sport: true } } } });
    if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });
    if (!squad.isActive) return res.status(400).json({ success: false, message: 'Cannot import to an inactive squad' });

    const { players } = z.object({
      players: z.array(z.object({
        name: z.string().min(1),
        systemId: z.string().min(1),
        jerseyNumber: z.string().nullable().optional(),
        course: z.string().nullable().optional(),
        year: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        position: z.string().nullable().optional(),
      })),
    }).parse(req.body);

    const results = { imported: 0, matched: 0, skipped: 0, rejected: [] as string[] };

    for (const p of players) {
      // Check for systemId uniqueness
      const existing = await prisma.user.findUnique({ where: { systemId: p.systemId } });

      if (existing) {
        if (existing.squadId === squadId) {
          // Already in this squad — match and update fields
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              ...(p.jerseyNumber !== undefined ? { jerseyNumber: p.jerseyNumber } : {}),
              ...(p.course ? { course: p.course } : {}),
              ...(p.year ? { year: p.year } : {}),
              ...(p.email ? { email: p.email } : {}),
              ...(p.position ? { position: p.position } : {}),
            },
          });
          results.matched++;
        } else if (existing.squadId !== null) {
          results.rejected.push(`${p.name} (${p.systemId}): already in squad "${existing.squadId}"`);
        } else {
          // No squad — assign
          await prisma.user.update({
            where: { id: existing.id },
            data: { squadId, ...(p.jerseyNumber !== undefined ? { jerseyNumber: p.jerseyNumber } : {}) },
          });
          results.matched++;
        }
        continue;
      }

      // Create new player
      try {
        await prisma.user.create({
          data: {
            name: p.name,
            systemId: p.systemId,
            jerseyNumber: p.jerseyNumber ?? null,
            course: p.course ?? null,
            year: p.year ?? null,
            email: p.email ?? null,
            position: p.position ?? null,
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
      data: {
        userId: req.user.id,
        action: 'PLAYERS_IMPORTED',
        entityType: 'SQUAD',
        entityId: squadId,
        metadata: { squadName: squad.name, ...results },
      },
    });

    res.json({ success: true, data: results });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.errors?.[0]?.message || e.message });
  }
});

export default router;
