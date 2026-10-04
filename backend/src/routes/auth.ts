import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Player login (name + jersey number) ────────────────────────────────────
router.post('/login/player', async (req, res) => {
  try {
    const { name, systemId } = z.object({
      name: z.string().min(1),
      systemId: z.string().min(1),
    }).parse(req.body);

    const player = await prisma.user.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        systemId: systemId.trim(),
        status: 'ACTIVE',
      },
    });

    if (!player) {
      return res.status(401).json({ success: false, message: 'No player found with that name and System ID.' });
    }

    // Update last login
    await prisma.user.update({ where: { id: player.id }, data: { lastLoginAt: new Date() } });

    await prisma.auditLog.create({
      data: { userId: player.id, action: 'LOGIN', entityType: 'USER', entityId: player.id, metadata: { method: 'player' } },
    });

    const token = jwt.sign(
      { userId: player.id, role: player.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '12h' }
    );

    const { passwordHash: _, ...safePlayer } = player as any;
    res.json({ success: true, data: { user: safePlayer, token } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || 'Invalid request' });
  }
});

// ─── Staff login (username + password) ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { name: { equals: username, mode: 'insensitive' } },
        ],
        role: { in: ['ADMIN', 'COACH', 'SPORTS_OFFICER', 'CAPTAIN'] },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is inactive.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'USER', entityId: user.id, metadata: { method: 'staff' } },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '12h' }
    );

    const { passwordHash: _, ...safeUser } = user as any;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || 'Invalid request' });
  }
});

// ─── /me ─────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash: _, ...safeUser } = user as any;
  res.json({ success: true, data: safeUser });
});

export default router;
