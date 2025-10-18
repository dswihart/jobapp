import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const europeanJobSources = [
  {
    name: "Foorilla Tech Jobs Spain",
    description: "Technology and engineering jobs in Spain and Europe",
    sourceType: "rss",
    feedUrl: "https://foorilla.com/account/feed/0SqKXfDIRw65VD0/rss/",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 100,
    searchKeywords: [],
  },
  {
    name: "Barcelona Tech Jobs",
    description: "Technology jobs in Barcelona via RSS.app",
    sourceType: "rss",
    feedUrl: "https://rss.app/feeds/v1.1/C5zHjN9WFy1WI1sN.json",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 100,
    searchKeywords: [],
  },
  {
    name: "WeWorkRemotely All Jobs",
    description: "Remote jobs worldwide - all categories",
    sourceType: "rss",
    feedUrl: "https://weworkremotely.com/remote-jobs.rss",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 100,
    searchKeywords: [],
  },
  {
    name: "Remotive All Remote Jobs",
    description: "All remote tech positions across Europe",
    sourceType: "rss",
    feedUrl: "https://remotive.com/remote-jobs/rss-feed",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 100,
    searchKeywords: [],
  },
  {
    name: "The Muse Tech Jobs",
    description: "Tech jobs including European positions",
    sourceType: "web_scrape",
    scrapeUrl: "https://www.themuse.com/jobs",
    scrapeSelector: "[data-job-id]",
    titleSelector: ".job-title",
    companySelector: ".company-name",
    linkSelector: "a.job-link",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
  {
    name: "EuroTechJobs",
    description: "Technology jobs across European Union",
    sourceType: "web_scrape",
    scrapeUrl: "https://www.eurotechjobs.com/jobs",
    scrapeSelector: ".job-item",
    titleSelector: "h3.job-title",
    companySelector: ".company-name",
    locationSelector: ".location",
    linkSelector: "a.job-link",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
  {
    name: "Landing.jobs Portugal",
    description: "Tech jobs in Portugal and remote Europe",
    sourceType: "web_scrape",
    scrapeUrl: "https://landing.jobs/jobs",
    scrapeSelector: "[data-testid=job-card]",
    titleSelector: "h3",
    companySelector: ".company",
    linkSelector: "a",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
  {
    name: "TechMeAbroad Europe",
    description: "Tech jobs for international workers in Europe",
    sourceType: "web_scrape",
    scrapeUrl: "https://techmeabroad.com/jobs/europe",
    scrapeSelector: ".job-card",
    titleSelector: ".job-title",
    companySelector: ".company-name",
    locationSelector: ".location",
    linkSelector: "a.job-link",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
  {
    name: "Honeypot EU Tech Jobs",
    description: "European tech jobs for software engineers",
    sourceType: "web_scrape",
    scrapeUrl: "https://www.honeypot.io/pages/jobs",
    scrapeSelector: ".job-listing",
    titleSelector: ".job-title",
    companySelector: ".company",
    locationSelector: ".location",
    linkSelector: "a",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
  {
    name: "Stack Overflow Jobs Europe",
    description: "Developer jobs from Stack Overflow in Europe",
    sourceType: "web_scrape",
    scrapeUrl: "https://stackoverflow.com/jobs?l=Europe",
    scrapeSelector: ".js-job-link",
    titleSelector: ".job-title",
    companySelector: ".company-name",
    locationSelector: ".location",
    linkSelector: "a.job-link",
    enabled: true,
    isBuiltIn: true,
    rateLimitPerHour: 50,
    searchKeywords: [],
  },
]

async function main() {
  console.log("Seeding European tech job sources...")

  // Get all users
  const users = await prisma.user.findMany()
  
  if (users.length === 0) {
    console.log("No users found. Please create a user first.")
    return
  }

  console.log(`Found ${users.length} user(s)`)

  // Create job sources for each user
  for (const user of users) {
    console.log(`\nProcessing user: ${user.email}`)
    
    for (const source of europeanJobSources) {
      const existing = await prisma.userJobSource.findFirst({
        where: {
          userId: user.id,
          name: source.name,
        },
      })

      if (existing) {
        console.log(`  Source "${source.name}" already exists, skipping...`)
        continue
      }

      await prisma.userJobSource.create({
        data: {
          ...source,
          userId: user.id,
        },
      })

      console.log(`  ✓ Created: ${source.name}`)
    }
  }

  console.log("\nSeeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
