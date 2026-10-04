import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const players = [
  { name: 'Chetan', jerseyNumber: '05', systemId: '2025295361', position: 'Raider', description: 'Quick and attacking raider with good footwork, hand touches, bonus points and running hand touches. Creates scoring opportunities through speed and timing.' },
  { name: 'Himanshu', jerseyNumber: '01', systemId: '2023378058', position: 'Right Corner', description: 'Powerful corner defender skilled in ankle holds, blocks, thigh holds and dashes. Strong against attacking raiders.' },
  { name: 'Ravees', jerseyNumber: '06', systemId: '2026281411', position: 'Defender', description: 'Reliable defender with strengths in strong tackles, blocks, holds and chain tackles. Provides stability to the defensive unit.' },
  { name: 'Jayant', jerseyNumber: '15', systemId: '2025298708', position: 'Left In', description: 'Versatile player who mainly plays Left In and can also play both corners. Strong in blocks, ankle holds, dashes and chain tackles.' },
  { name: 'Nakul', jerseyNumber: '02', systemId: '2025355617', position: 'Right Cover', description: 'Solid cover defender with blocks, thigh holds, dashes and chain tackles. Good defensive positioning and support play.' },
  { name: 'Doyla', jerseyNumber: '11', systemId: '2025289375', position: 'Right In', description: 'Quick and hardworking defender skilled in blocks, dashes and support tackles. Effective at closing gaps in defence.' },
  { name: 'Amit', jerseyNumber: '07', systemId: '2024374960', position: 'Right Cover', description: 'Strong cover defender known for blocks, thigh holds, dashes and chain tackles. Dependable in defensive situations.' },
  { name: 'Saurav', jerseyNumber: '12', systemId: '2025410962', position: 'Raider', description: 'Agile attacking raider with quick raids, hand touches, bonus attempts and sharp footwork. Good at finding gaps in the defence.' },
  { name: 'Anil', jerseyNumber: '21', systemId: '2025309364', position: 'Right Corner', description: 'Aggressive corner defender with strong ankle holds, blocks, dashes and corner tackles. Quick reactions during defensive situations.' },
  { name: 'Sumit', jerseyNumber: '30', systemId: '2025377506', position: 'Left Cover', description: 'Strong left cover with blocks, thigh holds, dashes and chain tackles. Provides excellent support to the left-side defence.' },
  { name: 'Ashu', jerseyNumber: '08', position: 'Raider', description: 'Quick and agile raider with hand touches, bonus ability, fast raids and quick escapes. Uses speed to create scoring chances.' },
  { name: 'Prem', jerseyNumber: '09', systemId: '2025172653', position: 'Raider', description: 'Dynamic raider skilled in hand touches, running hand touches, bonus points and quick raids. Effective in one-on-one situations.' },
  { name: 'Prince', jerseyNumber: '22', systemId: '2024351034', position: 'Left Corner', description: 'Aggressive corner defender specializing in ankle holds, blocks, dashes and chain tackles. Strong at finishing crucial tackles.' },
  { name: 'Dev', jerseyNumber: '16', position: 'Raider', description: 'Attacking raider with speed, agility, hand touches and bonus attempts. Good at identifying defensive gaps and scoring points.' },
  { name: 'Rahul', jerseyNumber: '93', position: 'Defender', description: 'Versatile defender skilled in ankle holds, blocks, dashes, thigh holds and chain tackles. Strong defensive awareness and reliable support.' },
  { name: 'Sultan', jerseyNumber: '55', systemId: '2023836859', position: 'Defender', description: 'Defender' },
  { name: 'Shanu', jerseyNumber: '27', systemId: '2025138781', position: 'Defender', description: 'Defender' },
];

async function main() {
  // Seed admin (Ajit) - keeping Ajit as ADMIN so they can manage the team
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'ajit';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin@123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  
  await prisma.user.upsert({
    where: { jerseyNumber: '18' },
    update: {
      name: 'Ajit',
      username: adminUsername,
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      position: 'Left Corner',
      description: 'Strong defensive player known for ankle holds, diving tackles, blocks and chain tackles. Aggressive and effective in pressure situations.'
    },
    create: {
      name: 'Ajit',
      username: adminUsername,
      passwordHash: adminHash,
      jerseyNumber: '18',
      systemId: '155098',
      role: 'ADMIN',
      status: 'ACTIVE',
      position: 'Left Corner',
      description: 'Strong defensive player known for ankle holds, diving tackles, blocks and chain tackles. Aggressive and effective in pressure situations.'
    },
  });

  // Ensure coach remains
  const coachUsername = process.env.SEED_COACH_USERNAME || 'coach';
  const coachPassword = process.env.SEED_COACH_PASSWORD || 'coach@123';
  const coachHash = await bcrypt.hash(coachPassword, 10);
  await prisma.user.upsert({
    where: { username: coachUsername },
    update: {},
    create: {
      name: 'Head Coach',
      username: coachUsername,
      passwordHash: coachHash,
      role: 'COACH',
      status: 'ACTIVE',
    },
  });

  // Seed Sports Officer
  const soUsername = 'sports.officer';
  const soPassword = 'sports@123';
  const soHash = await bcrypt.hash(soPassword, 10);
  await prisma.user.upsert({
    where: { username: soUsername },
    update: { passwordHash: soHash, status: 'ACTIVE', role: 'SPORTS_OFFICER' },
    create: {
      name: 'Sports Officer',
      username: soUsername,
      passwordHash: soHash,
      role: 'SPORTS_OFFICER',
      status: 'ACTIVE',
    },
  });

  // Seed 15 other players
  for (const p of players) {
    await prisma.user.upsert({
      where: { jerseyNumber: p.jerseyNumber },
      update: { 
        name: p.name, 
        systemId: p.systemId,
        status: 'ACTIVE',
        position: p.position,
        description: p.description
      },
      create: {
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        systemId: p.systemId,
        position: p.position,
        description: p.description,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });
  }

  // Ensure no one is Captain automatically
  await prisma.user.updateMany({
    where: { role: 'CAPTAIN' },
    data: { role: 'PLAYER' }
  });

  console.log('✅ Official Roster Seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
