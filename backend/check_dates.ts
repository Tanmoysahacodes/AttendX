import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const sessions = await prisma.attendanceSession.findMany({ select: { id: true, date: true } });
  console.log(sessions);
  
  // If there's a session for Sep 28, shift it to Sep 29 to correct the timezone bug
  for (const s of sessions) {
    if (s.date.toISOString().startsWith('2026-09-28')) {
      await prisma.attendanceSession.update({
        where: { id: s.id },
        data: { date: new Date('2026-09-29T00:00:00Z') }
      });
      console.log('Fixed date for session:', s.id);
    }
  }
}
main().finally(() => prisma.$disconnect());
