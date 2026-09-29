const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.attendanceSession.count();
    const recordCount = await prisma.attendanceRecord.count();
    console.log(`Users: ${userCount}, Sessions: ${sessionCount}, Records: ${recordCount}`);
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
