const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const names = ['HubSpot','Datadog','OneTrust','Capchase','Taxbit'];
(async () => {
  const rows = await prisma.company.findMany({ where: { name: { in: names } }, select: { id: true, name: true, careersUrl: true, atsPlatform: true, atsSlug: true, status: true }, orderBy: { name: 'asc' } });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})();
