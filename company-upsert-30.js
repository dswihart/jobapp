const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const companies = [
  [
    "Rover",
    "https://jobs.lever.co/rover",
    "lever",
    "rover"
  ],
  [
    "WatchGuard",
    "https://jobs.lever.co/watchguard",
    "lever",
    "watchguard"
  ],
  [
    "Quantum Metric",
    "https://jobs.lever.co/quantummetric",
    "lever",
    "quantummetric"
  ],
  [
    "Sierra",
    "https://jobs.ashbyhq.com/Sierra",
    "ashby",
    "Sierra"
  ],
  [
    "Speechify",
    "https://job-boards.greenhouse.io/speechify",
    "greenhouse",
    "speechify"
  ],
  [
    "Scopely",
    "https://job-boards.greenhouse.io/scopely",
    "greenhouse",
    "scopely"
  ],
  [
    "2K",
    "https://job-boards.greenhouse.io/2k",
    "greenhouse",
    "2k"
  ],
  [
    "Tiger Data",
    "https://jobs.ashbyhq.com/tigerdata",
    "ashby",
    "tigerdata"
  ],
  [
    "Hudl",
    "https://job-boards.greenhouse.io/hudl",
    "greenhouse",
    "hudl"
  ],
  [
    "LevelTen Energy",
    "https://job-boards.greenhouse.io/leveltenenergy",
    "greenhouse",
    "leveltenenergy"
  ],
  [
    "Boomi",
    "https://job-boards.greenhouse.io/boomilp",
    "greenhouse",
    "boomilp"
  ],
  [
    "Cross River",
    "https://job-boards.greenhouse.io/crossriverbank",
    "greenhouse",
    "crossriverbank"
  ],
  [
    "Datavant",
    "https://job-boards.greenhouse.io/datavant2",
    "greenhouse",
    "datavant2"
  ],
  [
    "Harness",
    "https://job-boards.greenhouse.io/harnessinc",
    "greenhouse",
    "harnessinc"
  ],
  [
    "Airbnb",
    "https://job-boards.greenhouse.io/airbnb",
    "greenhouse",
    "airbnb"
  ],
  [
    "InterSystems",
    "https://job-boards.greenhouse.io/intersystems",
    "greenhouse",
    "intersystems"
  ],
  [
    "Veeva",
    "https://jobs.lever.co/veeva",
    "lever",
    "veeva"
  ],
  [
    "Cloudflare",
    "https://job-boards.greenhouse.io/cloudflare",
    "greenhouse",
    "cloudflare"
  ],
  [
    "MongoDB",
    "https://job-boards.greenhouse.io/mongodb",
    "greenhouse",
    "mongodb"
  ],
  [
    "Elastic",
    "https://job-boards.greenhouse.io/elastic",
    "greenhouse",
    "elastic"
  ],
  [
    "Incode",
    "https://job-boards.greenhouse.io/incode",
    "greenhouse",
    "incode"
  ],
  [
    "Appodeal",
    "https://job-boards.greenhouse.io/appodeal",
    "greenhouse",
    "appodeal"
  ],
  [
    "BidMachine",
    "https://job-boards.greenhouse.io/bidmachine",
    "greenhouse",
    "bidmachine"
  ],
  [
    "Appspace",
    "https://job-boards.greenhouse.io/appspace",
    "greenhouse",
    "appspace"
  ],
  [
    "Beyond Pricing",
    "https://job-boards.greenhouse.io/beyond",
    "greenhouse",
    "beyond"
  ],
  [
    "Thermal Works",
    "https://job-boards.greenhouse.io/li-thermal-works",
    "greenhouse",
    "li-thermal-works"
  ],
  [
    "Fundraise Up",
    "https://job-boards.greenhouse.io/fundraiseup",
    "greenhouse",
    "fundraiseup"
  ],
  [
    "Stripe",
    "https://job-boards.greenhouse.io/stripe",
    "greenhouse",
    "stripe"
  ],
  [
    "Mattermost",
    "https://job-boards.greenhouse.io/mattermost",
    "greenhouse",
    "mattermost"
  ],
  [
    "Databricks",
    "https://job-boards.greenhouse.io/databricks",
    "greenhouse",
    "databricks"
  ]
];
const seedPath = path.join(process.cwd(), 'prisma', 'seeds', 'target-companies.json');

async function main() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let created = 0;
  let updated = 0;

  for (const [name, careersUrl, atsPlatform, atsSlug] of companies) {
    const payload = {
      name,
      careersUrl,
      atsPlatform,
      atsSlug,
      hqCountry: 'US',
      sizeBand: null,
      spainPresenceEvidence: 'careers_page',
      spainPresenceUrl: careersUrl,
      status: 'active',
      discoverySource: 'manual',
    };

    const existing = await prisma.company.findFirst({
      where: { OR: [{ name }, { careersUrl }] },
    });

    if (existing) {
      await prisma.company.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await prisma.company.create({ data: payload });
      created += 1;
    }

    const idx = seed.findIndex(item => item.name === name || item.careersUrl === careersUrl);
    if (idx >= 0) seed[idx] = payload;
    else seed.push(payload);
  }

  seed.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
  console.log(JSON.stringify({ created, updated, totalProcessed: companies.length, seedCount: seed.length }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
