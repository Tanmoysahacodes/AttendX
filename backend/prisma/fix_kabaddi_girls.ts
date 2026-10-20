/**
 * Fix script: Import 4 Kabaddi Girls that failed due to old jerseyNumber unique constraint
 * These failed because the Prisma client was generated before the constraint was dropped
 * Now that the client is regenerated, they should import cleanly
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

const KABADDI_GIRLS_SQUAD_ID = '77541a39-d6cc-4c77-96b1-4e255213a4ac';

const MISSED_GIRLS = [
  { name: 'Pragya',    systemId: '2025395326', jerseyNumber: '21' },
  { name: 'Nishi mavi', systemId: '2024331296', jerseyNumber: '11' },
  { name: 'Sidhi',     systemId: '2024256812', jerseyNumber: '18' },
  { name: 'Tanu',      systemId: '2024224577', jerseyNumber: '12' },
];

async function main() {
  console.log('Fixing 4 Kabaddi Girls players...');

  // Check constraint is gone
  for (const p of MISSED_GIRLS) {
    const existing = await prisma.user.findUnique({ where: { systemId: p.systemId } });
    if (existing) {
      console.log(`⟳ MATCHED existing: ${p.name} (${p.systemId}) — updating squad`);
      await prisma.user.update({
        where: { id: existing.id },
        data: { squadId: KABADDI_GIRLS_SQUAD_ID, jerseyNumber: p.jerseyNumber },
      });
    } else {
      try {
        await prisma.user.create({
          data: {
            name: p.name,
            systemId: p.systemId,
            jerseyNumber: p.jerseyNumber,
            role: 'PLAYER',
            status: 'ACTIVE',
            squadId: KABADDI_GIRLS_SQUAD_ID,
          },
        });
        console.log(`✓ IMPORTED: ${p.name} (${p.systemId})`);
      } catch (e: any) {
        console.error(`✗ FAILED: ${p.name}: ${e.message}`);
      }
    }
  }

  // Verify count
  const count = await prisma.user.count({ where: { squadId: KABADDI_GIRLS_SQUAD_ID, role: { in: ['PLAYER', 'CAPTAIN'] } } });
  console.log(`\nKabaddi Girls total: ${count} players`);

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
