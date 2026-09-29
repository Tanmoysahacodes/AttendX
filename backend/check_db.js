const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const player = await prisma.user.findFirst({ where: { jerseyNumber: '18' } });
  console.log('Player 18:', player);
}
main().catch(console.error).finally(() => prisma.$disconnect());
