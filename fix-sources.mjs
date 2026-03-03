import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const securityKeywords = [
  "security", "cybersecurity", "infosec", "information security",
  "cloud security", "DLP", "data loss prevention", "SIEM",
  "SOC", "SRE", "site reliability", "DevSecOps",
  "IAM", "identity", "compliance", "GRC",
  "threat", "vulnerability", "incident response", "penetration",
  "CISO", "security architect", "security engineer",
  "endpoint", "EDR", "XDR", "forensic",
  "encryption", "PKI", "zero trust",
  "GDPR", "PCI", "HIPAA", "SOX",
  "terraform", "kubernetes", "docker", "cloud engineer",
  "infrastructure engineer", "platform engineer",
  "data protection", "privacy", "audit"
]

async function main() {
  const sources = await p.userJobSource.findMany({
    where: { userId: "default-user-id", enabled: true },
    select: { id: true, name: true, searchKeywords: true }
  })

  let updated = 0
  for (const s of sources) {
    if (!s.searchKeywords || s.searchKeywords.length === 0) {
      await p.userJobSource.update({
        where: { id: s.id },
        data: { searchKeywords: securityKeywords }
      })
      console.log("Updated:", s.name)
      updated++
    } else {
      console.log("Skipped (has keywords):", s.name)
    }
  }
  console.log(`\nUpdated ${updated} sources with security keywords`)
}

main().then(() => p.$disconnect())
