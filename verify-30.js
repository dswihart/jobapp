const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const names = ['Rover','WatchGuard','Quantum Metric','Sierra','Speechify','Scopely','2K','Tiger Data','Hudl','LevelTen Energy','Boomi','Cross River','Datavant','Harness','Airbnb','InterSystems','Veeva','Cloudflare','MongoDB','Elastic','Incode','Appodeal','BidMachine','Appspace','Beyond Pricing','Thermal Works','Fundraise Up','Stripe','Mattermost','Databricks'];
prisma.company.findMany({
  where: { name: { in: names } },
  select: { name: true, atsPlatform: true, atsSlug: true, status: true },
  orderBy: { name: 'asc' }
}).then(rows => {
  console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
  return prisma.$disconnect();
}).catch(err => {
  console.error(err);
  return prisma.$disconnect().finally(() => process.exit(1));
});
