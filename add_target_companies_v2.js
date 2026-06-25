const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const additions = [
  {
    name: 'HubSpot',
    careersUrl: 'https://www.hubspot.com/careers/jobs',
    atsPlatform: 'greenhouse',
    atsSlug: 'hubspotjobs',
    hqCountry: 'US',
    sizeBand: '5000-10000',
    spainPresenceEvidence: 'careers_page',
    spainPresenceUrl: 'https://www.hubspot.com/careers/jobs',
    status: 'active',
    discoverySource: 'manual',
  },
  {
    name: 'Datadog',
    careersUrl: 'https://careers.datadoghq.com',
    atsPlatform: 'greenhouse',
    atsSlug: 'datadog',
    hqCountry: 'US',
    sizeBand: '5000-10000',
    spainPresenceEvidence: 'careers_page',
    spainPresenceUrl: 'https://careers.datadoghq.com/madrid/',
    status: 'active',
    discoverySource: 'manual',
  },
  {
    name: 'OneTrust',
    careersUrl: 'https://www.onetrust.com/careers/',
    atsPlatform: 'greenhouse',
    atsSlug: 'onetrust',
    hqCountry: 'US',
    sizeBand: '1000-5000',
    spainPresenceEvidence: 'careers_page',
    spainPresenceUrl: 'https://www.onetrust.com/about-us/all-locations/',
    status: 'active',
    discoverySource: 'manual',
  },
  {
    name: 'Capchase',
    careersUrl: 'https://www.capchase.com/careers',
    atsPlatform: 'ashby',
    atsSlug: 'capchase',
    hqCountry: 'US',
    sizeBand: '200-500',
    spainPresenceEvidence: 'careers_page',
    spainPresenceUrl: 'https://www.capchase.com/about',
    status: 'active',
    discoverySource: 'manual',
  },
  {
    name: 'Taxbit',
    careersUrl: 'https://www.taxbit.com/company/careers',
    atsPlatform: 'greenhouse',
    atsSlug: 'taxbit',
    hqCountry: 'US',
    sizeBand: '200-500',
    spainPresenceEvidence: 'careers_page',
    spainPresenceUrl: 'https://www.taxbit.com/company/careers',
    status: 'active',
    discoverySource: 'manual',
  },
];

async function main() {
  const seedPath = path.join('/opt/job-tracker', 'prisma', 'seeds', 'target-companies.json');
  const existingSeed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  for (const company of additions) {
    const existing = await prisma.company.findFirst({
      where: { OR: [{ name: company.name }, { careersUrl: company.careersUrl }] },
      select: { id: true, name: true },
    });

    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: company,
      });
      console.log(`updated ${company.name}`);
    } else {
      await prisma.company.create({ data: company });
      console.log(`created ${company.name}`);
    }

    const idx = existingSeed.findIndex((c) => c.name === company.name || c.careersUrl === company.careersUrl);
    if (idx >= 0) existingSeed[idx] = { ...existingSeed[idx], ...company };
    else existingSeed.push(company);
  }

  fs.writeFileSync(seedPath, JSON.stringify(existingSeed, null, 2) + '\n');
  const rows = await prisma.company.findMany({
    where: { name: { in: additions.map((a) => a.name) } },
    select: { name: true, careersUrl: true, atsPlatform: true, atsSlug: true, status: true },
    orderBy: { name: 'asc' },
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
