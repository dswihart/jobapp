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
    careersUrl: 'https://careers.datadoghq.com/madrid/',
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
  let seedChanged = false;

  for (const company of additions) {
    const idx = existingSeed.findIndex((c) => c.careersUrl === company.careersUrl || c.name === company.name);
    if (idx >= 0) {
      existingSeed[idx] = { ...existingSeed[idx], ...company };
    } else {
      existingSeed.push(company);
      seedChanged = true;
    }

    await prisma.company.upsert({
      where: { careersUrl: company.careersUrl },
      update: {
        name: company.name,
        atsPlatform: company.atsPlatform,
        atsSlug: company.atsSlug,
        hqCountry: company.hqCountry,
        sizeBand: company.sizeBand,
        spainPresenceEvidence: company.spainPresenceEvidence,
        spainPresenceUrl: company.spainPresenceUrl,
        status: company.status,
        discoverySource: company.discoverySource,
      },
      create: company,
    });
    console.log(`upserted ${company.name}`);
  }

  fs.writeFileSync(seedPath, JSON.stringify(existingSeed, null, 2) + '\n');
  console.log(`seed file updated: ${seedPath}`);

  const rows = await prisma.company.findMany({
    where: { name: { in: additions.map((a) => a.name) } },
    select: { name: true, atsPlatform: true, atsSlug: true, status: true },
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
