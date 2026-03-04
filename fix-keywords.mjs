import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Remove generic infra keywords that catch too many pure DevOps jobs
const removeKeywords = [
  "terraform", "kubernetes", "docker", "cloud engineer",
  "infrastructure engineer", "platform engineer"
]

async function main() {
  const sources = await p.userJobSource.findMany({
    where: { userId: "default-user-id", enabled: true },
    select: { id: true, name: true, searchKeywords: true }
  })

  let updated = 0
  for (const s of sources) {
    if (!s.searchKeywords || s.searchKeywords.length === 0) continue

    const filtered = s.searchKeywords.filter(kw => !removeKeywords.includes(kw))
    if (filtered.length !== s.searchKeywords.length) {
      await p.userJobSource.update({
        where: { id: s.id },
        data: { searchKeywords: filtered }
      })
      const removed = s.searchKeywords.length - filtered.length
      console.log(`${s.name}: removed ${removed} generic keywords (${s.searchKeywords.length} -> ${filtered.length})`)
      updated++
    }
  }
  console.log(`\nUpdated ${updated} sources`)
}

main().then(() => p.$disconnect())
