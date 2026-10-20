/**
 * AttendX Multi-Sport Migration Script
 * 
 * Safe, additive migration:
 * 1. Creates Sport, Category, Squad records for Kabaddi, Badminton, Taekwondo
 * 2. Assigns existing Kabaddi Boys players to Kabaddi Boys squad
 * 3. Migrates existing AttendanceSessions to Kabaddi Boys squad
 * 4. Imports Kabaddi Girls, Badminton Boys, Badminton Girls, Taekwondo Boys, Taekwondo Girls rosters
 * 5. Validates systemId uniqueness before importing
 * 
 * DOES NOT: reset data, delete records, wipe attendance history
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

// ─── Sport Definitions ────────────────────────────────────────────────────────
const SPORTS = [
  { name: 'Kabaddi',   accentColor: '#f97316', displayOrder: 0 }, // warm orange
  { name: 'Badminton', accentColor: '#38bdf8', displayOrder: 1 }, // sky blue
  { name: 'Taekwondo', accentColor: '#a855f7', displayOrder: 2 }, // violet
];

// ─── Kabaddi Girls Roster ─────────────────────────────────────────────────────
const KABADDI_GIRLS = [
  { name: 'Khushbu',       systemId: '2025411445', jerseyNumber: '17' },
  { name: 'Harshpriya',    systemId: '2025351246', jerseyNumber: '10' },
  { name: 'Pragya',        systemId: '2025395326', jerseyNumber: '21' },
  { name: 'Nishi mavi',    systemId: '2024331296', jerseyNumber: '11' },
  { name: 'Gunjan',        systemId: '2023336526', jerseyNumber: '14' },
  { name: 'Aafrin jahan',  systemId: '2023308068', jerseyNumber: '13' },
  { name: 'Nandini',       systemId: '2023403069', jerseyNumber: '3'  },
  { name: 'Rina',          systemId: '2023476316', jerseyNumber: '9'  },
  { name: 'Priya Mishra',  systemId: '2025115747', jerseyNumber: '8'  },
  { name: 'Sidhi',         systemId: '2024256812', jerseyNumber: '18' },
  { name: 'Kajal',         systemId: '2025261908', jerseyNumber: '6'  },
  { name: 'Tanu',          systemId: '2024224577', jerseyNumber: '12' },
  { name: 'Hiba Sani',     systemId: '2026117961', jerseyNumber: null }, // intentionally null
];

// ─── Badminton Boys Roster ────────────────────────────────────────────────────
const BADMINTON_BOYS = [
  { name: 'Arpit Kumar',         systemId: '2025557822', course: 'SSCSE', year: '2nd year' },
  { name: 'Ayush Kumar',         systemId: '2025557820', course: 'SSCSE', year: '2nd year' },
  { name: 'Rudra Pratap Singh',  systemId: '2025820558', course: 'SSCSE', year: '2nd year' },
  { name: 'Gaurav Joshi',        systemId: '2023383657', course: 'SSCSE', year: '4th year' },
  { name: 'Vansh Chaudhary',     systemId: '2024205086', course: 'SSCSE', year: '3rd year' },
  { name: 'Abhi Dhanesha',       systemId: '2025231885', course: 'SSCSE', year: '2nd year' },
  { name: 'Tanish Elaiaraja',    systemId: '2025458572', course: 'SSBS',  year: '2nd year' },
  { name: 'Rahul Krishna S',     systemId: '2025473800', course: 'SSHSS', year: '2nd year' },
  { name: 'Anant Vashishtha',    systemId: '2023404918', course: 'SSCSE', year: '4th year' },
  { name: 'Kemar Riso',          systemId: '2026259898', course: null,    year: '1st year' },
];

// ─── Badminton Girls Roster ───────────────────────────────────────────────────
const BADMINTON_GIRLS = [
  { name: 'Riya yadav',    systemId: '2025439718', course: 'SSBT',  email: '2025439718.riya@ug.sharda.ac.in'    },
  { name: 'Aarna Vyas',    systemId: '2025370491', course: 'SSBT',  email: '2025370491.aarna@ug.sharda.ac.in'   },
  { name: 'Kanishka',      systemId: '2024340717', course: 'SSNSR', email: '2024340717.kanishka@ug.sharda.ac.in' },
  { name: 'Rainy singh',   systemId: '2024326219', course: 'SSCSE', email: '2024326219.rainy@ug.sharda.ac.in'   },
  { name: 'Divya katyal',  systemId: '2026264884', course: 'SSBS',  email: '2026264884.divya@ug.sharda.ac.in'   },
  { name: 'Mahi Pandey',   systemId: '2026215861', course: 'SSCSE', email: '2026215861.mahi@ug.sharda.ac.in'    },
  { name: 'Garima chahar', systemId: '2026228611', course: 'SSBT',  email: '2026228611.garima@ug.sharda.ac.in'  },
  { name: 'Diksha yadav',  systemId: '2024000480', course: 'SDS',   email: '2024000480.diksha@ug.sharda.ac.in'  },
  // Note: trailing blank row in source NOT imported
];

// ─── Taekwondo Boys (source gender M, confirmed 6 players) ───────────────────
const TAEKWONDO_BOYS = [
  { name: 'Mradul bhardwaj',    systemId: '2025282400', course: 'BMRIT',          year: '2nd' },
  { name: '-rahul kumar',        systemId: '2026290200', course: 'BBA',            year: '1st' },
  { name: 'Adarsh Kumar Maurya', systemId: '2026247200', course: 'Btech',          year: '1st' },
  { name: 'Devojeet',            systemId: '2026273500', course: 'BMLS',           year: '1st' },
  { name: 'Manvendra',           systemId: '2026206500', course: 'BBA',            year: '1st' },
];

// ─── Taekwondo Girls (source gender F + Rupam explicit override = 10 players) ─
const TAEKWONDO_GIRLS = [
  { name: 'Shruti bhardwaj',  systemId: '2026177300', course: 'MBA',                  year: '1st' },
  { name: 'Rupam',            systemId: '2026182249', course: 'M.A(MJMC)',             year: '1st' }, // EXPLICIT Girls assignment
  { name: 'Mehak',            systemId: '2026133934', course: 'Bcom ACCA',             year: '1st' }, // corrected ID (was 2026133933 in some sources)
  { name: 'Pragati Dadhich',  systemId: '2024172500', course: 'Btech cse ai ml',      year: '3rd' },
  { name: 'Faliha',           systemId: '2024202200', course: 'Btech(ECE)',            year: '3rd' },
  { name: 'Anushka Gusain',   systemId: '2025476300', course: 'BAJMC',                year: '2nd' },
  { name: 'Prakarti Yadav',   systemId: '2026242300', course: 'btech biotechnology',  year: '1st' },
  { name: 'ishika',           systemId: '2025476500', course: 'bca aiml',             year: '2nd' },
  { name: 'mauli',            systemId: '2025433400', course: 'Ba psychology',        year: '2nd' },
  { name: 'Priya koranga',    systemId: '2024502900', course: 'BAJMC',                year: '3rd' },
  { name: 'Yashika',          systemId: '2026294900', course: 'MA',                   year: '1st' },
];

type ImportResult = {
  squad: string;
  imported: number;
  matched: number;
  skipped: number;
  rejected: string[];
};

async function importRoster(
  players: Array<{
    name: string;
    systemId: string;
    jerseyNumber?: string | null;
    course?: string | null;
    year?: string | null;
    email?: string | null;
  }>,
  squadId: string,
  squadLabel: string
): Promise<ImportResult> {
  const result: ImportResult = { squad: squadLabel, imported: 0, matched: 0, skipped: 0, rejected: [] };

  for (const p of players) {
    // Check systemId uniqueness across entire system
    const existingBySystemId = await prisma.user.findUnique({ where: { systemId: p.systemId } });

    if (existingBySystemId) {
      // If already in the correct squad, skip as matched
      if (existingBySystemId.squadId === squadId) {
        result.matched++;
        console.log(`  ⟳ MATCHED: ${p.name} (${p.systemId}) already in ${squadLabel}`);
      } else if (existingBySystemId.squadId !== null) {
        // Player exists but is in a DIFFERENT squad — report conflict, do not move
        result.rejected.push(`${p.name} (${p.systemId}) already exists in a different squad (${existingBySystemId.squadId}).`);
        console.log(`  ✗ CONFLICT: ${p.name} (${p.systemId}) belongs to squad ${existingBySystemId.squadId}, not ${squadLabel}`);
      } else {
        // Player exists without squad (maybe from old import) — assign to this squad
        await prisma.user.update({
          where: { id: existingBySystemId.id },
          data: {
            squadId,
            ...(p.jerseyNumber !== undefined ? { jerseyNumber: p.jerseyNumber } : {}),
            ...(p.course ? { course: p.course } : {}),
            ...(p.year ? { year: p.year } : {}),
            ...(p.email ? { email: p.email } : {}),
          },
        });
        result.matched++;
        console.log(`  ⟳ MATCHED+ASSIGNED: ${p.name} (${p.systemId}) → ${squadLabel}`);
      }
      continue;
    }

    // New player — create
    try {
      await prisma.user.create({
        data: {
          name: p.name,
          systemId: p.systemId,
          jerseyNumber: p.jerseyNumber ?? null,
          course: p.course ?? null,
          year: p.year ?? null,
          email: p.email ?? null,
          role: 'PLAYER',
          status: 'ACTIVE',
          squadId,
        },
      });
      result.imported++;
      console.log(`  ✓ IMPORTED: ${p.name} (${p.systemId}) → ${squadLabel}`);
    } catch (e: any) {
      result.rejected.push(`${p.name} (${p.systemId}): ${e.message}`);
      console.log(`  ✗ ERROR: ${p.name} (${p.systemId}): ${e.message}`);
    }
  }

  return result;
}

async function main() {
  console.log('\n🏟️  AttendX Multi-Sport Migration Starting...\n');

  // ── Step 1: Create Sports ──────────────────────────────────────────────────
  console.log('📋 Step 1: Creating Sports...');
  const sportMap: Record<string, string> = {}; // name → id

  for (const s of SPORTS) {
    const sport = await prisma.sport.upsert({
      where: { name: s.name },
      update: { accentColor: s.accentColor, displayOrder: s.displayOrder, updatedAt: new Date() },
      create: { name: s.name, accentColor: s.accentColor, displayOrder: s.displayOrder },
    });
    sportMap[s.name] = sport.id;
    console.log(`  ✓ Sport: ${s.name} (${sport.id})`);
  }

  // ── Step 2: Create Categories ─────────────────────────────────────────────
  console.log('\n📋 Step 2: Creating Categories...');
  const categoryMap: Record<string, string> = {}; // "sport:category" → id

  const CATEGORIES = [
    { sport: 'Kabaddi',   name: 'Boys',  order: 0 },
    { sport: 'Kabaddi',   name: 'Girls', order: 1 },
    { sport: 'Badminton', name: 'Boys',  order: 0 },
    { sport: 'Badminton', name: 'Girls', order: 1 },
    { sport: 'Taekwondo', name: 'Boys',  order: 0 },
    { sport: 'Taekwondo', name: 'Girls', order: 1 },
  ];

  for (const c of CATEGORIES) {
    const sportId = sportMap[c.sport];
    const category = await prisma.category.upsert({
      where: { name_sportId: { name: c.name, sportId } },
      update: { displayOrder: c.order, updatedAt: new Date() },
      create: { name: c.name, sportId, displayOrder: c.order },
    });
    categoryMap[`${c.sport}:${c.name}`] = category.id;
    console.log(`  ✓ Category: ${c.sport} ${c.name} (${category.id})`);
  }

  // ── Step 3: Create Squads ─────────────────────────────────────────────────
  console.log('\n📋 Step 3: Creating Squads...');
  const squadMap: Record<string, string> = {}; // "sport:category" → squadId

  const SQUADS = [
    { sport: 'Kabaddi',   category: 'Boys',  name: 'Kabaddi Boys',   order: 0 },
    { sport: 'Kabaddi',   category: 'Girls', name: 'Kabaddi Girls',  order: 1 },
    { sport: 'Badminton', category: 'Boys',  name: 'Badminton Boys', order: 0 },
    { sport: 'Badminton', category: 'Girls', name: 'Badminton Girls',order: 1 },
    { sport: 'Taekwondo', category: 'Boys',  name: 'Taekwondo Boys', order: 0 },
    { sport: 'Taekwondo', category: 'Girls', name: 'Taekwondo Girls',order: 1 },
  ];

  for (const sq of SQUADS) {
    const categoryId = categoryMap[`${sq.sport}:${sq.category}`];
    const squad = await prisma.squad.upsert({
      where: { name_categoryId: { name: sq.name, categoryId } },
      update: { displayOrder: sq.order, updatedAt: new Date() },
      create: { name: sq.name, categoryId, displayOrder: sq.order },
    });
    squadMap[`${sq.sport}:${sq.category}`] = squad.id;
    console.log(`  ✓ Squad: ${sq.name} (${squad.id})`);
  }

  const kabaddiBoys = squadMap['Kabaddi:Boys'];
  const kabaddiGirls = squadMap['Kabaddi:Girls'];
  const badmintonBoys = squadMap['Badminton:Boys'];
  const badmintonGirls = squadMap['Badminton:Girls'];
  const taekwondoBoys = squadMap['Taekwondo:Boys'];
  const taekwondoGirls = squadMap['Taekwondo:Girls'];

  // ── Step 4: Assign existing players/captain to Kabaddi Boys ──────────────
  console.log('\n📋 Step 4: Assigning existing players to Kabaddi Boys...');
  const existingPlayers = await prisma.user.findMany({
    where: {
      role: { in: ['PLAYER', 'CAPTAIN'] },
      squadId: null, // only assign those not yet assigned
    },
  });
  
  let assignedCount = 0;
  for (const p of existingPlayers) {
    await prisma.user.update({
      where: { id: p.id },
      data: { squadId: kabaddiBoys },
    });
    assignedCount++;
  }
  console.log(`  ✓ Assigned ${assignedCount} existing players to Kabaddi Boys`);

  // Also assign Ajit (ADMIN who plays) if he has a jerseyNumber
  const ajit = await prisma.user.findFirst({ where: { username: 'ajit', jerseyNumber: { not: null } } });
  if (ajit && !ajit.squadId) {
    await prisma.user.update({ where: { id: ajit.id }, data: { squadId: kabaddiBoys } });
    console.log(`  ✓ Assigned admin Ajit to Kabaddi Boys`);
  }

  // ── Step 5: Assign existing sessions to Kabaddi Boys ─────────────────────
  console.log('\n📋 Step 5: Assigning existing attendance sessions to Kabaddi Boys...');
  const sessionUpdateResult = await prisma.attendanceSession.updateMany({
    where: { squadId: null },
    data: { squadId: kabaddiBoys },
  });
  console.log(`  ✓ Assigned ${sessionUpdateResult.count} existing sessions to Kabaddi Boys`);

  // ── Step 6: Import Rosters ────────────────────────────────────────────────
  console.log('\n📋 Step 6: Importing Rosters...\n');

  const allResults: ImportResult[] = [];

  console.log('── Kabaddi Girls (13 players) ──────────────────────────────');
  allResults.push(await importRoster(KABADDI_GIRLS, kabaddiGirls, 'Kabaddi Girls'));

  console.log('\n── Badminton Boys (10 players) ─────────────────────────────');
  allResults.push(await importRoster(BADMINTON_BOYS, badmintonBoys, 'Badminton Boys'));

  console.log('\n── Badminton Girls (8 players) ─────────────────────────────');
  allResults.push(await importRoster(BADMINTON_GIRLS, badmintonGirls, 'Badminton Girls'));

  console.log('\n── Taekwondo Boys (5 players) ──────────────────────────────');
  allResults.push(await importRoster(TAEKWONDO_BOYS, taekwondoBoys, 'Taekwondo Boys'));

  console.log('\n── Taekwondo Girls (11 players, including Rupam explicit override) ──');
  allResults.push(await importRoster(TAEKWONDO_GIRLS, taekwondoGirls, 'Taekwondo Girls'));

  // ── Step 7: Verify specific IDs ───────────────────────────────────────────
  console.log('\n📋 Step 7: Verifying Critical Identity Rules...');

  const rupam = await prisma.user.findUnique({ where: { systemId: '2026182249' }, include: { squad: { include: { category: { include: { sport: true } } } } } });
  const mehak = await prisma.user.findUnique({ where: { systemId: '2026133934' }, include: { squad: { include: { category: { include: { sport: true } } } } } });

  if (rupam) {
    const squadName = rupam.squad?.name || 'NONE';
    const isGirls = squadName.includes('Girls');
    console.log(`  ${isGirls ? '✅' : '❌'} Rupam: ID=2026182249, Squad="${squadName}" (expected: Taekwondo Girls)`);
  } else {
    console.log('  ❌ Rupam (2026182249) not found!');
  }

  if (mehak) {
    const squadName = mehak.squad?.name || 'NONE';
    const isGirls = squadName.includes('Girls');
    console.log(`  ${isGirls ? '✅' : '❌'} Mehak: ID=2026133934, Squad="${squadName}" (expected: Taekwondo Girls), Name="${mehak.name}"`);
  } else {
    console.log('  ❌ Mehak (2026133934) not found!');
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════');
  console.log('  ROSTER IMPORT SUMMARY');
  console.log('══════════════════════════════════════════════════════');
  for (const r of allResults) {
    console.log(`\n  ${r.squad}:`);
    console.log(`    ✓ Imported: ${r.imported}`);
    console.log(`    ⟳ Matched:  ${r.matched}`);
    console.log(`    ↷ Skipped:  ${r.skipped}`);
    if (r.rejected.length > 0) {
      console.log(`    ✗ Rejected: ${r.rejected.length}`);
      r.rejected.forEach(e => console.log(`      - ${e}`));
    } else {
      console.log(`    ✗ Rejected: 0`);
    }
  }

  const totalImported = allResults.reduce((a, r) => a + r.imported, 0);
  const totalMatched = allResults.reduce((a, r) => a + r.matched, 0);
  const totalRejected = allResults.reduce((a, r) => a + r.rejected.length, 0);

  console.log(`\n  TOTALS: Imported=${totalImported}, Matched=${totalMatched}, Rejected=${totalRejected}`);
  console.log('══════════════════════════════════════════════════════\n');

  // Verify squad player counts
  console.log('📊 Final Squad Player Counts:');
  for (const [key, sqId] of Object.entries(squadMap)) {
    const count = await prisma.user.count({ where: { squadId: sqId, role: { in: ['PLAYER', 'CAPTAIN'] } } });
    console.log(`  ${key.replace(':', ' → ')}: ${count} players`);
  }

  console.log('\n✅ Migration complete!\n');
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
